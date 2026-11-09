import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockAgent, setGlobalDispatcher } from "undici";

// Ignore inherited personal paths and credentials before any config/auth imports.
// Each worker and Node child owns its directory; per-test overrides remain valid.
const directory = mkdtempSync(join(tmpdir(), "memo-api-test-config-"));
process.env.MEMO_API_CONFIG_PATH = join(directory, "config.json");
delete process.env.MAIMEMO_API_TOKEN;

// Real HTTP is never needed in tests. Suites can install their own MockAgent.
const dispatcher = new MockAgent();
dispatcher.disableNetConnect();
setGlobalDispatcher(dispatcher);

const preload = `--import=${import.meta.url}`;
const previousOptions = process.env.NODE_OPTIONS ?? "";
if (!previousOptions.includes(preload)) {
  process.env.NODE_OPTIONS = `${previousOptions} ${preload}`.trim();
}

process.once("exit", () => {
  rmSync(directory, { recursive: true, force: true });
});
