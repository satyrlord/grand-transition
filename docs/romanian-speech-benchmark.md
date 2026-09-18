# Romanian speech production benchmark (AC-029-16)

Recorded 2026-09-18. Raw measurements are in
[`romanian-speech-benchmark.json`](romanian-speech-benchmark.json); this report
is the retained human-readable record.

## Environment

| Item | Value |
| --- | --- |
| CPU | 11th Gen Intel Core i7-11700 @ 2.50 GHz, 16 cores |
| RAM | 137,025,044,480 bytes (128 GiB) |
| OS | win32 10.0.26200 |
| Node | v24.19.0 |
| Browser | Chromium 153.0.8010.12 (Playwright `chromium`) |
| Least-capable proxy | CPU throttled 4×, HTTP cache disabled |
| Viewport | 1280 × 720 (supported landscape) |
| Build | production (`npm run build` output served by `vite preview`) |

No low-end physical device or mobile browser was available, so the
least-capable supported environment is represented by a throttled desktop
Chromium. That substitution is a limitation of this record, not a measurement.

## Workload

Both Romanian voices, one complete round of the shipped two-clause fixture:

1. `Fratele vostru este un turnător`
2. `dar dezacordul vostru unanim are locul într-un muzeu de istorie.`

Delivered once by `ro_RO-mihai-medium` (male skin) and once by
`ro_RO-liana-medium` (female skin): four clause syntheses per round,
`repetitions: 4`. Observable round wall clock: 22,340 ms.

## Results

| Measurement | Result |
| --- | --- |
| Cold initialization (first clause, male voice) | 5,690 ms |
| Cold initialization (first clause, female voice) | 5,454 ms |
| Warm synthesis median | 1,817 ms |
| Warm synthesis worst | 1,983 ms |
| Peak JavaScript heap | 10,000,000 bytes (see caveat) |
| Romanian package size | 129,882,037 bytes |
| Lazy transfer span, both voices | 20,475 ms |

Raw samples:

| Voice | Cold | ms |
| --- | --- | --- |
| `ro_RO-mihai-medium` | yes | 5,690 |
| `ro_RO-mihai-medium` | no | 1,651 |
| `ro_RO-liana-medium` | yes | 5,454 |
| `ro_RO-liana-medium` | no | 1,983 |

The `cold` column marks the first clause for each voice. Each voice loads its
own weights on first use. The two warm samples are 1,651 and 1,983 ms, one per
voice. The 20,475 ms transfer span covers the lazy load of both models.

The package is 129.9 MB because it ships two 63 MB VITS models. One voice is
fetched per voice actually used, so a single-voice session pays about 64 MB and
a match that uses both pays the whole package.

### Ceiling

The existing 60-second synthesis timeout was never approached: the worst
cold synthesis measured 5,690 ms under 4× CPU throttling, roughly an 11× margin.
No fixture is accepted that exceeds the ceiling; this run does not.

### Cancellation

Pausing mid-delivery requested 2 of the 4 clauses in the delivery: the clause
already being inferred completed (`msFromCancelToLastAnswer`: 1,048 ms) and no
further clause was requested. A clause in flight cannot be recalled; the
load-bearing observation is that the app stops asking the worker for more.

## Unverified

- **Device and browser spread.** Only throttled desktop Chromium was measured.
  Firefox, WebKit, and low-end physical devices remain unverified.
- **WebAssembly heap.** `performance.memory` reports the JavaScript heap only
  (and Chromium quantises it), so the peak figure excludes the Wasm heap that
  holds the weights. The 129.9 MB package size is the honest proxy for the
  weight footprint; true peak memory is unverified.
- **Audible output.** These are timing and size measurements. They say nothing
  about naturalness or pronunciation quality.

## Reproduction

```powershell
$env:GRAND_TRANSITION_BENCHMARK=1
npx playwright test e2e/romanian-speech-benchmark.spec.ts --reporter=line
```

The benchmark is opt-in and Chromium-only, so it never lengthens
`quality:quick` or `quality:full`; it measures rather than gates. Its only
assertions are the 60-second ceiling and the absence of worker errors.
