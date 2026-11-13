
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(currentDirectory, "schema.sql");

export function createDatabase(dbPath = ":memory:") {
  const resolvedPath =
    dbPath === ":memory:" ? dbPath : path.resolve(dbPath);

  if (resolvedPath !== ":memory:") {
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const database = new DatabaseSync(resolvedPath);

  database.exec("PRAGMA foreign_keys = ON");

  const schema = readFileSync(schemaPath, "utf8");
  database.exec(schema);

  return database;
}


