import os from "node:os";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { syncBuiltinESMExports } from "node:module";

// Run before importing config/auth: config.ts resolves homedir at module load.
// Each test worker and spawned Node CLI receives its own disposable directory.
const testHome = mkdtempSync(join(os.tmpdir(), "memo-api-test-"));
mkdirSync(join(testHome, ".config"));
const originalHomedir = os.homedir;
os.homedir = () => testHome;
syncBuiltinESMExports();

const preload = `--import=${import.meta.url}`;
const previousOptions = process.env.NODE_OPTIONS ?? "";
if (!previousOptions.includes(preload)) {
  process.env.NODE_OPTIONS = `${previousOptions} ${preload}`.trim();
}

process.once("exit", () => {
  os.homedir = originalHomedir;
  syncBuiltinESMExports();
  rmSync(testHome, { recursive: true, force: true });
});
