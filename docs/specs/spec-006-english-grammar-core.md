# Milestone 006: Hollywood Roast Grammar Core

**Status:** Approved  
**Depends on:** 005  
**Owns:** English phrase roles, grammar transitions, agreement, and rendering
**Production-file budget:** 7

## Rule authority

The final match rules follow _Oh...Sir! The Hollywood Roast_. The implementation
uses original Grand Transition phrases, characters, scenes, and media. It does
not copy reference-game prose, source, art, audio, or branding.

The reference role mapping is:

| Grand Transition role | Hollywood atom behavior                                          |
| --------------------- | ---------------------------------------------------------------- |
| `noun`                | Object that can be a grammatical subject or object               |
| `predicate`           | Verb phrase that completes a clause after its subject            |
| `verb`                | Relation that requires a following noun object                   |
| `conjunction`         | Approved additive, contrast, reason, and result connectors       |
| `ending`              | Finisher that can follow a complete clause and ends the sentence |
| `continuation`        | Draft action; not a grammar phrase                               |

## Core forms

The two minimum complete clauses are:

- `NOUN + PREDICATE`;
- `NOUN + VERB + NOUN`.

A sentence starts with a noun or front `because`. A continuation is always a
selectable draft action and does not enter the grammar adapter.

`NOUN + AND + NOUN` is one compound subject. It remains incomplete and accepts
another `and`, a predicate, or a verb followed by an object. Compound subjects
use plural verb and predicate forms. A single noun uses its declared number.

After `NOUN + VERB + NOUN`, `and` can add another noun object. The sentence
remains complete after the added object. That noun can also become the subject
of a later predicate or verb.

## Connectors

After a complete clause, `and` accepts a new noun subject, a shared-subject
predicate, or a shared-subject verb followed by a noun. `but` and `yet` accept
the same complete-clause branches. `and` also joins nouns before the first
predicate or verb. `but` and `yet` do not join an incomplete opening subject.

`so` and `for` can follow only a complete clause. Each requires a new noun
subject and a complete following clause. They do not accept a shared-subject
branch and cannot start a sentence. `so` presents a result. `for` presents a
rationale.

Front `because` requires a noun, then accepts a complete subordinate clause
followed by a main noun clause. Explanatory `because` can follow a complete
clause and also requires a new noun clause. Another connector cannot replace
the noun immediately required by `because` or by an incomplete compound
subject. After a subordinate clause is complete, `and`, `but`, `yet`, or
`because` can extend it before the required main noun clause. A completed clause
followed by `and`, `but`, or `yet` can also accept `because`. `so` and `for` do
not enter this front-`because` bridge. A finisher cannot end the front
subordinate clause. The sentence is incomplete while either required clause is
unfinished.

The conjunction corpus follows the coordinating and subordinating categories
on the [conjunction grammar reference](<https://en.wikipedia.org/wiki/Conjunction_(grammar)>).
The game excludes connectors that need negation, inversion, paired cards,
time-clause forms, or clause shapes that the grammar does not model.

An ending is legal only after a complete clause. It ends the sentence
immediately. A later phrase is a grammar mistake.

## Rendering

English rendering uses sentence case, phrase-defined singular and plural forms,
and exactly one terminal full stop for a normally ended complete sentence.
Ending text already includes its terminal full stop, so rendering does not add a
second one. It does not change a selected noun phrase into another number form.
A phrase without number forms uses its default text.

## Acceptance criteria

- **AC-006-01:** Tests prove both minimum forms and every incomplete prefix.
- **AC-006-02:** Tests prove `NOUN + AND + NOUN` before both completion forms
  and plural agreement for the compound subject. Tests also prove a compound
  object after `NOUN + VERB + NOUN + AND`.
- **AC-006-03:** Tests prove new-subject and shared-subject `and`, `but`, and
  `yet` branches, front and explanatory `because` branches, and clause-only
  `so` and `for` branches with their required noun transitions.
- **AC-006-04:** Tests prove finisher placement, sentence-case rendering,
  agreement, and rejection after an ending.
- **AC-006-05:** Wrong locale, missing message, and wrong role return stable
  typed evidence without changing game state.

## Objective verifiers

`tests/unit/english-grammar-core.test.ts` and
`tests/unit/extended-grammar.test.ts` verify AC-006-01 through AC-006-05.
