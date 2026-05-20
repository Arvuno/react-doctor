// Directory names that mark a file as part of a test / fixture /
// Storybook / Cypress / example surface, regardless of the file's own suffix.
const NON_PRODUCTION_PATH_SEGMENTS: ReadonlyArray<string> = [
  "/test/",
  "/tests/",
  "/__tests__/",
  "/__test__/",
  "/__fixtures__/",
  "/fixtures/",
  "/__mocks__/",
  "/mocks/",
  "/cypress/",
  "/.storybook/",
  "/stories/",
  "/__stories__/",
  "/playground/",
  "/playgrounds/",
  "/examples/",
  "/example/",
  "/demo/",
  "/demos/",
  "/sandbox/",
  "/sandboxes/",
  "/e2e/",
  "/e2e-tests/",
  "/specs/",
  "/spec/",
  "/integration-tests/",
  "/integration/",
  "/it/",
  "/benchmarks/",
  "/benchmark/",
  "/__benchmarks__/",
  "/perf/",
  "/perf-tests/",
  // CLI / one-shot / build-time tooling — never shipped in the
  // user-facing bundle, no render-perf or React-rule concerns. Captures
  // top-level `scripts/`, `cli/`, `bin/`, `tooling/`, `tools/`,
  // `codemods/`, `migrations/`, `generators/`, `runbooks/`, etc. as well
  // as `src/scripts/...` shaped layouts.
  "/scripts/",
  "/cli/",
  "/bin/",
  "/tooling/",
  "/tools/",
  "/codemods/",
  "/codemod/",
  "/migrations/",
  "/migration/",
  "/generators/",
  "/generator/",
  "/runbooks/",
  "/devtools/",
  "/internal-tools/",
  "/seeds/",
  "/seed/",
  "/dev-seeder/",
];

// True iff `filename` looks like test / spec / Storybook / Cypress /
// benchmark / e2e code — by suffix (`.test.tsx`, `.spec.ts`, `.cy.tsx`,
// `.stories.tsx`, `.bench.ts`, `.e2e.ts`, `.story.ts`) or by sitting
// inside a recognized test/fixture directory. Used by rules whose
// findings are unactionable in non-production code (a11y rules, perf
// rules, Fast-Refresh-only-export rules) to skip those files entirely
// without forcing users to maintain explicit ignore lists.
const NON_PRODUCTION_FILENAME_SUFFIXES: ReadonlyArray<string> = [
  ".test.",
  ".spec.",
  ".cy.",
  ".stories.",
  ".story.",
  ".bench.",
  ".benchmark.",
  ".e2e.",
  ".integration-spec.",
  ".int-spec.",
  ".mock.",
  ".fixture.",
];

// Filenames that are conventionally test bootstrap files — set up
// global polyfills, mock factories, vitest/jest configuration, etc.
// These run only in the test runner, never in the production bundle.
const NON_PRODUCTION_BASENAMES: ReadonlySet<string> = new Set([
  "setuptests.js",
  "setuptests.ts",
  "setuptests.jsx",
  "setuptests.tsx",
  "vitest.setup.js",
  "vitest.setup.ts",
  "vitest.setup.mjs",
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mts",
  "vitest.config.mjs",
  "jest.setup.js",
  "jest.setup.ts",
  "jest.setup.jsx",
  "jest.setup.tsx",
  "jest.config.js",
  "jest.config.ts",
  "jest.config.mjs",
  "playwright.config.ts",
  "playwright.config.js",
  "cypress.config.ts",
  "cypress.config.js",
  "karma.conf.js",
  "karma.conf.ts",
  // Build / framework config files
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "vite.config.mjs",
  "webpack.config.ts",
  "webpack.config.js",
  "webpack.config.mjs",
  "rollup.config.ts",
  "rollup.config.js",
  "rollup.config.mjs",
  "esbuild.config.ts",
  "esbuild.config.js",
  "esbuild.config.mjs",
  "tsup.config.ts",
  "tsup.config.js",
  "tsup.config.mjs",
  "rsbuild.config.ts",
  "rsbuild.config.js",
  "rspack.config.ts",
  "rspack.config.js",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "remix.config.js",
  "remix.config.ts",
  "astro.config.ts",
  "astro.config.js",
  "astro.config.mjs",
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "postcss.config.ts",
  "postcss.config.js",
  "postcss.config.mjs",
  "biome.config.ts",
  "biome.config.js",
  "drizzle.config.ts",
  "drizzle.config.js",
  "prisma.config.ts",
  "prisma.config.js",
  "knip.config.ts",
  "knip.config.js",
  "knip.config.mjs",
  "lint-staged.config.js",
  "lint-staged.config.mjs",
]);

export const isTestlikeFilename = (filename: string | undefined): boolean => {
  if (!filename) return false;
  const lastSlash = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  const basename = lastSlash === -1 ? filename : filename.slice(lastSlash + 1);
  if (NON_PRODUCTION_BASENAMES.has(basename.toLowerCase())) return true;
  for (const suffix of NON_PRODUCTION_FILENAME_SUFFIXES) {
    if (filename.includes(suffix)) return true;
  }
  for (const segment of NON_PRODUCTION_PATH_SEGMENTS) {
    if (filename.includes(segment)) return true;
  }
  return false;
};
