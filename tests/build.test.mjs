import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fixture } from './fixtures.mjs';

const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function runBuild(shell, root, output, environment = process.env) {
    return spawnSync(shell, ['-NoProfile', '-File', path.join(root, 'tools/build.ps1'), '-OutputPath', output], {
        cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true, env: environment
    });
}

for (const shell of ['pwsh', ...(process.platform === 'win32' ? ['powershell.exe'] : [])]) {
    test(`${shell}: archives contain both packs and valid SHA-256; repeated builds replace safely`, (t) => {
        const { root } = fixture(t);
        const output = path.join(root, 'dist with spaces [output]', 'test.mcaddon');
        const first = runBuild(shell, root, output);
        assert.equal(first.status, 0, `${first.error?.message ?? ''}\n${first.stdout}\n${first.stderr}`);
        const originalHash = digest(output);
        assert.equal(readFileSync(`${output}.sha256`, 'utf8'), `${originalHash}  test.mcaddon\n`);
        const inspect = spawnSync(shell, ['-NoProfile', '-Command',
            "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead($env:CANOPY_TEST_ARTIFACT); try { @($zip.Entries | ForEach-Object { $_.FullName }) | ConvertTo-Json -Compress } finally { $zip.Dispose() }"
        ], { encoding: 'utf8', timeout: 15_000, windowsHide: true, env: { ...process.env, CANOPY_TEST_ARTIFACT: output } });
        assert.equal(inspect.status, 0, inspect.stderr);
        const entries = JSON.parse(inspect.stdout.replace(/^\uFEFF/, ''));
        assert.ok(entries.includes('Canopy[BP]/manifest.json'));
        assert.ok(entries.includes('Canopy[RP]/manifest.json'));
        assert.ok(entries.includes('Canopy[RP]/texts/zh_CN.lang'));
        assert.ok(entries.every((entry) => /^(Canopy\[BP\]|Canopy\[RP\])\//.test(entry) && !entry.includes('\\')));
        assert.equal(new Set(entries).size, entries.length);
        const second = runBuild(shell, root, output);
        assert.equal(second.status, 0, second.stderr);
        assert.equal(digest(output), originalHash);
    });
}

test('invalid source preserves the existing archive and checksum and leaves no temporary output', (t) => {
    const { root, write } = fixture(t);
    const output = path.join(root, 'dist', 'test.mcaddon');
    const first = runBuild('pwsh', root, output);
    assert.equal(first.status, 0, first.stderr);
    const originalHash = digest(output);
    const originalChecksum = readFileSync(`${output}.sha256`, 'utf8');
    write('source/Canopy[RP]/texts/zh_CN.lang', 'test.message=你好 %s\ntest.message=重复\n');
    const failed = runBuild('pwsh', root, output);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stdout + failed.stderr, /duplicate language key/);
    assert.equal(digest(output), originalHash);
    assert.equal(readFileSync(`${output}.sha256`, 'utf8'), originalChecksum);
    assert.deepEqual(readdirSync(path.dirname(output)).sort(), ['test.mcaddon', 'test.mcaddon.sha256']);
});

test('build refuses to overwrite source files', (t) => {
    const { root } = fixture(t);
    const output = path.join(root, 'source/Canopy[BP]/test.mcaddon');
    const result = runBuild('pwsh', root, output);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /outside source/);
    assert.equal(existsSync(output), false);
});

test('missing Node.js fails instead of silently omitting validation', (t) => {
    const { root, write } = fixture(t);
    const output = write('dist/test.mcaddon', 'preserved archive');
    const lookup = spawnSync('pwsh', ['-NoProfile', '-Command', '(Get-Process -Id $PID).Path'], {
        encoding: 'utf8', timeout: 15_000, windowsHide: true
    });
    assert.equal(lookup.status, 0, lookup.stderr);
    const shell = lookup.stdout.trim();
    const result = runBuild(shell, root, output, { ...process.env, PATH: path.join(root, 'no-executables') });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(output, 'utf8'), 'preserved archive');
    assert.equal(existsSync(`${output}.sha256`), false);
    assert.match(result.stdout + result.stderr, /node/);
});
