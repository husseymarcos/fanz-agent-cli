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
  (module) => `import * as ${module.name} from "${module.importPath}";`,
);

const output = `${importLines.join("\n")}

export type CommandModule = {
  route: string;
  [exportName: string]: unknown;
};

export const commandModules: CommandModule[] = [
${modules.map((module) => `  ${module.name},`).join("\n")}
];
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

  if (!source.includes("export const route")) {
    throw new Error(`${relative(commandsDir, path)} must export const route.`);
  }

  const importPath = `./${relative(commandsDir, path).replace(/\.ts$/, "").split(sep).join("/")}`;
  return { name: className, importPath };
}
