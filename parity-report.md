# React Doctor v1↔v2 Parity Report

Generated: 2026-05-13T05:12:58.512Z. CLI flags: `--json --json-compact --no-dead-code --offline`.

v2 issues are filtered to v1's lint rule-ID surface (extracted from `packages/react-doctor/src/oxlint-config.ts`); knip dead-code rules are excluded on both sides.

| Fixture                              | v1 raw | v1 filt | v2 raw | v2 filt |     Δ | v1 time | v2 time | Slowdown |                                                                                                                                                                                                Missing in v2 | Extra in v2 |
| ------------------------------------ | -----: | ------: | -----: | ------: | ----: | ------: | ------: | -------: | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | ----------: |
| RhysSullivan/executor                |     77 |      66 |     34 |      66 |     0 |    2.2s |   784ms |    0.36× |                                                                                                                                                                                                            2 |           2 |
| nodejs/nodejs.org                    |     80 |      74 |     46 |      74 |     0 |    2.5s |    2.4s |    0.97× |                                                                                                                                                                                                            6 |           5 |
| tldraw/tldraw                        |     67 |      34 |      0 |      34 |     0 |   13.2s |    2.2s |    0.17× |                                                                                                                                                                                                           60 |           1 |
| pingdotgg/t3code                     |     55 |      55 |      0 |      56 |    +1 |   11.5s |   12.1s |    1.05× |                                                                                                                                                                                                            7 |           0 |
| better-auth/better-auth              |     65 |      61 |      0 |      63 |    +2 |    1.6s |    1.1s |    0.67× |                                                                                                                                                                                                           13 |           1 |
| excalidraw/excalidraw                |     62 |      57 |      0 |      56 |    -1 |    1.6s |    1.5s |    0.99× |                                                                                                                                                                                                            5 |         546 |
| mastra-ai/mastra                     |     52 |      41 |      0 |      39 |    -2 |    3.0s |    9.2s |    3.05× |                                                                                                                                                                                                           66 |        5426 |
| payloadcms/payload                   |     31 |      15 |      0 |      17 |    +2 |   27.3s |   11.5s |    0.42× |                                                                                                                                                                                                          264 |          20 |
| baptisteArno/typebot.io              |     54 |      48 |      0 |      48 |     0 |    3.3s |    1.7s |    0.51× |                                                                                                                                                                                                           21 |           0 |
| makeplane/plane                      |     55 |      42 |      0 |      43 |    +1 |    6.3s |    2.8s |    0.44× |                                                                                                                                                                                                           20 |         808 |
| medusajs/medusa                      |     50 |      43 |      0 |      44 |    +1 |    6.1s |    6.5s |    1.06× |                                                                                                                                                                                                           45 |          29 |
| RocketChat/Rocket.Chat               |     47 |      35 |      0 |      36 |    +1 |    7.0s |    4.8s |    0.69× |                                                                                                                                                                                                          593 |           0 |
| twentyhq/twenty                      |     44 |      24 |      0 |      25 |    +1 |   14.6s |    7.8s |    0.53× |                                                                                                                                                                                                          251 |          44 |
| unkeyed/unkey                        |     43 |      38 |      0 |      39 |    +1 |    3.2s |    2.7s |    0.85× |                                                                                                                                                                                                           25 |           0 |
| shadcn-ui/ui                         |     44 |      45 |      0 |      45 |     0 |    4.3s |    5.1s |    1.20× |                                                                                                                                                                                                          148 |        1975 |
| triggerdotdev/trigger.dev            |     42 |      30 |      0 |      31 |    +1 |    3.9s |    3.2s |    0.82× |                                                                                                                                                                                                           27 |           9 |
| formbricks/formbricks                |     38 |      35 |      0 |      36 |    +1 |    4.7s |    4.1s |    0.86× |                                                                                                                                                                                                           44 |         639 |
| langfuse/langfuse                    |     34 |      32 |      0 |      33 |    +1 |    3.6s |    4.2s |    1.17× |                                                                                                                                                                                                          333 |           2 |
| ToolJet/ToolJet                      |     28 |      30 |      0 |      30 |     0 |   14.5s |    8.7s |    0.60× |                                                                                                                                                                                                           27 |           0 |
| onlook-dev/onlook                    |     30 |      27 |      0 |      29 |    +2 |    4.3s |    4.4s |    1.02× |                                                                                                                                                                                                           49 |           0 |
| calcom/cal.com                       |     27 |      18 |      0 |      19 |    +1 |    9.6s |    4.6s |    0.48× |                                                                                                                                                                                                          483 |         120 |
| PostHog/posthog                      |     31 |      25 |      0 |      29 |    +4 |   22.1s |    8.9s |    0.40× |                                                                                                                                                                                                          300 |          19 |
| appsmithorg/appsmith                 |      9 |      12 |      0 |      13 |    +1 |   25.5s |   26.1s |    1.03× |                                                                                                                                                                                                           79 |           8 |
| getsentry/sentry                     |     24 |      24 |      0 |      26 |    +2 |    7.2s |   10.1s |    1.40× |                                                                                                                                                                                                          112 |           0 |
| lobehub/lobe-chat                    |     25 |      27 |      0 |      28 |    +1 |   20.7s |   10.2s |    0.49× |                                                                                                                                                                                                          103 |           5 |
| dubinc/dub                           |     23 |      24 |      0 |      25 |    +1 |    4.7s |    4.5s |    0.96× |                                                                                                                                                                                                           42 |           0 |
| TanStack/query                       |     54 |      50 |      0 |      51 |    +1 |   11.2s |    2.8s |    0.25× |                                                                                                                                                                                                           78 |          47 |
| pmndrs/react-three-fiber             |     81 |      80 |     38 |      78 |    -2 |    2.1s |   860ms |    0.42× |                                                                                                                                                                                                            0 |           8 |
| react-hook-form/react-hook-form      |     75 |      75 |     20 |      76 |    +1 |    1.1s |   945ms |    0.83× |                                                                                                                                                                                                            2 |           0 |
| framer/motion                        |     50 |      49 |      0 |      49 |     0 |   15.4s |    8.2s |    0.53× |                                                                                                                                                                                                            0 |           2 |
| expo/expo                            |     55 |      14 |      0 |      15 |    +1 |   27.6s |   35.1s |    1.27× |                                                                                                                                                                                                          169 |         455 |
| vercel/next.js                       |      0 |       0 |      0 |       0 |     0 |   65.7s |   46.1s |    0.70× |                                                                                                                                                                                                         1709 |          66 |
| facebook/react                       |     54 |      47 |      0 |      49 |    +2 |    6.9s |    4.6s |    0.66× |                                                                                                                                                                                                          126 |           0 |
| bluesky-social/social-app            |     22 |      22 |      0 |      23 |    +1 |   27.3s |   27.1s |    0.99× |                                                                                                                                                                                                           28 |           0 |
| outline/outline                      |     45 |      55 |      0 |      55 |     0 |    2.0s |    2.5s |    1.26× |                                                                                                                                                                                                           10 |           0 |
| trpc/trpc                            |     74 |      60 |      0 |      58 |    -2 |    4.9s |    1.7s |    0.35× |                                                                                                                                                                                                           25 |         390 |
| radix-ui/primitives                  |     72 |      72 |      0 |      72 |     0 |    1.6s |    1.1s |    0.68× |                                                                                                                                                                                                            2 |           0 |
| documenso/documenso                  |     45 |      45 |      0 |      46 |    +1 |    5.1s |    3.0s |    0.59× |                                                                                                                                                                                                           69 |         798 |
| invoke-ai/InvokeAI                   |     67 |      69 |      0 |      69 |     0 |    1.5s |    1.8s |    1.18× |                                                                                                                                                                                                            4 |           0 |
| refinedev/refine                     |     75 |      21 |      0 |      18 |    -3 |   48.3s |   10.5s |    0.22× |                                                                                                                                                                                                          600 |        3217 |
| vercel/ai                            |     53 |      52 |      0 |      54 |    +2 |    8.2s |    4.3s |    0.53× |                                                                                                                                                                                                          150 |          86 |
| vercel/commerce                      |     81 |      81 |     46 |      81 |     0 |   499ms |   422ms |    0.85× |                                                                                                                                                                                                            0 |           0 |
| cloudflare/next-on-pages             |      — |       — |      — |       — | error |       — |       — |        — | No React dependency found in /Users/aidenybai/dev/react-doctor-parity-testing/cloudflare\_\_next-on-pages/packages/next-on-pages/package.json. Add "react" to dependencies (or peerDependencies) and re-run. |             |
| t3-oss/create-t3-app                 |     90 |      88 |     78 |      89 |    +1 |   758ms |   468ms |    0.62× |                                                                                                                                                                                                            6 |           4 |
| steven-tey/novel                     |     91 |      90 |     74 |      90 |     0 |   681ms |   395ms |    0.58× |                                                                                                                                                                                                            0 |           0 |
| vercel/swr                           |     77 |      78 |     28 |      80 |    +2 |   829ms |   918ms |    1.11× |                                                                                                                                                                                                           12 |          75 |
| pmndrs/zustand                       |     93 |      93 |     80 |      93 |     0 |   767ms |   449ms |    0.59× |                                                                                                                                                                                                            0 |          14 |
| tannerlinsley/react-ranger           |    100 |     100 |    100 |     100 |     0 |   396ms |   284ms |    0.72× |                                                                                                                                                                                                            0 |           0 |
| jaredpalmer/formik                   |     78 |      76 |     41 |      78 |    +2 |    1.4s |   719ms |    0.50× |                                                                                                                                                                                                            9 |           0 |
| remix-run/react-router               |     69 |      66 |      0 |      58 |    -8 |    5.7s |    2.5s |    0.44× |                                                                                                                                                                                                          154 |         874 |
| withastro/astro                      |     96 |      90 |     15 |      81 |    -9 |   11.2s |    2.4s |    0.22× |                                                                                                                                                                                                          134 |         870 |
| vitejs/vite                          |     96 |      94 |     33 |      85 |    -9 |   811ms |    1.2s |    1.42× |                                                                                                                                                                                                            1 |         373 |
| preactjs/preact                      |      — |       — |      — |       — | error |       — |       — |        — |                                 No React dependency found in /Users/aidenybai/dev/react-doctor-parity-testing/preactjs\_\_preact/package.json. Add "react" to dependencies (or peerDependencies) and re-run. |             |
| solidjs/solid-start                  |      — |       — |      — |       — | error |       — |       — |        — |                             No React dependency found in /Users/aidenybai/dev/react-doctor-parity-testing/solidjs\_\_solid-start/package.json. Add "react" to dependencies (or peerDependencies) and re-run. |             |
| umami-software/umami                 |     45 |      45 |      0 |      45 |     0 |    4.8s |    5.1s |    1.05× |                                                                                                                                                                                                            0 |           0 |
| calcom/cal.com                       |     27 |      18 |      0 |      19 |    +1 |    7.5s |    2.8s |    0.38× |                                                                                                                                                                                                          483 |         120 |
| nrwl/nx                              |     42 |      43 |      0 |      44 |    +1 |    4.1s |    5.2s |    1.27× |                                                                                                                                                                                                           40 |          41 |
| novuhq/novu                          |     33 |      26 |      0 |      27 |    +1 |    4.5s |    2.4s |    0.55× |                                                                                                                                                                                                           51 |           0 |
| highlight/highlight                  |     43 |      26 |      0 |      27 |    +1 |    3.9s |    1.9s |    0.50× |                                                                                                                                                                                                           18 |          19 |
| n8n-io/n8n                           |      — |       — |      — |       — | error |       — |       — |        — |                                      No React dependency found in /Users/aidenybai/dev/react-doctor-parity-testing/n8n-io\_\_n8n/package.json. Add "react" to dependencies (or peerDependencies) and re-run. |             |
| immich-app/immich                    |     90 |      87 |     54 |      83 |    -4 |   961ms |   930ms |    0.97× |                                                                                                                                                                                                            1 |         153 |
| grafana/grafana                      |     31 |      33 |      0 |      33 |     0 |    7.8s |    7.4s |    0.95× |                                                                                                                                                                                                           98 |           9 |
| pierrecomputer/pierre/packages/trees |     78 |      78 |     30 |      78 |     0 |   999ms |   820ms |    0.82× |                                                                                                                                                                                                           67 |           0 |
| pierrecomputer/pierre/packages/diffs |     93 |      93 |     78 |      93 |     0 |   653ms |   491ms |    0.75× |                                                                                                                                                                                                            0 |           0 |
| frontend                             |      — |       — |      — |       — | error |       — |       — |        — |                                                                                                                                                                                                      skipped |             |
| cheffect                             |      — |       — |      — |       — | error |       — |       — |        — |                                                                                                                                                                                                      skipped |             |
| bunnings-lite                        |      — |       — |      — |       — | error |       — |       — |        — |                                                                                                                                                                                                      skipped |             |

**Score divergence from v1** (Δ = v2 filtered − v1 filtered, across 60 fixtures):

| Bucket              | Count |
| ------------------- | ----: |
| Δ = 0 (exact match) |    19 |
| \|Δ\| ≤ 1           |    43 |
| \|Δ\| ≤ 2           |    54 |
| \|Δ\| ≤ 5           |    57 |
| \|Δ\| > 5           |     3 |
| max \|Δ\|           |     9 |
| mean \|Δ\|          |  1.38 |
| errored             |     7 |

**Wall-clock slowdown** (v2 / v1, across 60 fixtures; both CLIs spawned in parallel so the ratio reflects relative cost under shared load, not absolute):

| Bucket           | Count |
| ---------------- | ----: |
| ≤ 1.0× (v2 ≤ v1) |    45 |
| ≤ 1.5×           |    59 |
| ≤ 2.0×           |    59 |
| ≤ 3.0×           |    59 |
| > 3.0×           |     1 |
| median           | 0.70× |
| mean             | 0.78× |
| max              | 3.05× |

Top 5 slowest fixtures (by v2/v1 ratio):

- mastra-ai/mastra: 3.0s → 9.2s (3.05×)
- vitejs/vite: 811ms → 1.2s (1.42×)
- getsentry/sentry: 7.2s → 10.1s (1.40×)
- expo/expo: 27.6s → 35.1s (1.27×)
- nrwl/nx: 4.1s → 5.2s (1.27×)

## Per-fixture rule deltas

### RhysSullivan/executor

- v1 filtered score: **66** vs v2 filtered: **66**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 1
  - `react-doctor/design-no-three-period-ellipsis` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-await-in-loop` × 2

### nodejs/nodejs.org

- v1 filtered score: **74** vs v2 filtered: **74**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/nextjs-no-a-element`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/no-secrets-in-client-code`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/nextjs-no-a-element` × 3
  - `react-doctor/js-combine-iterations` × 3
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-await-in-loop` × 2
  - `react-doctor/no-barrel-import` × 1
  - `react-doctor/js-combine-iterations` × 1
  - `react-doctor/no-secrets-in-client-code` × 1

### tldraw/tldraw

- v1 filtered score: **34** vs v2 filtered: **34**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/no-secrets-in-client-code`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 36
  - `react-doctor/js-combine-iterations` × 11
  - `react-doctor/design-no-three-period-ellipsis` × 6
  - `react-doctor/js-batch-dom-css` × 4
  - `react-doctor/js-length-check-first` × 3
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/no-secrets-in-client-code` × 1

### pingdotgg/t3code

- v1 filtered score: **55** vs v2 filtered: **56**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 4
  - `react-doctor/js-combine-iterations` × 3

### better-auth/better-auth

- v1 filtered score: **61** vs v2 filtered: **63**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/no-inline-exhaustive-style`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 5
  - `react-doctor/js-combine-iterations` × 3
  - `react-doctor/server-fetch-without-revalidate` × 3
  - `react-doctor/no-inline-exhaustive-style` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-combine-iterations` × 1

### excalidraw/excalidraw

- v1 filtered score: **57** vs v2 filtered: **56**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/js-length-check-first`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/js-min-max-loop`
  - `react-doctor/prefer-use-effect-event`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 4
  - `react-doctor/js-length-check-first` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/no-render-in-render` × 84
  - `effect/no-event-handler` × 77
  - `react-doctor/js-combine-iterations` × 63
  - `react-doctor/no-barrel-import` × 41
  - `react-doctor/js-batch-dom-css` × 23
  - `react-doctor/no-react19-deprecated-apis` × 18
  - `effect/no-derived-state` × 17
  - `react-doctor/js-set-map-lookups` × 17
  - `react-doctor/rendering-svg-precision` × 17
  - `jsx-a11y/no-static-element-interactions` × 15
  - `react-doctor/no-array-index-as-key` × 14
  - `jsx-a11y/click-events-have-key-events` × 14
  - `jsx-a11y/no-autofocus` × 11
  - `react-doctor/no-giant-component` × 10
  - `react-doctor/no-cascading-set-state` × 10
  - `effect/no-adjust-state-on-prop-change` × 7
  - `react-doctor/rerender-functional-setstate` × 7
  - `react-doctor/async-await-in-loop` × 6
  - `react-doctor/no-derived-useState` × 6
  - `react-doctor/no-dynamic-import-path` × 6

### mastra-ai/mastra

- v1 filtered score: **41** vs v2 filtered: **39**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/js-length-check-first`
  - `react-doctor/js-min-max-loop`
  - `react-doctor/no-secrets-in-client-code`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 57
  - `react-doctor/js-combine-iterations` × 7
  - `react-doctor/async-parallel` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-await-in-loop` × 1042
  - `react-doctor/js-combine-iterations` × 507
  - `react-doctor/server-sequential-independent-await` × 490
  - `react-doctor/async-parallel` × 432
  - `react-doctor/design-no-redundant-size-axes` × 424
  - `react-doctor/no-barrel-import` × 414
  - `effect/no-event-handler` × 366
  - `react-doctor/js-set-map-lookups` × 225
  - `react-doctor/no-react19-deprecated-apis` × 149
  - `react-doctor/rendering-svg-precision` × 146
  - `react-doctor/js-flatmap-filter` × 101
  - `react-doctor/js-index-maps` × 94
  - `react-doctor/js-tosorted-immutable` × 82
  - `react-doctor/js-cache-property-access` × 76
  - `effect/no-derived-state` × 70
  - `react-doctor/rendering-hydration-mismatch-time` × 61
  - `react-doctor/no-array-index-as-key` × 58
  - `effect/no-adjust-state-on-prop-change` × 58
  - `react-doctor/no-effect-event-handler` × 43
  - `react-doctor/prefer-useReducer` × 34

### payloadcms/payload

- v1 filtered score: **15** vs v2 filtered: **17**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/js-length-check-first`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 188
  - `react-doctor/no-tiny-text` × 31
  - `react-doctor/js-combine-iterations` × 14
  - `react-doctor/design-no-three-period-ellipsis` × 12
  - `react-doctor/js-length-check-first` × 6
  - `react-doctor/no-inline-exhaustive-style` × 6
  - `react-doctor/nextjs-no-img-element` × 4
  - `react-doctor/no-outline-none` × 2
  - `react-doctor/nextjs-no-a-element` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-redundant-size-axes` × 17
  - `react-doctor/no-barrel-import` × 1
  - `react-doctor/js-set-map-lookups` × 1
  - `react-doctor/js-combine-iterations` × 1

### baptisteArno/typebot.io

- v1 filtered score: **48** vs v2 filtered: **48**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 17
  - `react-doctor/js-combine-iterations` × 4

### makeplane/plane

- v1 filtered score: **42** vs v2 filtered: **43**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 12
  - `react-doctor/design-no-three-period-ellipsis` × 8
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-redundant-size-axes` × 808

### medusajs/medusa

- v1 filtered score: **43** vs v2 filtered: **44**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 29
  - `react-doctor/async-parallel` × 11
  - `react-doctor/design-no-three-period-ellipsis` × 5
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-combine-iterations` × 9
  - `react-doctor/server-sequential-independent-await` × 7
  - `react-doctor/js-flatmap-filter` × 5
  - `react-doctor/async-parallel` × 4
  - `react-doctor/async-await-in-loop` × 2
  - `react-doctor/no-barrel-import` × 2

### RocketChat/Rocket.Chat

- v1 filtered score: **35** vs v2 filtered: **36**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/js-length-check-first`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 574
  - `react-doctor/js-combine-iterations` × 15
  - `react-doctor/design-no-three-period-ellipsis` × 3
  - `react-doctor/js-length-check-first` × 1

### twentyhq/twenty

- v1 filtered score: **24** vs v2 filtered: **25**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/js-length-check-first`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 130
  - `react-doctor/async-parallel` × 111
  - `react-doctor/design-no-three-period-ellipsis` × 9
  - `react-doctor/js-length-check-first` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-combine-iterations` × 16
  - `react-doctor/async-await-in-loop` × 8
  - `react-doctor/async-parallel` × 7
  - `react-doctor/server-sequential-independent-await` × 3
  - `react-doctor/no-dynamic-import-path` × 2
  - `react-doctor/js-tosorted-immutable` × 2
  - `react-doctor/no-full-lodash-import` × 1
  - `react-doctor/js-set-map-lookups` × 1
  - `react-doctor/async-defer-await` × 1
  - `react-doctor/js-index-maps` × 1
  - `react-doctor/js-cache-property-access` × 1
  - `react-doctor/no-secrets-in-client-code` × 1

### unkeyed/unkey

- v1 filtered score: **38** vs v2 filtered: **39**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 21
  - `react-doctor/js-combine-iterations` × 3
  - `react-doctor/server-fetch-without-revalidate` × 1

### shadcn-ui/ui

- v1 filtered score: **45** vs v2 filtered: **45**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/async-parallel`
  - `react-doctor/js-cache-property-access`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 146
  - `react-doctor/js-combine-iterations` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `jsx-a11y/anchor-is-valid` × 309
  - `react-doctor/design-no-redundant-size-axes` × 195
  - `react-doctor/prefer-dynamic-import` × 168
  - `react-doctor/no-array-index-as-key` × 123
  - `effect/no-event-handler` × 123
  - `react-doctor/no-react19-deprecated-apis` × 107
  - `react-doctor/js-combine-iterations` × 97
  - `react-doctor/rendering-hydration-mismatch-time` × 79
  - `react-doctor/design-no-vague-button-label` × 60
  - `react-doctor/async-await-in-loop` × 39
  - `react-doctor/rerender-memo-before-early-return` × 38
  - `react/no-danger` × 36
  - `react-doctor/js-set-map-lookups` × 35
  - `react-doctor/design-no-space-on-flex-children` × 35
  - `react-doctor/rerender-functional-setstate` × 34
  - `react-doctor/js-index-maps` × 32
  - `react-doctor/no-derived-useState` × 29
  - `react-doctor/design-no-bold-heading` × 26
  - `react-doctor/rendering-svg-precision` × 24
  - `effect/no-pass-data-to-parent` × 21

### triggerdotdev/trigger.dev

- v1 filtered score: **30** vs v2 filtered: **31**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 22
  - `react-doctor/js-combine-iterations` × 3
  - `react-doctor/server-fetch-without-revalidate` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/server-sequential-independent-await` × 6
  - `react-doctor/async-await-in-loop` × 1
  - `react-doctor/async-parallel` × 1
  - `react-doctor/js-combine-iterations` × 1

### formbricks/formbricks

- v1 filtered score: **35** vs v2 filtered: **36**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/js-length-check-first`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 12
  - `react-doctor/nextjs-missing-metadata` × 12
  - `react-doctor/no-inline-exhaustive-style` × 10
  - `react-doctor/server-fetch-without-revalidate` × 8
  - `react-doctor/js-length-check-first` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `effect/no-event-handler` × 393
  - `react-doctor/async-await-in-loop` × 42
  - `effect/no-pass-data-to-parent` × 18
  - `effect/no-derived-state` × 18
  - `react-doctor/js-combine-iterations` × 16
  - `react-doctor/rerender-lazy-state-init` × 15
  - `react-doctor/no-generic-handler-names` × 13
  - `react-doctor/rendering-svg-precision` × 10
  - `react-doctor/no-effect-event-handler` × 7
  - `react-doctor/server-sequential-independent-await` × 6
  - `react-doctor/js-set-map-lookups` × 6
  - `react-doctor/no-cascading-set-state` × 6
  - `react-doctor/rerender-state-only-in-handlers` × 6
  - `react-doctor/design-no-redundant-size-axes` × 6
  - `react-doctor/design-no-space-on-flex-children` × 6
  - `react-doctor/design-no-default-tailwind-palette` × 5
  - `react-doctor/js-tosorted-immutable` × 4
  - `react-doctor/client-passive-event-listeners` × 4
  - `react-doctor/no-giant-component` × 4
  - `react-doctor/no-many-boolean-props` × 3

### langfuse/langfuse

- v1 filtered score: **32** vs v2 filtered: **33**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 253
  - `react-doctor/design-no-three-period-ellipsis` × 64
  - `react-doctor/js-combine-iterations` × 11
  - `react-doctor/js-length-check-first` × 5
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-flatmap-filter` × 2

### ToolJet/ToolJet

- v1 filtered score: **30** vs v2 filtered: **30**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 16
  - `react-doctor/js-combine-iterations` × 11

### onlook-dev/onlook

- v1 filtered score: **27** vs v2 filtered: **29**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/js-length-check-first`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 32
  - `react-doctor/js-combine-iterations` × 10
  - `react-doctor/nextjs-missing-metadata` × 5
  - `react-doctor/server-fetch-without-revalidate` × 1
  - `react-doctor/js-length-check-first` × 1

### calcom/cal.com

- v1 filtered score: **18** vs v2 filtered: **19**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 425
  - `react-doctor/nextjs-no-img-element` × 28
  - `react-doctor/design-no-three-period-ellipsis` × 13
  - `react-doctor/server-fetch-without-revalidate` × 6
  - `react-doctor/nextjs-no-use-search-params-without-suspense` × 6
  - `react-doctor/js-combine-iterations` × 2
  - `react-doctor/nextjs-missing-metadata` × 1
  - `react-doctor/js-length-check-first` × 1
  - `react-doctor/nextjs-no-native-script` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-redundant-size-axes` × 94
  - `react-doctor/js-batch-dom-css` × 11
  - `react-doctor/async-parallel` × 4
  - `react-doctor/server-sequential-independent-await` × 4
  - `react-doctor/js-set-map-lookups` × 2
  - `effect/no-initialize-state` × 2
  - `effect/no-pass-data-to-parent` × 1
  - `effect/no-derived-state` × 1
  - `react-doctor/rendering-hydration-no-flicker` × 1

### PostHog/posthog

- v1 filtered score: **25** vs v2 filtered: **29**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/nextjs-missing-metadata`
  - `react-doctor/nextjs-no-client-side-redirect`
  - `react-doctor/nextjs-no-img-element`
  - `react-doctor/react-compiler-destructure-method`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 139
  - `react-doctor/js-combine-iterations` × 60
  - `react-doctor/design-no-bold-heading` × 26
  - `react-doctor/design-no-default-tailwind-palette` × 14
  - `react-doctor/design-no-space-on-flex-children` × 13
  - `jsx-a11y/label-has-associated-control` × 8
  - `react-doctor/rendering-hydration-mismatch-time` × 8
  - `react-doctor/nextjs-missing-metadata` × 7
  - `react-doctor/nextjs-no-client-side-redirect` × 3
  - `react-doctor/nextjs-no-img-element` × 3
  - `react-doctor/react-compiler-destructure-method` × 3
  - `effect/no-initialize-state` × 2
  - `react-doctor/client-localstorage-no-version` × 2
  - `react-doctor/no-effect-event-handler` × 2
  - `jsx-a11y/click-events-have-key-events` × 2
  - `react-doctor/no-giant-component` × 2
  - `react-doctor/js-length-check-first` × 1
  - `react-doctor/async-parallel` × 1
  - `react-doctor/rerender-state-only-in-handlers` × 1
  - `effect/no-derived-state` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-set-map-lookups` × 6
  - `react-doctor/js-tosorted-immutable` × 3
  - `react-doctor/async-await-in-loop` × 3
  - `react-doctor/js-combine-iterations` × 2
  - `react-doctor/js-flatmap-filter` × 1
  - `react-doctor/js-index-maps` × 1
  - `react-doctor/async-parallel` × 1
  - `react-doctor/async-defer-await` × 1
  - `react-doctor/design-no-redundant-size-axes` × 1

### appsmithorg/appsmith

- v1 filtered score: **12** vs v2 filtered: **13**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 68
  - `react-doctor/async-parallel` × 6
  - `react-doctor/design-no-three-period-ellipsis` × 5
- Extra in v2 by (file, line) tuple (sampled):
  - `react-hooks-js/refs` × 2
  - `react-doctor/js-index-maps` × 1
  - `react-doctor/advanced-event-handler-refs` × 1
  - `react-doctor/no-mutable-in-deps` × 1
  - `effect/no-event-handler` × 1
  - `react-hooks-js/use-memo` × 1
  - `react-doctor/no-full-lodash-import` × 1

### getsentry/sentry

- v1 filtered score: **24** vs v2 filtered: **26**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/js-length-check-first`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 87
  - `react-doctor/js-length-check-first` × 21
  - `react-doctor/design-no-three-period-ellipsis` × 2
  - `react-doctor/async-parallel` × 2

### lobehub/lobe-chat

- v1 filtered score: **27** vs v2 filtered: **28**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 73
  - `react-doctor/async-parallel` × 14
  - `react-doctor/design-no-three-period-ellipsis` × 6
  - `react-doctor/server-fetch-without-revalidate` × 4
  - `react-doctor/js-length-check-first` × 4
  - `react-doctor/no-inline-exhaustive-style` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-parallel` × 2
  - `react-doctor/async-await-in-loop` × 1
  - `react-doctor/js-flatmap-filter` × 1
  - `react-doctor/js-hoist-regexp` × 1

### dubinc/dub

- v1 filtered score: **24** vs v2 filtered: **25**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/server-fetch-without-revalidate` × 16
  - `react-doctor/design-no-three-period-ellipsis` × 13
  - `react-doctor/js-combine-iterations` × 12
  - `react-doctor/nextjs-no-img-element` × 1

### TanStack/query

- v1 filtered score: **50** vs v2 filtered: **51**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 78
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/no-barrel-import` × 19
  - `jsx-a11y/anchor-is-valid` × 8
  - `react-doctor/async-await-in-loop` × 6
  - `react-doctor/js-combine-iterations` × 3
  - `react-doctor/async-parallel` × 2
  - `react-doctor/no-prevent-default` × 2
  - `react-doctor/rendering-hydration-mismatch-time` × 2
  - `react-doctor/js-index-maps` × 1
  - `react-doctor/js-set-map-lookups` × 1
  - `react-doctor/no-uncontrolled-input` × 1
  - `react-doctor/design-no-vague-button-label` × 1
  - `react-doctor/async-defer-await` × 1

### pmndrs/react-three-fiber

- v1 filtered score: **80** vs v2 filtered: **78**
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/rn-no-raw-text`
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/rn-no-raw-text` × 7
  - `react-doctor/rn-prefer-expo-image` × 1

### react-hook-form/react-hook-form

- v1 filtered score: **75** vs v2 filtered: **76**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 2

### framer/motion

- v1 filtered score: **49** vs v2 filtered: **49**
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-await-in-loop` × 2

### expo/expo

- v1 filtered score: **14** vs v2 filtered: **15**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 136
  - `react-doctor/js-combine-iterations` × 15
  - `react-doctor/design-no-three-period-ellipsis` × 14
  - `react-doctor/js-length-check-first` × 4
- Extra in v2 by (file, line) tuple (sampled):
  - `effect/no-event-handler` × 80
  - `react-doctor/js-combine-iterations` × 53
  - `react-doctor/no-dynamic-import-path` × 43
  - `react-doctor/js-set-map-lookups` × 32
  - `react-doctor/server-sequential-independent-await` × 31
  - `react-doctor/async-await-in-loop` × 29
  - `react-doctor/rn-prefer-reanimated` × 20
  - `react-doctor/effect-needs-cleanup` × 18
  - `react-doctor/no-barrel-import` × 17
  - `react-doctor/js-flatmap-filter` × 13
  - `react-doctor/js-index-maps` × 11
  - `react-doctor/js-cache-property-access` × 8
  - `react-doctor/async-parallel` × 8
  - `effect/no-pass-data-to-parent` × 7
  - `react-doctor/rerender-state-only-in-handlers` × 7
  - `react-doctor/js-tosorted-immutable` × 6
  - `react-doctor/no-react19-deprecated-apis` × 6
  - `react-doctor/js-length-check-first` × 6
  - `react-doctor/no-cascading-set-state` × 5
  - `react-doctor/no-effect-event-handler` × 5

### vercel/next.js

- v1 filtered score: **0** vs v2 filtered: **0**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/no-tiny-text`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-set-map-lookups` × 589
  - `react-doctor/js-cache-property-access` × 295
  - `react-doctor/async-parallel` × 238
  - `react-doctor/js-combine-iterations` × 143
  - `react-doctor/no-nested-component-definition` × 82
  - `react-doctor/no-polymorphic-children` × 44
  - `react-doctor/async-await-in-loop` × 43
  - `react-doctor/design-no-three-period-ellipsis` × 39
  - `react-doctor/no-eval` × 34
  - `react-doctor/js-flatmap-filter` × 21
  - `react-doctor/nextjs-missing-metadata` × 19
  - `react-doctor/js-batch-dom-css` × 18
  - `react-doctor/js-length-check-first` × 17
  - `react-doctor/no-dynamic-import-path` × 15
  - `react-doctor/no-inline-exhaustive-style` × 14
  - `react-doctor/js-hoist-regexp` × 12
  - `react-doctor/server-fetch-without-revalidate` × 11
  - `react-doctor/nextjs-no-native-script` × 11
  - `react-doctor/js-index-maps` × 7
  - `react-doctor/js-min-max-loop` × 7
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-await-in-loop` × 24
  - `react-doctor/async-parallel` × 13
  - `react-doctor/js-set-map-lookups` × 8
  - `react-doctor/js-combine-iterations` × 6
  - `react-doctor/js-cache-property-access` × 4
  - `react-doctor/js-index-maps` × 4
  - `react-doctor/no-dynamic-import-path` × 3
  - `react-doctor/server-sequential-independent-await` × 2
  - `react-doctor/js-tosorted-immutable` × 1
  - `react-doctor/no-eval` × 1

### facebook/react

- v1 filtered score: **47** vs v2 filtered: **49**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/async-parallel`
  - `react-doctor/js-length-check-first`
  - `react-doctor/no-tiny-text`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 122
  - `react-doctor/js-length-check-first` × 2
  - `react-doctor/no-tiny-text` × 2

### bluesky-social/social-app

- v1 filtered score: **22** vs v2 filtered: **23**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 15
  - `react-doctor/js-combine-iterations` × 5
  - `react-doctor/no-array-index-as-key` × 3
  - `react-doctor/no-barrel-import` × 2
  - `jsx-a11y/alt-text` × 1
  - `react-doctor/async-defer-await` × 1
  - `react-doctor/no-inline-exhaustive-style` × 1

### outline/outline

- v1 filtered score: **55** vs v2 filtered: **55**
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 10

### trpc/trpc

- v1 filtered score: **60** vs v2 filtered: **58**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/no-barrel-import`
  - `react-doctor/no-react19-deprecated-apis`
  - `react-doctor/server-after-nonblocking`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/no-inline-exhaustive-style` × 14
  - `react-doctor/design-no-three-period-ellipsis` × 6
  - `react-doctor/js-combine-iterations` × 5
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-default-tailwind-palette` × 84
  - `react/no-unknown-property` × 54
  - `react-doctor/async-await-in-loop` × 40
  - `react-doctor/js-combine-iterations` × 15
  - `react-doctor/design-no-bold-heading` × 14
  - `react-doctor/no-array-index-as-key` × 13
  - `react-doctor/server-sequential-independent-await` × 12
  - `react-doctor/js-set-map-lookups` × 12
  - `react-doctor/rendering-hydration-mismatch-time` × 11
  - `react-doctor/async-parallel` × 8
  - `react-doctor/design-no-redundant-size-axes` × 8
  - `react-doctor/no-prevent-default` × 8
  - `react-doctor/no-eval` × 7
  - `react-doctor/no-dynamic-import-path` × 6
  - `react-doctor/rerender-state-only-in-handlers` × 6
  - `effect/no-chain-state-updates` × 6
  - `jsx-a11y/alt-text` × 5
  - `react-doctor/no-barrel-import` × 5
  - `react-doctor/js-index-maps` × 5
  - `react-doctor/js-flatmap-filter` × 5

### radix-ui/primitives

- v1 filtered score: **72** vs v2 filtered: **72**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/no-long-transition-duration`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/no-long-transition-duration` × 2

### documenso/documenso

- v1 filtered score: **45** vs v2 filtered: **46**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 32
  - `react-doctor/server-fetch-without-revalidate` × 18
  - `react-doctor/js-combine-iterations` × 8
  - `react-doctor/async-parallel` × 7
  - `react-doctor/no-inline-exhaustive-style` × 4
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-redundant-size-axes` × 798

### invoke-ai/InvokeAI

- v1 filtered score: **69** vs v2 filtered: **69**
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 4

### refinedev/refine

- v1 filtered score: **21** vs v2 filtered: **18**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/nextjs-no-css-link`
  - `react-doctor/nextjs-no-native-script`
- Unique rules in v2 only (drive v1's higher score):
  - `jsx-a11y/html-has-lang`
  - `react-doctor/async-parallel`
  - `react-doctor/js-cache-property-access`
  - `react-doctor/no-long-transition-duration`
  - `react-doctor/no-many-boolean-props`
  - `react-doctor/no-polymorphic-children`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-default-tailwind-palette` × 158
  - `react-doctor/no-react19-deprecated-apis` × 54
  - `react-doctor/design-no-three-period-ellipsis` × 50
  - `effect/no-event-handler` × 32
  - `react-doctor/design-no-bold-heading` × 31
  - `jsx-a11y/label-has-associated-control` × 22
  - `react-doctor/rendering-svg-precision` × 20
  - `react-doctor/design-no-redundant-size-axes` × 20
  - `react-doctor/no-array-index-as-key` × 18
  - `jsx-a11y/no-static-element-interactions` × 16
  - `jsx-a11y/click-events-have-key-events` × 14
  - `react-doctor/no-uncontrolled-input` × 11
  - `react-doctor/js-flatmap-filter` × 9
  - `react-doctor/prefer-dynamic-import` × 8
  - `jsx-a11y/anchor-is-valid` × 7
  - `react-doctor/rendering-hydration-mismatch-time` × 7
  - `react-doctor/no-render-in-render` × 6
  - `react-doctor/design-no-space-on-flex-children` × 6
  - `effect/no-derived-state` × 6
  - `react-doctor/async-await-in-loop` × 5
- Extra in v2 by (file, line) tuple (sampled):
  - `effect/no-event-handler` × 686
  - `react-doctor/rendering-svg-precision` × 488
  - `react-doctor/design-no-default-tailwind-palette` × 205
  - `react-doctor/no-react19-deprecated-apis` × 191
  - `react-doctor/no-barrel-import` × 176
  - `jsx-a11y/label-has-associated-control` × 128
  - `react-doctor/no-render-in-render` × 89
  - `react-doctor/no-array-index-as-key` × 82
  - `react-doctor/js-combine-iterations` × 77
  - `effect/no-derived-state` × 56
  - `jsx-a11y/no-static-element-interactions` × 53
  - `react-doctor/rerender-functional-setstate` × 48
  - `react-doctor/design-no-bold-heading` × 47
  - `react-doctor/no-inline-exhaustive-style` × 46
  - `jsx-a11y/click-events-have-key-events` × 45
  - `react-doctor/js-flatmap-filter` × 45
  - `effect/no-initialize-state` × 41
  - `react-doctor/no-uncontrolled-input` × 39
  - `jsx-a11y/no-autofocus` × 35
  - `react-doctor/no-giant-component` × 35

### vercel/ai

- v1 filtered score: **52** vs v2 filtered: **54**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 122
  - `react-doctor/server-fetch-without-revalidate` × 14
  - `react-doctor/async-parallel` × 6
  - `react-doctor/js-combine-iterations` × 6
  - `react-doctor/nextjs-missing-metadata` × 2
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-redundant-size-axes` × 84
  - `react-doctor/async-await-in-loop` × 2

### t3-oss/create-t3-app

- v1 filtered score: **88** vs v2 filtered: **89**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/nextjs-no-a-element`
  - `react-doctor/nextjs-no-img-element`
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/js-cache-storage`
  - `react-doctor/js-flatmap-filter`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 4
  - `react-doctor/nextjs-no-img-element` × 1
  - `react-doctor/nextjs-no-a-element` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-flatmap-filter` × 2
  - `react-doctor/js-combine-iterations` × 1
  - `react-doctor/js-cache-storage` × 1

### vercel/swr

- v1 filtered score: **78** vs v2 filtered: **80**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/async-parallel`
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 11
  - `react-doctor/async-parallel` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/nextjs-missing-metadata` × 37
  - `effect/no-initialize-state` × 6
  - `react/no-unknown-property` × 4
  - `react-doctor/rendering-hydration-no-flicker` × 3
  - `react-doctor/rerender-state-only-in-handlers` × 2
  - `effect/no-derived-state` × 2
  - `react-doctor/no-array-index-as-key` × 2
  - `jsx-a11y/alt-text` × 2
  - `react-doctor/nextjs-no-img-element` × 2
  - `react-doctor/rerender-functional-setstate` × 2
  - `effect/no-event-handler` × 2
  - `react-doctor/no-prevent-default` × 2
  - `react-doctor/server-auth-actions` × 1
  - `jsx-a11y/html-has-lang` × 1
  - `jsx-a11y/click-events-have-key-events` × 1
  - `jsx-a11y/no-static-element-interactions` × 1
  - `jsx-a11y/no-autofocus` × 1
  - `react-doctor/rendering-hydration-mismatch-time` × 1
  - `react-doctor/client-localstorage-no-version` × 1
  - `react-doctor/no-generic-handler-names` × 1

### pmndrs/zustand

- v1 filtered score: **93** vs v2 filtered: **93**
- Extra in v2 by (file, line) tuple (sampled):
  - `react/no-unknown-property` × 9
  - `react-doctor/no-array-index-as-key` × 3
  - `react-doctor/no-inline-exhaustive-style` × 1
  - `react-doctor/design-no-bold-heading` × 1

### jaredpalmer/formik

- v1 filtered score: **76** vs v2 filtered: **78**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/rn-no-raw-text`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/rn-no-raw-text` × 8
  - `react-doctor/design-no-three-period-ellipsis` × 1

### remix-run/react-router

- v1 filtered score: **66** vs v2 filtered: **58**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Unique rules in v2 only (drive v1's higher score):
  - `jsx-a11y/label-has-associated-control`
  - `jsx-a11y/no-static-element-interactions`
  - `react-doctor/js-index-maps`
  - `react-doctor/js-tosorted-immutable`
  - `react-doctor/no-fetch-in-effect`
  - `react-doctor/no-inline-exhaustive-style`
  - `react-doctor/no-react-dom-deprecated-apis`
  - `react-doctor/no-react19-deprecated-apis`
  - `react-doctor/no-z-index-9999`
  - `react-doctor/prefer-use-effect-event`
  - `react/jsx-key`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 147
  - `react-doctor/design-no-three-period-ellipsis` × 7
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/async-parallel` × 355
  - `react-doctor/async-await-in-loop` × 78
  - `react-doctor/js-set-map-lookups` × 78
  - `react-doctor/no-react19-deprecated-apis` × 52
  - `react-doctor/js-combine-iterations` × 42
  - `react-doctor/server-sequential-independent-await` × 38
  - `react-doctor/no-barrel-import` × 37
  - `effect/no-event-handler` × 29
  - `react-doctor/no-dynamic-import-path` × 25
  - `react/no-children-prop` × 23
  - `react-doctor/no-uncontrolled-input` × 16
  - `react/no-danger` × 12
  - `react-doctor/js-cache-property-access` × 9
  - `react-doctor/no-generic-handler-names` × 5
  - `react-doctor/js-flatmap-filter` × 5
  - `react-doctor/no-effect-chain` × 5
  - `react-doctor/js-hoist-regexp` × 5
  - `react-doctor/rerender-state-only-in-handlers` × 4
  - `effect/no-chain-state-updates` × 4
  - `effect/no-derived-state` × 4

### withastro/astro

- v1 filtered score: **90** vs v2 filtered: **81**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-default-tailwind-palette`
  - `react-doctor/design-no-vague-button-label`
- Unique rules in v2 only (drive v1's higher score):
  - `jsx-a11y/label-has-associated-control`
  - `react-doctor/async-defer-await`
  - `react-doctor/async-parallel`
  - `react-doctor/client-localstorage-no-version`
  - `react-doctor/js-batch-dom-css`
  - `react-doctor/js-cache-property-access`
  - `react-doctor/js-hoist-regexp`
  - `react-doctor/js-index-maps`
  - `react-doctor/js-tosorted-immutable`
  - `react-doctor/no-barrel-import`
  - `react-doctor/no-document-start-view-transition`
  - `react-doctor/no-polymorphic-children`
  - `react-doctor/server-hoist-static-io`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react/no-unknown-property` × 82
  - `react-doctor/server-sequential-independent-await` × 20
  - `react-doctor/rerender-functional-setstate` × 13
  - `react-doctor/no-derived-useState` × 13
  - `react-doctor/no-prevent-default` × 3
  - `react-doctor/design-no-default-tailwind-palette` × 1
  - `react-doctor/design-no-vague-button-label` × 1
  - `react/jsx-key` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/no-barrel-import` × 280
  - `react-doctor/async-await-in-loop` × 119
  - `react/no-unknown-property` × 113
  - `react-doctor/server-sequential-independent-await` × 94
  - `react-doctor/js-combine-iterations` × 62
  - `react-doctor/js-set-map-lookups` × 57
  - `react-doctor/no-dynamic-import-path` × 34
  - `react-doctor/no-derived-useState` × 17
  - `react-doctor/js-cache-property-access` × 16
  - `react-doctor/js-index-maps` × 16
  - `react-doctor/rerender-functional-setstate` × 14
  - `react-doctor/async-parallel` × 12
  - `react-doctor/js-flatmap-filter` × 9
  - `react-doctor/js-tosorted-immutable` × 5
  - `react-doctor/no-prevent-default` × 3
  - `react-doctor/async-defer-await` × 3
  - `react-doctor/client-localstorage-no-version` × 3
  - `react-doctor/js-batch-dom-css` × 3
  - `react-doctor/js-hoist-regexp` × 3
  - `react-doctor/no-polymorphic-children` × 2

### vitejs/vite

- v1 filtered score: **94** vs v2 filtered: **85**
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/async-await-in-loop`
  - `react-doctor/async-defer-await`
  - `react-doctor/js-cache-property-access`
  - `react-doctor/js-hoist-intl`
  - `react-doctor/js-hoist-regexp`
  - `react-doctor/js-index-maps`
  - `react-doctor/js-set-map-lookups`
  - `react-doctor/no-barrel-import`
  - `react-doctor/no-eval`
  - `react-doctor/no-full-lodash-import`
  - `react/no-unknown-property`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react/no-unknown-property` × 92
  - `react-doctor/no-dynamic-import-path` × 59
  - `react-doctor/async-await-in-loop` × 51
  - `react-doctor/js-set-map-lookups` × 45
  - `react-doctor/server-sequential-independent-await` × 43
  - `react-doctor/js-combine-iterations` × 22
  - `react-doctor/no-barrel-import` × 15
  - `react-doctor/js-flatmap-filter` × 12
  - `react-doctor/js-cache-property-access` × 7
  - `react-doctor/async-parallel` × 5
  - `react-doctor/rerender-functional-setstate` × 5
  - `react-doctor/js-hoist-regexp` × 4
  - `react-doctor/js-index-maps` × 4
  - `react-doctor/no-eval` × 3
  - `react-doctor/async-defer-await` × 2
  - `effect/no-initialize-state` × 1
  - `react-doctor/rendering-hydration-no-flicker` × 1
  - `react-doctor/no-full-lodash-import` × 1
  - `react-doctor/js-hoist-intl` × 1

### calcom/cal.com

- v1 filtered score: **18** vs v2 filtered: **19**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
  - `react-doctor/server-fetch-without-revalidate`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 425
  - `react-doctor/nextjs-no-img-element` × 28
  - `react-doctor/design-no-three-period-ellipsis` × 13
  - `react-doctor/server-fetch-without-revalidate` × 6
  - `react-doctor/nextjs-no-use-search-params-without-suspense` × 6
  - `react-doctor/js-combine-iterations` × 2
  - `react-doctor/js-length-check-first` × 1
  - `react-doctor/nextjs-missing-metadata` × 1
  - `react-doctor/nextjs-no-native-script` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/design-no-redundant-size-axes` × 94
  - `react-doctor/js-batch-dom-css` × 11
  - `react-doctor/async-parallel` × 4
  - `react-doctor/server-sequential-independent-await` × 4
  - `react-doctor/js-set-map-lookups` × 2
  - `effect/no-initialize-state` × 2
  - `effect/no-pass-data-to-parent` × 1
  - `effect/no-derived-state` × 1
  - `react-doctor/rendering-hydration-no-flicker` × 1

### nrwl/nx

- v1 filtered score: **43** vs v2 filtered: **44**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 22
  - `react-doctor/design-no-redundant-size-axes` × 15
  - `react-doctor/design-no-three-period-ellipsis` × 3
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-set-map-lookups` × 18
  - `react-doctor/async-await-in-loop` × 5
  - `react-doctor/no-eval` × 5
  - `react-doctor/js-combine-iterations` × 4
  - `react-doctor/js-cache-property-access` × 4
  - `react-doctor/js-index-maps` × 2
  - `react-doctor/no-dynamic-import-path` × 2
  - `react-doctor/js-flatmap-filter` × 1

### novuhq/novu

- v1 filtered score: **26** vs v2 filtered: **27**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 24
  - `react-doctor/async-parallel` × 20
  - `react-doctor/js-combine-iterations` × 5
  - `react-doctor/nextjs-no-img-element` × 2

### highlight/highlight

- v1 filtered score: **26** vs v2 filtered: **27**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 7
  - `react-doctor/no-inline-exhaustive-style` × 5
  - `react-doctor/server-fetch-without-revalidate` × 3
  - `react-doctor/js-combine-iterations` × 2
  - `react-doctor/nextjs-no-img-element` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-combine-iterations` × 7
  - `react-doctor/no-barrel-import` × 5
  - `react-doctor/js-set-map-lookups` × 4
  - `react-doctor/async-await-in-loop` × 3

### immich-app/immich

- v1 filtered score: **87** vs v2 filtered: **83**
- Unique rules in v2 only (drive v1's higher score):
  - `react-doctor/client-passive-event-listeners`
  - `react-doctor/js-batch-dom-css`
  - `react-doctor/js-hoist-intl`
  - `react-doctor/js-tosorted-immutable`
  - `react-doctor/no-dynamic-import-path`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/js-combine-iterations` × 1
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/no-full-lodash-import` × 27
  - `react-doctor/async-parallel` × 24
  - `react-doctor/server-sequential-independent-await` × 24
  - `react-doctor/async-await-in-loop` × 23
  - `react-doctor/js-combine-iterations` × 18
  - `react-doctor/js-batch-dom-css` × 8
  - `react-doctor/js-index-maps` × 6
  - `react-doctor/js-set-map-lookups` × 4
  - `react-doctor/js-tosorted-immutable` × 4
  - `react-doctor/async-defer-await` × 4
  - `react-doctor/client-passive-event-listeners` × 4
  - `react-doctor/js-hoist-intl` × 3
  - `react-doctor/js-cache-property-access` × 2
  - `react-doctor/js-flatmap-filter` × 1
  - `react-doctor/no-dynamic-import-path` × 1

### grafana/grafana

- v1 filtered score: **33** vs v2 filtered: **33**
- Unique rules in v1 only (drive v2's higher score):
  - `react-doctor/design-no-three-period-ellipsis`
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/design-no-three-period-ellipsis` × 51
  - `react-doctor/js-combine-iterations` × 47
- Extra in v2 by (file, line) tuple (sampled):
  - `react-doctor/js-combine-iterations` × 3
  - `react-doctor/js-hoist-regexp` × 2
  - `react-doctor/no-full-lodash-import` × 1
  - `react-doctor/js-set-map-lookups` × 1
  - `react-doctor/async-await-in-loop` × 1
  - `react-doctor/js-index-maps` × 1

### pierrecomputer/pierre/packages/trees

- v1 filtered score: **78** vs v2 filtered: **78**
- Missing in v2 by (file, line) tuple (sampled — same-rule-different-line entries here don't move the score):
  - `react-doctor/async-parallel` × 67

## Cross-fixture unique-rule rollup

Each rule below is one that fires on at least one fixture in one version but not the other. These are the rules whose alignment would close the score-parity gap.

### Rules firing in v1 but not v2 (sorted by fixture count)

| Rule                                              | Fixtures | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `react-doctor/design-no-three-period-ellipsis`    |       41 | RhysSullivan/executor, tldraw/tldraw, pingdotgg/t3code, better-auth/better-auth, mastra-ai/mastra, payloadcms/payload, baptisteArno/typebot.io, makeplane/plane, medusajs/medusa, RocketChat/Rocket.Chat, twentyhq/twenty, unkeyed/unkey, shadcn-ui/ui, triggerdotdev/trigger.dev, langfuse/langfuse, ToolJet/ToolJet, onlook-dev/onlook, calcom/cal.com, PostHog/posthog, appsmithorg/appsmith, getsentry/sentry, lobehub/lobe-chat, dubinc/dub, TanStack/query, react-hook-form/react-hook-form, expo/expo, vercel/next.js, bluesky-social/social-app, trpc/trpc, documenso/documenso, refinedev/refine, vercel/ai, t3-oss/create-t3-app, vercel/swr, jaredpalmer/formik, remix-run/react-router, calcom/cal.com, nrwl/nx, novuhq/novu, highlight/highlight, grafana/grafana |
| `react-doctor/server-fetch-without-revalidate`    |       11 | better-auth/better-auth, unkeyed/unkey, triggerdotdev/trigger.dev, formbricks/formbricks, onlook-dev/onlook, calcom/cal.com, lobehub/lobe-chat, dubinc/dub, documenso/documenso, vercel/ai, calcom/cal.com                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `react-doctor/js-length-check-first`              |        8 | excalidraw/excalidraw, payloadcms/payload, RocketChat/Rocket.Chat, twentyhq/twenty, formbricks/formbricks, onlook-dev/onlook, getsentry/sentry, facebook/react                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `react-doctor/nextjs-no-a-element`                |        2 | nodejs/nodejs.org, t3-oss/create-t3-app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `react-doctor/nextjs-no-img-element`              |        2 | PostHog/posthog, t3-oss/create-t3-app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `react-doctor/no-tiny-text`                       |        2 | vercel/next.js, facebook/react                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `react-doctor/async-parallel`                     |        2 | facebook/react, vercel/swr                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `react-doctor/no-inline-exhaustive-style`         |        1 | better-auth/better-auth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `react-doctor/nextjs-missing-metadata`            |        1 | PostHog/posthog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-doctor/nextjs-no-client-side-redirect`     |        1 | PostHog/posthog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-doctor/react-compiler-destructure-method`  |        1 | PostHog/posthog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-doctor/no-long-transition-duration`        |        1 | radix-ui/primitives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `react-doctor/nextjs-no-css-link`                 |        1 | refinedev/refine                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `react-doctor/nextjs-no-native-script`            |        1 | refinedev/refine                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `react-doctor/rn-no-raw-text`                     |        1 | jaredpalmer/formik                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `react-doctor/design-no-default-tailwind-palette` |        1 | withastro/astro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-doctor/design-no-vague-button-label`       |        1 | withastro/astro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### Rules firing in v2 but not v1 (sorted by fixture count)

| Rule                                             | Fixtures | Where                                                        |
| ------------------------------------------------ | -------: | ------------------------------------------------------------ |
| `react-doctor/js-cache-property-access`          |        4 | shadcn-ui/ui, refinedev/refine, withastro/astro, vitejs/vite |
| `react-doctor/no-secrets-in-client-code`         |        3 | nodejs/nodejs.org, tldraw/tldraw, mastra-ai/mastra           |
| `react-doctor/async-parallel`                    |        3 | shadcn-ui/ui, refinedev/refine, withastro/astro              |
| `react-doctor/no-barrel-import`                  |        3 | trpc/trpc, withastro/astro, vitejs/vite                      |
| `react-doctor/js-index-maps`                     |        3 | remix-run/react-router, withastro/astro, vitejs/vite         |
| `react-doctor/js-tosorted-immutable`             |        3 | remix-run/react-router, withastro/astro, immich-app/immich   |
| `react-doctor/js-min-max-loop`                   |        2 | excalidraw/excalidraw, mastra-ai/mastra                      |
| `react-doctor/prefer-use-effect-event`           |        2 | excalidraw/excalidraw, remix-run/react-router                |
| `react-doctor/no-react19-deprecated-apis`        |        2 | trpc/trpc, remix-run/react-router                            |
| `react-doctor/no-polymorphic-children`           |        2 | refinedev/refine, withastro/astro                            |
| `jsx-a11y/label-has-associated-control`          |        2 | remix-run/react-router, withastro/astro                      |
| `react-doctor/async-defer-await`                 |        2 | withastro/astro, vitejs/vite                                 |
| `react-doctor/js-batch-dom-css`                  |        2 | withastro/astro, immich-app/immich                           |
| `react-doctor/js-hoist-regexp`                   |        2 | withastro/astro, vitejs/vite                                 |
| `react-doctor/js-hoist-intl`                     |        2 | vitejs/vite, immich-app/immich                               |
| `react-doctor/js-length-check-first`             |        1 | mastra-ai/mastra                                             |
| `react-doctor/rn-no-raw-text`                    |        1 | pmndrs/react-three-fiber                                     |
| `react-doctor/server-after-nonblocking`          |        1 | trpc/trpc                                                    |
| `jsx-a11y/html-has-lang`                         |        1 | refinedev/refine                                             |
| `react-doctor/no-long-transition-duration`       |        1 | refinedev/refine                                             |
| `react-doctor/no-many-boolean-props`             |        1 | refinedev/refine                                             |
| `react-doctor/js-cache-storage`                  |        1 | t3-oss/create-t3-app                                         |
| `react-doctor/js-flatmap-filter`                 |        1 | t3-oss/create-t3-app                                         |
| `jsx-a11y/no-static-element-interactions`        |        1 | remix-run/react-router                                       |
| `react-doctor/no-fetch-in-effect`                |        1 | remix-run/react-router                                       |
| `react-doctor/no-inline-exhaustive-style`        |        1 | remix-run/react-router                                       |
| `react-doctor/no-react-dom-deprecated-apis`      |        1 | remix-run/react-router                                       |
| `react-doctor/no-z-index-9999`                   |        1 | remix-run/react-router                                       |
| `react/jsx-key`                                  |        1 | remix-run/react-router                                       |
| `react-doctor/client-localstorage-no-version`    |        1 | withastro/astro                                              |
| `react-doctor/no-document-start-view-transition` |        1 | withastro/astro                                              |
| `react-doctor/server-hoist-static-io`            |        1 | withastro/astro                                              |
| `react-doctor/async-await-in-loop`               |        1 | vitejs/vite                                                  |
| `react-doctor/js-set-map-lookups`                |        1 | vitejs/vite                                                  |
| `react-doctor/no-eval`                           |        1 | vitejs/vite                                                  |
| `react-doctor/no-full-lodash-import`             |        1 | vitejs/vite                                                  |
| `react/no-unknown-property`                      |        1 | vitejs/vite                                                  |
| `react-doctor/client-passive-event-listeners`    |        1 | immich-app/immich                                            |
| `react-doctor/no-dynamic-import-path`            |        1 | immich-app/immich                                            |
