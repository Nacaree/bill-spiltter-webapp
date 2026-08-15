import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src", "tests", "scripts"];
const checkedExtensions = new Set([".js", ".json", ".sql"]);
const problems = [];

async function inspect(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await inspect(child);
    if (!entry.isFile() || !checkedExtensions.has(extname(child))) continue;

    const contents = await readFile(child, "utf8");
    if (!contents.endsWith("\n"))
      problems.push(`${child}: missing final newline`);
    contents.split("\n").forEach((line, index) => {
      if (/\s+$/.test(line))
        problems.push(`${child}:${index + 1}: trailing whitespace`);
    });
  }
}

for (const root of roots) await inspect(root);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Formatting checks passed.");
}
