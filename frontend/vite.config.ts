/// <reference types="vitest" />
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/utils/**", "src/hooks/**"],
      exclude: [
        "src/hooks/useWebRTC.ts",
        "src/hooks/useContactExchange.ts",
        "src/hooks/useE2EE.ts",
        "src/hooks/usePreferences.ts",
        "src/hooks/useRecording.ts",
        "node_modules/**",
        "src/tests/**",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
