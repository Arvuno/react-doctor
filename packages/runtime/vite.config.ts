import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: [
    {
      entry: { index: "./src/index.ts" },
      deps: { neverBundle: ["effect", "@react-doctor/core", "@react-doctor/types"] },
      dts: true,
      target: "node22",
      platform: "node",
      fixedExtension: false,
    },
  ],
  test: {
    testTimeout: 30_000,
  },
});
