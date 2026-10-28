import { defineConfig } from "vitest/config";
import { transform } from "esbuild";
export default defineConfig({
  plugins: [
    {
      name: "angular-legacy-decorators",
      enforce: "pre",
      async transform(code, id) {
        if (
          !id.replaceAll("\\", "/").includes("/packages/angular/") ||
          !id.endsWith(".ts")
        )
          return undefined;
        return transform(code, {
          loader: "ts",
          target: "es2022",
          sourcefile: id,
          sourcemap: true,
          tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
        });
      },
    },
  ],
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
