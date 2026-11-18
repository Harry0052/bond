import { databasePath, getSqlite } from "./client";

getSqlite();
console.log(`Bond database is migrated at ${databasePath()}`);
