import { defineConfig } from "tsup";
import { mkdirSync, existsSync, cpSync } from "fs";
import { dirname, resolve } from "path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node14",
  clean: true,
  shims: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node"
  },
  onSuccess: async () => {
    // Ensure template directory is copied to dist folder
    const templateSrc = resolve(__dirname, "template");
    const templateDest = resolve(__dirname, "dist", "template");

    if (existsSync(templateSrc)) {
      console.log("Copying template directory...");

      // Make sure the destination directory exists
      if (!existsSync(dirname(templateDest))) {
        mkdirSync(dirname(templateDest), { recursive: true });
      }

      try {
        cpSync(templateSrc, templateDest, { recursive: true });
        console.log("Template directory copied successfully!");
      } catch (error) {
        console.error("Error copying template directory:", error);
      }
    } else {
      console.warn("Warning: template directory not found at", templateSrc);
    }

    // Fix permissions for executable
    try {
      const executable = resolve(__dirname, "dist", "index.js");
      console.log("Setting executable permissions on", executable);
      // Make the file executable
      const fs = await import("fs");
      fs.chmodSync(executable, "755");
    } catch (error) {
      console.error("Error setting executable permissions:", error);
    }
  }
});
