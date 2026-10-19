/** Explicit offline read-only query; does not add tools or context to a running game. */
import { KNOWLEDGE_DIR } from "../src/core/paths.js";
import { queryKnowledgeCatalog, type CatalogQuery } from "../src/knowledge/catalog.js";

const args = process.argv.slice(2);
const options: CatalogQuery = {};
let directory = KNOWLEDGE_DIR;
for (let i = 0; i < args.length; i += 1) {
  const key = args[i]!;
  if (key === "--details") { options.details = true; continue; }
  const value = args[++i];
  if (value === undefined) throw new Error("缺少查询参数值");
  if (key === "--knowledge-root") directory = value;
  else if (key === "--character") options.character = value;
  else if (key === "--source-character") options.sourceCharacter = value;
  else if (key === "--keyword") options.keyword = value;
  else if (key === "--id") options.id = value;
  else if (key === "--file") options.file = value;
  else if (key === "--pointer") options.pointer = value;
  else if (key === "--limit") options.limit = Number(value);
  else throw new Error("未知知识查询参数：" + key);
}
process.stdout.write(JSON.stringify(queryKnowledgeCatalog(directory, options), null, 2) + "\n");
