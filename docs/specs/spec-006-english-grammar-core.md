# Milestone 006: Hollywood Roast Grammar Core

**Status:** Approved  
**Depends on:** 005  
**Owns:** English phrase roles, grammar transitions, agreement, and rendering
**Production-file budget:** 7

## Rule authority

The last match rules use the rules of _Oh...Sir! The Hollywood Roast_.
The implementation uses Grand Transition phrases, fictional characters, scenes, and media that is new or has a license.
It does not copy the text, source code, art, audio, or branding of the reference game.

The reference role mapping is:

| Grand Transition role | Hollywood atom behavior                                              |
| --------------------- | -------------------------------------------------------------------- |
| `noun`                | Object that can be a grammatical subject or object                   |
| `predicate`           | Verb phrase that completes a clause after its subject                |
| `verb`                | Relation that must have a noun object after it                       |
| `modifier`            | Adverbial or descriptive phrase after a complete clause              |
| `conjunction`         | Approved additive, contrast, reason, and result connectors           |
| `ending`              | Finisher that can come after a complete clause and ends the sentence |
| `continuation`        | Draft action, not a grammar phrase                                   |

## Core forms

The two minimum complete clauses are:

- `NOUN + PREDICATE`.
- `NOUN + VERB + NOUN`.

A sentence starts with a noun or with a front `because`.
A continuation is always a selectable draft action, and it does not go into the grammar adapter.

`NOUN + AND + NOUN` is one compound subject.
It stays incomplete, and it accepts one more `and`, a predicate, or a verb with an object after it.
Compound subjects use plural verb forms and plural predicate forms.
A compound subject that contains a second-person noun keeps second-person agreement.
A single noun uses its declared number, person, and referent kind.

After `NOUN + VERB + NOUN`, `and` can add one more noun object.
The sentence stays complete after the added object.
That noun can also become the subject of a subsequent predicate or verb.

## Connectors

After a complete clause, `and` accepts a new noun subject, a shared-subject predicate, or a shared-subject verb with a noun after it.
`but` and `yet` accept the same complete-clause branches.
`and` also connects nouns before the first predicate or verb.
`but` and `yet` do not connect an incomplete opening subject.

A combined copular predicate can declare `allowsCoordinatedNounComplement`.
After such a predicate, `and + NOUN` is also a complete coordinated complement that shares the copula of the predicate.
Thus, `your brother + is a snitch + and + a pig` renders and completes as `Your brother is a snitch and a pig.`
When a predicate or a verb comes after it, the same noun prefix can start the new-subject branch.
Predicates without this declaration continue to use `and + NOUN` only as a new subject.
They stay incomplete until the relation of that subject comes after it.

`so` can come only after a complete clause.
It must have a new noun subject and a complete clause after it.
It does not accept a shared-subject branch, and it cannot start a sentence.
`so` shows a result.

`with` can come after a complete clause, and it must have one noun complement.
The complement stays in the previous clause, and it keeps the sentence complete.
It does not start a new clause, and it does not accept a verb or a predicate in its complement position.
It can come after a subordinate clause with a front `because`, but that clause must continue to have its main noun clause.

A front `because` must have a noun.
Then it accepts a complete subordinate clause and, after it, a main noun clause.
An explanatory `because` can come after a complete clause, and it also must have a new noun clause.
A different connector cannot replace the noun that must come immediately after `because`.
It also cannot replace the noun that must come immediately after an incomplete compound subject.
After a subordinate clause is complete, `and`, `but`, `yet`, or `because` can extend it before the necessary main noun clause.
A completed clause with `and`, `but`, or `yet` after it can also accept `because`.
`so` does not go into this front-`because` bridge.

A finisher cannot end the front subordinate clause.
The sentence is incomplete while one of the necessary clauses is not complete.

The conjunction corpus uses the coordinating categories and the subordinating categories on the
[conjunction grammar reference](<https://en.wikipedia.org/wiki/Conjunction_(grammar)>).
The game does not include connectors that must have negation, inversion, paired cards, time-clause forms, or clause shapes that the grammar does not model.

An ending is correct only after a complete clause.
It ends the sentence immediately.
A subsequent phrase is a grammar mistake.

A modifier is correct only after a complete clause.
It keeps that clause complete, and it does not end the sentence.
One or more modifiers can come before a conjunction, an ending, or a manual sentence end.
A modifier can also come after a complete subordinate clause with a front `because`.
But it does not remove the necessary main noun clause.

## Rendering

English rendering uses sentence case and the agreement forms that the phrase gives.
A singular subject in the third person that is not personal uses the singular form.
A singular personal subject in the third person uses the personal-singular form when the phrase has that form.
A plural subject uses the plural form.
A second-person subject uses the second-person form when the phrase has that form.
If the phrase does not have that form, the subject uses the plural form, because English second-person verbs use that conjugation.

A combined copular predicate gives a second-person form when this plural fallback can make a singular complement plural.
Thus, the `common-noun-028` card (`you`) renders `were a Communist Party member`, not `were Communist Party members`.

Shared-subject branches keep the person and the referent kind of the subject.
New-subject branches replace them.

Rendering adds one terminal full stop, and no more, for a complete sentence with a usual end.
The ending text includes its terminal full stop, so rendering does not add a second full stop.
Rendering does not change a selected noun phrase into a different number form.
A phrase without agreement forms uses its default text.

## Acceptance criteria

- **AC-006-01:** Tests show the two minimum forms and each incomplete prefix.
- **AC-006-02:** Tests show `NOUN + AND + NOUN` before the two complete forms, and plural agreement for the compound subject.
  Tests also show a compound object after `NOUN + VERB + NOUN + AND`.
- **AC-006-03:** Tests show new-subject branches and shared-subject branches for `and`, `but`, and `yet`.
  They show the front `because` branch and the explanatory `because` branch.
  They show the `so` branch, which comes only after a clause, with the necessary noun transitions.
  They also show the `with` noun-complement branch.
- **AC-006-04:** Tests show finisher placement and sentence-case rendering.
  They also show singular, plural, personal-singular, and second-person agreement.
  They show singular complements for second-person subjects, compound-subject agreement, and shared-subject agreement.
  They show that the grammar does not accept a phrase after an ending.
- **AC-006-05:** An incorrect locale, a missing message, and an incorrect role give stable typed evidence, and they do not change the game state.
- **AC-006-06:** Tests show one modifier and two or more modifiers after complete predicate clauses and object clauses.
  They show that the grammar does not accept a modifier before the clause is complete.
  They keep the necessary main clause after a front `because`.
- **AC-006-07:** Tests show the coordinated copular-complement sentence above without a change.
  They keep its ambiguous new-subject continuation.
  They show that a predicate that is not related, with `and + NOUN` after it, stays incomplete.

## Objective verifiers

`tests/unit/english-grammar-core.test.ts` and
`tests/unit/extended-grammar.test.ts` do checks of AC-006-01 through AC-006-06.
`tests/browser/seamless-match-flow.browser.test.ts` shows that the rendered second-person result and the coordinated copular complement get to the visible sentence bubble.
`e2e/coordinated-copular-complement.spec.ts` does checks of AC-006-07 through the production controls and the production sentence bubble.

## Review repair regression

**AC-006-08:** While a `with` complement is pending, only its noun can advance the construction.
Do not accept `with + because`, and do this check before the usual connector branches.
Keep the correct `and`, `but`, and `yet` bridges to `because`.
`tests/unit/english-grammar-core.test.ts` does checks of the rejection, the kept prefix, and the incorrect six-card construction, which continues to have no score.
