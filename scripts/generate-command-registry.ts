import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const commandsDir = join(scriptDir, "..", "lib", "commands");
const generatedPath = join(commandsDir, "generated.ts");
const ignoredFiles = new Set(["generated.ts", "response.ts"]);

const files = await commandFiles(commandsDir);
const modules = await Promise.all(files.map(commandModule));

const importLines = modules.map(
  (module) => `import { ${module.name} } from "${module.importPath}";`,
);

const output = `${importLines.join("\n")}
import type { CommandRegistration } from "../engine";

export const commandActions = [
${modules.map((module) => `  { route: "${module.route}", Action: ${module.name} },`).join("\n")}
] satisfies CommandRegistration[];
`;

await writeFile(generatedPath, output);

async function commandFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return commandFiles(path);
      if (!entry.isFile() || ignoredFiles.has(entry.name) || !entry.name.endsWith(".ts")) return [];
      return [path];
    }),
  );
  return nested.flat().sort();
}

async function commandModule(path: string) {
  const source = await readFile(path, "utf8");
  const className = path.split(sep).at(-1)?.replace(/\.ts$/, "");

  if (!className || !source.includes(`export class ${className}`)) {
    throw new Error(`${relative(commandsDir, path)} must export class ${className}.`);
  }

  const importPath = `./${relative(commandsDir, path).replace(/\.ts$/, "").split(sep).join("/")}`;
  return { name: className, importPath, route: routeFor(path, className) };
}

function routeFor(path: string, className: string): string {
  const parts = relative(commandsDir, path).replace(/\.ts$/, "").split(sep);
  const group = parts.at(-2);
  const action = firstWord(className);

  if (!group || !action) {
    throw new Error(`${relative(commandsDir, path)} cannot be mapped to a command route.`);
  }

  if (group === action) return group;
  return `${group}.${action}`;
}

function firstWord(value: string): string {
  const match = value.match(/^[A-Z]?[a-z]+|^[A-Z]+(?![a-z])/);
  return match?.[0].toLowerCase() ?? "";
}
