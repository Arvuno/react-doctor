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

export const isTestlikeFilename = (filename: string | undefined): boolean => {
  if (!filename) return false;
  for (const suffix of NON_PRODUCTION_FILENAME_SUFFIXES) {
    if (filename.includes(suffix)) return true;
  }
  for (const segment of NON_PRODUCTION_PATH_SEGMENTS) {
    if (filename.includes(segment)) return true;
  }
  return false;
};
