import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const fullPath = path.join(rootDir, "src", rel + (rel.endsWith(".ts") || rel.endsWith(".tsx") ? "" : ".ts"));
      return nextResolve(pathToFileURL(fullPath).href, context);
    }
    return nextResolve(specifier, context);
  },
});
