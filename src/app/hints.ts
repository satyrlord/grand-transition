import { msg } from '@lit/localize';

/**
 * The hints of the loading surfaces: the voice loader of the title and the
 * voice preparation of a delivery. Each serious hint states a rule that the
 * engine applies. A silly hint states no rule. The text is interface text, so
 * each hint reads its message when a view renders it.
 */
export type HintKind = 'serious' | 'silly';

export type Hint = Readonly<{
  id: string;
  kind: HintKind;
  text: () => string;
}>;

/** The part of the hints that comes from the silly list: about one hint in five. */
export const sillyHintShare = 0.2;

export const seriousHints: readonly Hint[] = [
  hint('shared-phrases', 'serious', () =>
    msg('Each round deals nine shared phrases, and the players take them in turns.'),
  ),
  hint('private-phrases', 'serious', () =>
    msg('Your two private phrases are yours alone: your opponent cannot take them.'),
  ),
  hint('reshuffle', 'serious', () =>
    msg('Reshuffle replaces your private phrases once in each round.'),
  ),
  hint('automatic-refresh', 'serious', () =>
    msg('When you have used both private phrases, you get two new ones if Reshuffle is unused.'),
  ),
  hint('complete-sentence', 'serious', () =>
    msg('A sentence needs a subject and a verb or a predicate before it can score.'),
  ),
  hint('grammar-mistake', 'serious', () =>
    msg('A phrase that does not fit the grammar is used up and costs you 3 Pride.'),
  ),
  hint('unfinished-sentence', 'serious', () =>
    msg('End an unfinished sentence and it scores nothing and clears your combos.'),
  ),
  hint('ending-phrase', 'serious', () =>
    msg('An ending phrase closes your sentence at once and adds a bonus.'),
  ),
  hint('continuation', 'serious', () =>
    msg('The [...] phrase carries your sentence into the next round and scores nothing now.'),
  ),
  hint('continuation-break', 'serious', () =>
    msg('A hit of 16 or more breaks a sentence that you carry with [...].'),
  ),
  hint('noun-combo', 'serious', () =>
    msg('Reuse a noun from your last insult to multiply its clause by 2, then by 3.'),
  ),
  hint('combo-line', 'serious', () =>
    msg("The Combo line under a character's name lists the nouns that are worth repeating."),
  ),
  hint('weakness', 'serious', () =>
    msg("A phrase that touches your opponent's weakness doubles its clause."),
  ),
  hint('denial', 'serious', () =>
    msg('Every shared phrase that you take is one that your opponent cannot use.'),
  ),
  hint('comeback-charge', 'serious', () =>
    msg('Pride that your opponent takes charges your Comeback: 20, 40, 60 give +4, +10, +18.'),
  ),
  hint('comeback-ends', 'serious', () =>
    msg('A Comeback needs a complete sentence, and it ends that sentence at once.'),
  ),
  hint('timeout', 'serious', () =>
    msg(
      'After your opponent ends, turns that you let expire in a row cost 3, 12, 24, then 48 Pride.',
    ),
  ),
  hint('cliffhanger', 'serious', () =>
    msg('A double knockout starts a Cliffhanger, where one grammar mistake loses the match.'),
  ),
  hint('turn-timer', 'serious', () =>
    msg('Set the turn timer to 15 seconds, 30 seconds, or Unlimited in Settings.'),
  ),
  hint('tutorial', 'serious', () =>
    msg('Tutorial in Settings makes every phrase that fits the grammar glow green.'),
  ),
];

export const sillyHints: readonly Hint[] = [
  hint('voters', 'silly', () => msg('No voters were consulted while these voices were loading.')),
  hint('previous-government', 'silly', () =>
    msg('If the voices are slow, blame the previous government.'),
  ),
  hint('transition', 'silly', () =>
    msg('The transition is almost complete, as it has been for decades.'),
  ),
  hint('committee', 'silly', () =>
    msg('This hint was approved by a committee and no longer means anything.'),
  ),
  hint('moderators', 'silly', () =>
    msg('Moderators are strictly neutral, in favor of whoever speaks last.'),
  ),
  hint('timer-comment', 'silly', () =>
    msg('Every loser blames the timer, and the timer declines to comment.'),
  ),
];

export type HintLists = Readonly<{
  serious: readonly Hint[];
  silly: readonly Hint[];
}>;

export type HintRotation = Readonly<{
  /** The next hint. It is never the hint that this rotation gave last. */
  next: () => Hint;
}>;

/**
 * Selects hints for one surface. `random` gives values from 0 up to, but not
 * including, 1. Each selection uses two values: one for the list and one for
 * the hint in that list.
 */
export function createHintRotation(
  random: () => number,
  lists: HintLists = { serious: seriousHints, silly: sillyHints },
): HintRotation {
  let previousId: string | null = null;
  const without = (pool: readonly Hint[]) => pool.filter(({ id }) => id !== previousId);
  return {
    next: () => {
      const silly = random() < sillyHintShare;
      const preferred = without(silly ? lists.silly : lists.serious);
      const fallback = without(silly ? lists.serious : lists.silly);
      const candidates = preferred.length > 0 ? preferred : fallback;
      const pool = candidates.length > 0 ? candidates : [...lists.serious, ...lists.silly];
      if (pool.length === 0) throw new Error('The hint lists are empty.');
      const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
      const selected = pool[index]!;
      previousId = selected.id;
      return selected;
    },
  };
}

function hint(id: string, kind: HintKind, text: () => string): Hint {
  return Object.freeze({ id, kind, text });
}
