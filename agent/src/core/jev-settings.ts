import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Reference shared credentials without importing another lane's character, paths or game endpoint. */
export function sharedJevSettings(path: string): Record<string, string> {
  const parsed = parseEnv(readFileSync(path, "utf8"));
  return Object.fromEntries(["TYPESAFE_API_KEY", "TYPESAFE_BASE_URL", "JEV_MODEL"]
    .filter((key) => parsed[key] !== undefined).map((key) => [key, parsed[key]!]));
}
