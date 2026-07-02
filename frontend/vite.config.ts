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
        // Impractical to unit test: real WebRTC/MediaRecorder/WebCrypto session
        // state that would require mocking the entire browser media stack for
        // negligible verification value. Exercised instead via manual/e2e testing.
        "src/hooks/media/useWebRTC.ts",
        "src/hooks/media/useE2EE.ts",
        "src/hooks/media/useRecording.ts",
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
