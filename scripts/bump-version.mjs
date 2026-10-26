// Met à jour le paramètre de version (?v=…) de toutes les ressources locales :
// feuilles de style et script d'entrée dans index.html, imports relatifs dans src/.
// Un numéro unique par livraison évite qu'un navigateur mélange fichiers en cache et fichiers neufs.
// Usage : npm run bump
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const version = new Date().toISOString().replace(/\D/g, "").slice(0, 12);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".js") ? [path] : [];
  });
}

const tagVersion = (url) => `${url.replace(/\?v=\d+$/, "")}?v=${version}`;

const rules = [
  // index.html : <link href="styles/….css"> et <script src="src/….js">
  { files: ["index.html"], pattern: /((?:href|src)=")((?:styles|src)\/[^"]+?\.(?:css|js)(?:\?v=\d+)?)(")/g },
  // src/**/*.js : import … from "./….js" ou "../….js"
  { files: walk("src"), pattern: /(from ")(\.\.?\/[^"]+?\.js(?:\?v=\d+)?)(")/g }
];

let count = 0;
for (const { files, pattern } of rules) {
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = before.replace(pattern, (_, start, url, end) => {
      count += 1;
      return `${start}${tagVersion(url)}${end}`;
    });
    if (after !== before) writeFileSync(file, after);
  }
}
console.log(`version ${version} : ${count} références mises à jour`);
