import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { parseLang, validateImports, validateLanguages, validateManifests, versionTuple } from '../tools/validate.mjs';
import { fixture, temporaryProject } from './fixtures.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function manifests() {
    return ['Canopy[BP]', 'Canopy[RP]'].map((name) => JSON.parse(readFileSync(path.join(projectRoot, 'source', name, 'manifest.json'), 'utf8')));
}

test('stable versions map to Bedrock tuples and reject invalid or oversized components', () => {
    assert.deepEqual(versionTuple('1.6.4'), [1, 6, 4]);
    assert.deepEqual(versionTuple('0.0.0'), [0, 0, 0]);
    for (const value of ['01.6.4', '1.6', '1.6.4-beta.1', '1.6.4+build', '1.-1.0', '65536.0.0', null]) {
        assert.throws(() => versionTuple(value), /version|Version/);
    }
});

test('pack manifests reject UUID collisions across headers and modules', () => {
    const values = manifests();
    values[1].modules[0].uuid = values[0].header.uuid.toUpperCase();
    assert.throws(() => validateManifests(values, values[0].header.version.join('.')), /duplicate UUID/);
});

test('pack manifests reject a stale peer version', () => {
    const values = manifests();
    values[0].dependencies.find((dependency) => dependency.uuid).version = [0, 0, 0];
    assert.throws(() => validateManifests(values, values[0].header.version.join('.')), /peer pack dependency/);
});

test('pack manifests require the declared JavaScript entry point', () => {
    const values = manifests();
    values[0].modules.find((module) => module.type === 'script').entry = 'missing.js';
    assert.throws(() => validateManifests(values, values[0].header.version.join('.')), /entry point/);
});

test('language parsing preserves values containing equals, comments and CRLF', () => {
    const entries = parseLang('\uFEFF## comment\r\n test.key =a=b %1\r\nOther=Two\r\n');
    assert.equal(entries.get('test.key'), 'a=b %1');
    assert.equal(entries.get('Other'), 'Two');
    assert.throws(() => parseLang('key=first\nkey=second\n'), /duplicate language key/);
    assert.throws(() => parseLang('malformed\n'), /expected key=value/);
});

test('language keys remain case sensitive', () => {
    assert.equal(parseLang('Key=first\nkey=second\n').size, 2);
});

test('Chinese coverage includes keys introduced by any supported language', (t) => {
    const { root, write } = temporaryProject(t);
    write('en_US.lang', 'existing=Hello\n');
    write('zh_CN.lang', 'existing=你好\n');
    write('de_DE.lang', 'additional=Neu\n');
    write('languages.json', '["en_US","zh_CN","de_DE"]');
    assert.throws(() => validateLanguages(root), /missing 1 keys: additional/);
});

test('Chinese placeholders retain their multiplicity while numbered arguments may reorder', (t) => {
    const { root, write } = temporaryProject(t);
    write('languages.json', '["en_US","zh_CN"]');
    write('en_US.lang', 'key=%1 %2 %s %s\n');
    write('zh_CN.lang', 'key=%2 %1 %s\n');
    assert.throws(() => validateLanguages(root), /placeholder mismatch/);
    write('zh_CN.lang', 'key=%2 %1 %s %s\n');
    assert.deepEqual(validateLanguages(root), { languages: 2, chineseKeys: 1 });
});

test('language declarations must match actual files without duplicates', (t) => {
    const { root, write } = temporaryProject(t);
    write('languages.json', '["en_US","zh_CN","zh_CN"]');
    write('en_US.lang', 'key=Hello\n');
    write('zh_CN.lang', 'key=你好\n');
    assert.throws(() => validateLanguages(root), /exactly once/);
});

test('imports support Bedrock root paths, dotted file names and explicit .js extensions', (t) => {
    const { root, write } = temporaryProject(t);
    const target = write('lib/extension.ipc.js', 'export const value = 1;\n');
    const main = write('main.js', "import './lib/extension.ipc';\nimport './lib/extension.ipc.js';\nimport 'lib/extension.ipc';\nimport { world } from '@minecraft/server';\n");
    assert.equal(validateImports([main, target], root, new Set(['@minecraft/server'])), 4);
});

test('imports reject path case mismatches even on Windows', (t) => {
    const { root, write } = temporaryProject(t);
    const target = write('Target.js', 'export const value = 1;\n');
    const main = write('main.js', "import './target';\n");
    assert.throws(() => validateImports([main, target], root, new Set()), /incorrect path case/);
});

test('imports reject absent files and undeclared game modules', (t) => {
    const { root, write } = temporaryProject(t);
    const main = write('main.js', "import './missing';\n");
    assert.throws(() => validateImports([main], root, new Set()), /missing import/);
    write('main.js', "import { world } from '@minecraft/server';\n");
    assert.throws(() => validateImports([main], root, new Set()), /undeclared scripting dependency/);
});

test('version synchronization updates all displayed and peer versions without changing UUIDs', (t) => {
    const { root, write } = fixture(t);
    const before = ['Canopy[BP]', 'Canopy[RP]'].map((name) => JSON.parse(readFileSync(path.join(root, 'source', name, 'manifest.json'), 'utf8')));
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    packageJson.version = '2.3.4';
    write('package.json', JSON.stringify(packageJson));
    const result = spawnSync(process.execPath, [path.join(root, 'tools/sync-version.mjs')], { encoding: 'utf8', timeout: 15_000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    for (const [index, name] of ['Canopy[BP]', 'Canopy[RP]'].entries()) {
        const after = JSON.parse(readFileSync(path.join(root, 'source', name, 'manifest.json'), 'utf8'));
        assert.equal(after.header.uuid, before[index].header.uuid);
        assert.deepEqual(after.modules.map((module) => module.uuid), before[index].modules.map((module) => module.uuid));
        assert.deepEqual(after.header.version, [2, 3, 4]);
        assert.deepEqual(after.dependencies.find((dependency) => dependency.uuid).version, [2, 3, 4]);
        assert.match(after.header.name, /v2\.3\.4/);
    }
    assert.match(readFileSync(path.join(root, 'source/Canopy[BP]/scripts/constants.js'), 'utf8'), /PACK_VERSION = '2\.3\.4'/);
    assert.ok(existsSync(path.join(root, 'package-lock.json')));
});
