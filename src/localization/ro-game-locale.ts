import type { GameLocaleBundle } from './game-locale-schema.ts';

export function mergeRomanianMessageFiles(
  sources: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [file, entries] of Object.entries(sources).toSorted(([left], [right]) =>
    left.localeCompare(right),
  )) {
    for (const [key, text] of Object.entries(entries)) {
      if (Object.hasOwn(messages, key)) {
        throw new Error(`Duplicate Romanian game message "${key}" in "${file}".`);
      }
      messages[key] = text;
    }
  }
  return messages;
}

// Builds the Romanian game-locale bundle from the authored content tree. The
// tree is a flat locale-key map, so the title fields are lifted out and the
// remaining keys become the message record.
export function createRomanianGameLocale(
  authoredMessages: Readonly<Record<string, string>>,
): GameLocaleBundle {
  const {
    'title.name': name,
    'title.fictionalCompositeSatireDisclaimer': fictionalCompositeSatireDisclaimer,
    ...messages
  } = authoredMessages;

  if (!name || !fictionalCompositeSatireDisclaimer) {
    throw new Error(
      'Add title.name and title.fictionalCompositeSatireDisclaimer to src/content/ro/title.json.',
    );
  }

  return {
    locale: 'ro-RO',
    title: { name, fictionalCompositeSatireDisclaimer },
    messages,
  };
}
