// The layout region contract of Milestone 033. A screen marks a part that has
// its own space with `data-layout-region="<name>"`. A region is a child of its
// closest ancestor region. `data-layout-overlay` declares an intentional
// overlay, for example the sentence bubble over the scene.

export type LayoutViolationKind =
  | 'sibling-overlap'
  | 'overlay-overlap'
  | 'outside-parent'
  | 'unnamed-overlay'
  | 'horizontal-scroll'
  | 'small-text';

export type LayoutViolation = Readonly<{
  kind: LayoutViolationKind;
  region: string;
  detail: string;
}>;

export type RegionSpace = Readonly<{ region: string; freeSpace: number }>;

export type LayoutInspection = Readonly<{
  regions: number;
  violations: readonly LayoutViolation[];
  /** The smallest free space around each region, smallest first, in CSS pixels. */
  freeSpace: readonly RegionSpace[];
}>;

export type LayoutOptions = Readonly<{
  /** The names of the regions that this test accepts as intentional overlays. */
  overlays: readonly string[];
  /** The least computed font size, in CSS pixels. The default is the 11 px floor of Milestone 023. */
  minimumFontSize?: number;
  /** The largest accepted intersection, in CSS pixels. */
  tolerance?: number;
}>;

type Region = {
  element: HTMLElement;
  name: string;
  path: string;
  overlay: boolean;
  parent: Region | null;
  rect: DOMRect;
};

const regionSelector = '[data-layout-region]';

export function inspectLayoutRegions(root: ParentNode, options: LayoutOptions): LayoutInspection {
  const tolerance = options.tolerance ?? 0.5;
  const minimumFontSize = options.minimumFontSize ?? 11;
  const regions = collectRegions(root);
  const violations: LayoutViolation[] = [];

  for (const region of regions) {
    if (region.overlay && !options.overlays.includes(region.name)) {
      violations.push({
        kind: 'unnamed-overlay',
        region: region.path,
        detail: `${region.name} declares an overlay that the test does not name`,
      });
    }
  }

  for (const [parent, siblings] of groupByParent(regions)) {
    for (const [index, first] of siblings.entries()) {
      for (const second of siblings.slice(index + 1)) {
        const overlap = intersection(first.rect, second.rect);
        if (overlap.width <= tolerance || overlap.height <= tolerance) continue;
        if (first.overlay && second.overlay) continue;
        violations.push({
          kind: first.overlay || second.overlay ? 'overlay-overlap' : 'sibling-overlap',
          region: `${first.path} and ${second.path}`,
          detail: `intersect by ${format(overlap.width)} by ${format(overlap.height)} px inside ${parent?.path ?? 'the viewport'}`,
        });
      }
    }
  }

  // The page is the scroll container of the top-level regions. A region below the
  // fold is reachable when the page scrolls, and a region above the top never is.
  const viewport = new DOMRect(
    0,
    0,
    document.documentElement.clientWidth,
    pageScrollsVertically()
      ? Math.max(window.innerHeight, document.documentElement.scrollHeight)
      : window.innerHeight,
  );
  for (const region of regions) {
    const container = region.parent?.rect ?? viewport;
    const outside = overflow(region.rect, container, tolerance);
    if (outside === null) continue;
    if (insideReachableScroller(region)) continue;
    violations.push({
      kind: 'outside-parent',
      region: region.path,
      detail: `${outside} outside ${region.parent?.path ?? 'the viewport'}`,
    });
  }

  const documentElement = document.documentElement;
  if (documentElement.scrollWidth > documentElement.clientWidth + tolerance) {
    violations.push({
      kind: 'horizontal-scroll',
      region: 'document',
      detail: `scroll width ${documentElement.scrollWidth} exceeds client width ${documentElement.clientWidth}`,
    });
  }

  for (const region of regions) {
    for (const text of smallText(region, minimumFontSize)) {
      violations.push({ kind: 'small-text', region: region.path, detail: text });
    }
  }

  return {
    regions: regions.length,
    violations,
    freeSpace: regions
      .map((region) => ({ region: region.path, freeSpace: freeSpaceOf(region, regions, viewport) }))
      .toSorted((left, right) => left.freeSpace - right.freeSpace),
  };
}

function pageScrollsVertically(): boolean {
  const documentElement = document.documentElement;
  if (documentElement.scrollHeight <= documentElement.clientHeight) return false;
  // The viewport takes the overflow of the root element, or of the body when the root has none.
  const root = getComputedStyle(documentElement).overflowY;
  const overflow = root === 'visible' ? getComputedStyle(document.body).overflowY : root;
  return overflow !== 'hidden' && overflow !== 'clip';
}

function collectRegions(root: ParentNode): Region[] {
  const elements = [
    ...(root instanceof HTMLElement && root.matches(regionSelector) ? [root] : []),
    ...root.querySelectorAll<HTMLElement>(regionSelector),
  ];
  const byElement = new Map<HTMLElement, Region>();
  const siblingCounts = new Map<string, number>();
  const regions: Region[] = [];
  for (const element of elements) {
    const client = element.getBoundingClientRect();
    // Page coordinates keep the result the same wherever the page is scrolled.
    const rect = new DOMRect(
      client.left + window.scrollX,
      client.top + window.scrollY,
      client.width,
      client.height,
    );
    // A region that takes no space is not shown, for example an absent notice.
    if (element.getClientRects().length === 0 || (client.width === 0 && client.height === 0))
      continue;
    const ancestor = element.parentElement?.closest<HTMLElement>(regionSelector) ?? null;
    const parent = ancestor ? (byElement.get(ancestor) ?? null) : null;
    const name = element.dataset.layoutRegion!;
    const key = `${parent?.path ?? ''}/${name}`;
    const count = siblingCounts.get(key) ?? 0;
    siblingCounts.set(key, count + 1);
    const region: Region = {
      element,
      name,
      path: count === 0 ? key.replace(/^\//u, '') : `${key.replace(/^\//u, '')}#${count + 1}`,
      overlay: element.hasAttribute('data-layout-overlay'),
      parent,
      rect,
    };
    byElement.set(element, region);
    regions.push(region);
  }
  return regions;
}

function groupByParent(regions: readonly Region[]): Map<Region | null, Region[]> {
  const groups = new Map<Region | null, Region[]>();
  for (const region of regions) {
    groups.set(region.parent, [...(groups.get(region.parent) ?? []), region]);
  }
  return groups;
}

function intersection(first: DOMRect, second: DOMRect): { width: number; height: number } {
  return {
    width: Math.min(first.right, second.right) - Math.max(first.left, second.left),
    height: Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  };
}

/** Describes how far `inner` leaves `outer`, or null when it is inside. */
function overflow(inner: DOMRect, outer: DOMRect, tolerance: number): string | null {
  const sides = [
    ['left', outer.left - inner.left],
    ['right', inner.right - outer.right],
    ['top', outer.top - inner.top],
    ['bottom', inner.bottom - outer.bottom],
  ] as const;
  const exceeded = sides.filter(([, distance]) => distance > tolerance);
  return exceeded.length === 0
    ? null
    : exceeded.map(([side, distance]) => `${format(distance)} px past the ${side} edge`).join(', ');
}

/** A scroll container has a tab stop, or holds a control whose focus lets the keys scroll it. */
function keyboardReaches(scroller: HTMLElement): boolean {
  const control = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return scroller.tabIndex >= 0 || scroller.querySelector(control) !== null;
}

/**
 * A region may lie outside its parent when the user can scroll to it. The
 * scroll container is inside the parent, and the keyboard reaches it.
 */
function insideReachableScroller(region: Region): boolean {
  const boundary = region.parent?.element ?? document.body;
  for (
    let element = region.element.parentElement;
    element && element !== boundary.parentElement;
    element = element.parentElement
  ) {
    const style = getComputedStyle(element);
    const scrolls = [style.overflowX, style.overflowY].some((value) => /auto|scroll/u.test(value));
    const overflows =
      element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
    if (scrolls && overflows && keyboardReaches(element)) return true;
  }
  return false;
}

function smallText(region: Region, minimumFontSize: number): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(region.element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? '';
    const element = node.parentElement;
    if (!text || !element) continue;
    // Text of a nested region belongs to that region.
    if (element.closest(regionSelector) !== region.element) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const shown = [...range.getClientRects()].some((rect) => rect.width > 1 && rect.height > 1);
    const style = getComputedStyle(element);
    if (!shown || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    if (clippedToAPoint(element, region.element)) continue;
    const size = Number.parseFloat(style.fontSize);
    if (size < minimumFontSize - 0.01) {
      found.push(`"${text.slice(0, 40)}" is ${format(size)} px in <${element.localName}>`);
    }
  }
  return found;
}

/** True for text in a box of one pixel or less that clips its content, as `.visually-hidden` does. */
function clippedToAPoint(element: HTMLElement, boundary: HTMLElement): boolean {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const rect = current.getBoundingClientRect();
    const clips = getComputedStyle(current).overflow !== 'visible';
    if (clips && (rect.width <= 1 || rect.height <= 1)) return true;
    if (current === boundary) return false;
  }
  return false;
}

function freeSpaceOf(region: Region, regions: readonly Region[], viewport: DOMRect): number {
  const container = region.parent?.rect ?? viewport;
  const rect = region.rect;
  const distances = [
    rect.left - container.left,
    container.right - rect.right,
    rect.top - container.top,
    container.bottom - rect.bottom,
  ];
  for (const other of regions) {
    if (other === region || other.parent !== region.parent) continue;
    const horizontal = Math.max(0, other.rect.left - rect.right, rect.left - other.rect.right);
    const vertical = Math.max(0, other.rect.top - rect.bottom, rect.top - other.rect.bottom);
    distances.push(Math.hypot(horizontal, vertical));
  }
  return Math.min(...distances);
}

const format = (value: number) => value.toFixed(1);

export function formatViolations(violations: readonly LayoutViolation[]): string {
  return violations.map(({ kind, region, detail }) => `${kind}: ${region}: ${detail}`).join('\n');
}
