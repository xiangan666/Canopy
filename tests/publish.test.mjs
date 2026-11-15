import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fixture } from './fixtures.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function releaseFixture(t, overrides = {}) {
    const result = fixture(t);
    const { root, write } = result;
    cpSync(path.join(projectRoot, 'tools/publish.ps1'), path.join(root, 'tools/publish.ps1'));
    const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    write('CHANGELOG.md', `## [${version}] - 2026-01-01\n\n### Fixed\n\n- Fixture release.\n`);
    const state = write('control/state.json', JSON.stringify({
        exists: false, draft: true, published_at: null, assets: [], lookupError: false, corruptDownloads: false, ...overrides
    }));
    const store = path.join(root, 'control/assets');
    mkdirSync(store);
    const calls = write('control/calls.jsonl', '');
    const run = () => spawnSync('pwsh', ['-NoProfile', '-File', path.join(projectRoot, 'tests/helpers/publish-harness.ps1'), '-ProjectRoot', root], {
        cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true,
        env: { ...process.env, CANOPY_TEST_RELEASE_STATE: state, CANOPY_TEST_RELEASE_STORE: store, CANOPY_TEST_RELEASE_CALLS: calls }
    });
    return {
        ...result, run,
        state: () => JSON.parse(readFileSync(state, 'utf8')),
        calls: () => readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
    };
}

test('publisher finds hidden drafts, verifies assets before and after publication, and reruns without overwriting', (t) => {
    const release = releaseFixture(t);
    const first = release.run();
    assert.equal(first.status, 0, `${first.error?.message ?? ''}\n${first.stdout}\n${first.stderr}`);
    assert.match(first.stdout, /Published https:\/\/example.invalid\/release/);
    assert.equal(release.state().draft, false);
    assert.equal(release.state().assets.length, 3);
    const calls = release.calls();
    assert.equal(calls.filter((call) => call[0] === 'release' && call[1] === 'create').length, 1);
    const publish = calls.findIndex((call) => call.includes('--draft=false'));
    const downloads = calls.map((call, index) => call[1] === 'download' ? index : -1).filter((index) => index >= 0);
    assert.equal(downloads.length, 2);
    assert.ok(downloads[0] < publish && publish < downloads[1]);

    const repeated = release.run();
    assert.equal(repeated.status, 0, `${repeated.stdout}\n${repeated.stderr}`);
    const rerunCalls = release.calls().slice(calls.length);
    assert.ok(!rerunCalls.some((call) => ['create', 'upload', 'edit'].includes(call[1])));
    assert.equal(rerunCalls.filter((call) => call[1] === 'download').length, 1);
});

test('publisher resumes an existing draft instead of creating another release', (t) => {
    const release = releaseFixture(t, { exists: true });
    const result = release.run();
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(release.state().draft, false);
    assert.ok(!release.calls().some((call) => call[1] === 'create'));
    assert.equal(release.state().assets.length, 3);
});

test('publisher propagates lookup failures instead of treating them as an absent release', (t) => {
    const release = releaseFixture(t, { lookupError: true });
    const result = release.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /Cannot inspect release.*503/);
    assert.ok(!release.calls().some((call) => ['create', 'upload', 'edit'].includes(call[1])));
});

test('publisher leaves the release as a draft when downloaded bytes do not match', (t) => {
    const release = releaseFixture(t, { corruptDownloads: true });
    const result = release.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /size or SHA-256 mismatch/);
    assert.equal(release.state().draft, true);
    assert.equal(release.state().published_at, null);
    assert.ok(!release.calls().some((call) => call.includes('--draft=false')));
});
