import * as path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        "mysql://test:test@localhost:3307/t3-app-nextjs-testcontainers",
    },
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
