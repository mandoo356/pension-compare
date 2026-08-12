import { readFile, stat } from "node:fs/promises";

const html = await readFile(new URL("../github-pages/index.html", import.meta.url), "utf8");
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

if (duplicates.length) {
  throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(", ")}`);
}

const dataUrl = new URL("../github-pages/data/pensions.json", import.meta.url);
const data = JSON.parse(await readFile(dataUrl, "utf8"));

if (!data.savings?.length || !data.retirement?.length) {
  throw new Error("Pension disclosure data is empty");
}

const dataSize = (await stat(dataUrl)).size;
console.log(JSON.stringify({
  htmlIds: ids.length,
  savings: data.savings.length,
  retirement: data.retirement.length,
  dataMB: (dataSize / 1024 / 1024).toFixed(2),
}));
