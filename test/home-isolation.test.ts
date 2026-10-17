import { it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

it("test config writes preserve the original home, including in CLI subprocesses", () => {
  const originalHome = mkdtempSync(join(tmpdir(), "memo-api-original-home-"));
  const sentinel = join(originalHome, ".config", "memo-api.json");
  mkdirSync(join(originalHome, ".config"));
  const original = '{"apiToken":"synthetic-original-config"}\n';
  writeFileSync(sentinel, original);
  try {
    const source = `
      import os from 'node:os';
      import { syncBuiltinESMExports } from 'node:module';
      import { readFileSync } from 'node:fs';
      import { execFileSync } from 'node:child_process';
      import assert from 'node:assert/strict';
      os.homedir = () => process.env.MEMO_TEST_ORIGINAL_HOME;
      syncBuiltinESMExports();
      await import('./test/helpers/isolated-home.mjs');
      const { writeConfig, getConfig } = await import('./src/config.ts');
      writeConfig({ apiToken: 'isolated-fixture' });
      assert.equal(getConfig().apiToken, 'isolated-fixture');
      assert.equal(readFileSync(process.env.MEMO_TEST_SENTINEL, 'utf8'), process.env.MEMO_TEST_ORIGINAL);
      const childHome = execFileSync(process.execPath, ['--input-type=module', '-e',
        "import { homedir } from 'node:os'; process.stdout.write(homedir())"], { encoding: 'utf8' });
      assert.notEqual(childHome, process.env.MEMO_TEST_ORIGINAL_HOME);
      assert.notEqual(childHome, os.homedir());
    `;
    execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", source], {
      env: { ...process.env, NODE_OPTIONS: "", MEMO_TEST_ORIGINAL_HOME: originalHome,
        MEMO_TEST_SENTINEL: sentinel, MEMO_TEST_ORIGINAL: original },
      stdio: "pipe",
      timeout: 15000,
    });
    assert.equal(readFileSync(sentinel, "utf8"), original);
  } finally {
    rmSync(originalHome, { recursive: true });
  }
});
