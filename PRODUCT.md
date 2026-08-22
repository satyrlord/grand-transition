# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The approved stack is Node.js 24 Long-Term Support (LTS), npm 12, strict
TypeScript 7, Vite 8, and Lit 3. It uses native ECMAScript (ES) modules. The
production result is a static browser build.

## Users

Inferred from the approved specifications: the primary users are people who
want a local tactical word game. They play alone against artificial
intelligence (AI) or with another
person in a hotseat session.

## Product Purpose

Grand Transition is an original competitive sentence-dueling game. Players
draft phrases under grammar constraints, target fictional archetype weaknesses,
build combinations and continuations, and reduce Pride through explained
damage.

## Positioning

Inferred from the approved specifications: the product joins deterministic
tactical drafting with grammatical sentence construction and fictional
political-theatre satire. The sentence is both the player's move and the source
of its score.

## Operating Context

The game runs in a browser without accounts, servers, or runtime network calls.
The minimum viable product (MVP) supports local single-player and hotseat play.
Private hotseat content must remain private during handovers.

## Capabilities and Constraints

- The game is English-first and localization-ready.
- A pure deterministic reducer owns game truth. Lit is view-only.
- Content is data-driven. Interface prose and grammar phrases have separate
  owners.
- Online multiplayer, accounts, cloud saves, chat, and live-service systems are
  out of scope.
- The implemented scope includes Milestones 001 through 007: the static title,
  toolchain, quality gate, immutable architecture contracts, replaceable ports,
  pure-module boundary enforcement, the secured static production shell, Zod 4
  content schemas, an English game-locale bundle, original sample content, and
  minimum and two-clause English grammar, shared-subject forms, endings,
  incomplete states, and strategic grammar faults. It does not include board
  generation, drafting, scoring, or playable game behavior.

## Brand Commitments

The approved name is "Grand Transition: A Verbal Republic." The subject is
fictional political and social satire. It must not copy real brands, protected
works, or unsupported claims about real people.

## Evidence on Hand

The approved specifications under `docs/specs/` are the only product and
implementation authority. The untracked `tmp/` prototype and concept image are
tone evidence only. No final production art, testimonials, customer claims, or
benchmarks exist.

## Product Principles

- Make every tactical state and modifier understandable.
- Keep grammar, content, and locale-neutral rules in their owning layers.
- Preserve privacy and accessibility from the first surface that exercises
  them.
- Prefer original, legible political-theatre character over generic game or
  dashboard presentation.
- Deliver the product in small, dependency-ordered milestones.

## Accessibility & Inclusion

Use semantic Document Object Model (DOM) content for controls and required
text. Support keyboard use, accessible names, readable contrast, zoomed text,
reduced motion, and private hotseat presentation as their owning milestones
become active. The first title placeholder must expose an accessible document
title and heading.
