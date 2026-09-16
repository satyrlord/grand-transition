import { interfaceLocale } from './interface-localization';

// Interface numbers are rendered with the active interface locale. Numbers
// inside game prose and stored numbers stay locale-neutral.
export function formatInterfaceNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return formatter(options).format(value);
}

export function formatInterfacePercent(value: number): string {
  return formatInterfaceNumber(value, {
    style: 'percent',
    maximumFractionDigits: 0,
  });
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = interfaceLocale();
  const key = `${locale} ${options ? JSON.stringify(options) : ''}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(locale, options);
    formatters.set(key, cached);
  }
  return cached;
}
