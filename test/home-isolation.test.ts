import { it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

it("test config isolation protects inherited credentials in parent and CLI children", () => {
  const home = mkdtempSync(join(tmpdir(), "memo-api-original-home-"));
  const sentinel = join(home, ".config", "memo-api.json");
  mkdirSync(join(home, ".config"));
  const original = '{"apiToken":"synthetic-original-config"}\n';
  writeFileSync(sentinel, original);
  const env = { ...process.env, NODE_OPTIONS: "", HOME: home, USERPROFILE: home,
    MEMO_API_CONFIG_PATH: sentinel, MAIMEMO_API_TOKEN: "synthetic-inherited-token" };
  const probe = `
    const { default: assert } = await import('node:assert/strict');
    const { default: fs } = await import('node:fs');
    const { syncBuiltinESMExports } = await import('node:module');
    const forbidden = process.env.MEMO_TEST_SENTINEL;
    let reads = 0;
    const read = fs.readFileSync;
    fs.readFileSync = function(path, ...args) {
      if (String(path) === forbidden) { reads++; throw new Error('inherited config read'); }
      return read.call(this, path, ...args);
    };
    syncBuiltinESMExports();
    await import('./test/helpers/isolated-config.mjs');
    const { getConfigPath, getConfig, writeConfig } = await import('./dist/config.js');
    assert.notEqual(getConfigPath(), forbidden);
    assert.equal(process.env.MAIMEMO_API_TOKEN, undefined);
    assert.deepEqual(getConfig(), {});
    assert.equal(reads, 0);
    writeConfig({ apiToken: 'isolated-fixture' });
    assert.equal(getConfig().apiToken, 'isolated-fixture');
    assert.equal(reads, 0);
    process.stdout.write(getConfigPath());
  `;
  try {
    const source = `
      import { execFileSync } from 'node:child_process';
      import assert from 'node:assert/strict';
      import { existsSync } from 'node:fs';
      import { dirname } from 'node:path';
      const parentPath = await (async () => { ${probe.replace("process.stdout.write(getConfigPath());", "return getConfigPath();")} })();
      const childPath = execFileSync(process.execPath, ['--input-type=module', '-e', ${JSON.stringify(probe)}], {
        env: { ...process.env, MEMO_API_CONFIG_PATH: process.env.MEMO_TEST_SENTINEL,
          MAIMEMO_API_TOKEN: 'synthetic-child-inherited-token' }, encoding: 'utf8' });
      assert.notEqual(childPath, parentPath);
      assert.equal(existsSync(dirname(childPath)), false);
      let rejected = false;
      try {
        execFileSync(process.execPath, ['dist/index.js', 'voc', 'get', '-s', 'synthetic-test'], {
          env: { ...process.env, MEMO_API_CONFIG_PATH: process.env.MEMO_TEST_SENTINEL,
            MAIMEMO_API_TOKEN: 'synthetic-child-inherited-token' }, stdio: 'pipe', timeout: 5000 });
      } catch (error) {
        rejected = true;
        assert.equal(error.status, 1);
        assert.match(error.stderr.toString(), /缺少 API Token/);
      }
      assert.equal(rejected, true);

    `;
    execFileSync(process.execPath, ["--input-type=module", "-e", source], {
      env: { ...env, MEMO_TEST_SENTINEL: sentinel }, stdio: "pipe", timeout: 15000,
    });
    assert.equal(readFileSync(sentinel, "utf8"), original);
    // Without test preloading, production still honors explicit and default config paths.
    for (const override of [sentinel, ""]) {
      execFileSync(process.execPath, ["--input-type=module", "-e", `
        import assert from 'node:assert/strict';
        const { getConfigPath, getConfig } = await import('./dist/config.js');
        assert.equal(getConfigPath(), ${JSON.stringify(sentinel)});
        assert.equal(getConfig().apiToken, 'synthetic-original-config');
      `], { env: { ...env, MEMO_API_CONFIG_PATH: override }, stdio: "pipe", timeout: 5000 });
    }
    assert.equal(readFileSync(sentinel, "utf8"), original);
  } finally {
    rmSync(home, { recursive: true });
  }
});
