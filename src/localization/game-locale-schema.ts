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
        fictionalCompositeSatireDisclaimer: gameTextSchema,
      })
      .strict(),
    messages: z.record(localeKeySchema, gameTextSchema),
  })
  .strict()
  .superRefine((bundle, context) => {
    // The English disclaimer is pinned by wording. Every other locale states the
    // same meaning in its own language, so its wording is checked by reviewed
    // content and focused assertions instead of by English keywords.
    if (!/^en(?:-|$)/u.test(bundle.locale)) return;
    const text = bundle.title.fictionalCompositeSatireDisclaimer;
    if (
      /fictional/iu.test(text) &&
      /composite/iu.test(text) &&
      /satir/iu.test(text)
    ) {
      return;
    }
    context.addIssue({
      code: 'custom',
      path: ['title', 'fictionalCompositeSatireDisclaimer'],
      message:
        'State that the title uses fictional composites created for satire.',
    });
  });

export type GameLocaleBundle = z.infer<typeof gameLocaleBundleSchema>;
