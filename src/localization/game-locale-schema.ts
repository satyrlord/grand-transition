import { z } from 'zod';
import { localeKeySchema } from '../content/schemas';

const unsafeHtmlPattern = /<!--|<\/?[a-z][^>]*>|javascript:|on[a-z]+\s*=/iu;

export const gameTextSchema = z
  .string()
  .trim()
  .min(1, 'Add visible game text.')
  .refine((text) => !unsafeHtmlPattern.test(text), {
    message:
      'Remove HTML, script URLs, and inline event handlers. Use plain text.',
  });

export const bcp47LocaleSchema = z
  .string()
  .regex(
    /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/u,
    'Use a canonical BCP 47 language tag, for example "en" or "ro-RO".',
  );

export const gameLocaleBundleSchema = z
  .object({
    locale: bcp47LocaleSchema,
    title: z
      .object({
        name: gameTextSchema,
        fictionalCompositeSatireDisclaimer: gameTextSchema.refine(
          (text) =>
            /fictional/iu.test(text) &&
            /composite/iu.test(text) &&
            /satir/iu.test(text),
          {
            message:
              'State that the title uses fictional composites created for satire.',
          },
        ),
      })
      .strict(),
    messages: z.record(localeKeySchema, gameTextSchema),
  })
  .strict();

export type GameLocaleBundle = z.infer<typeof gameLocaleBundleSchema>;
