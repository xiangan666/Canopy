import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function temporaryProject(t) {
    const root = mkdtempSync(path.join(os.tmpdir(), 'canopy-tests-中文 [pack] '));
    t.after(() => {
        const resolved = path.resolve(root);
        if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('canopy-tests-')) {
            throw new Error('Refusing to remove a path outside this test fixture.');
        }
        rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });
    const write = (name, content) => {
        const target = path.join(root, name);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, content);
        return target;
    };
    return { root, write };
}

export function fixture(t) {
    const result = temporaryProject(t);
    const { root, write } = result;
    for (const file of ['package.json', 'package-lock.json', 'tools/build.ps1', 'tools/validate.mjs', 'tools/sync-version.mjs']) {
        const target = path.join(root, file);
        mkdirSync(path.dirname(target), { recursive: true });
        cpSync(path.join(projectRoot, file), target);
    }
    for (const name of ['Canopy[BP]', 'Canopy[RP]']) {
        for (const file of ['manifest.json', 'LICENSE', 'pack_icon.png']) {
            const target = path.join(root, 'source', name, file);
            mkdirSync(path.dirname(target), { recursive: true });
            cpSync(path.join(projectRoot, 'source', name, file), target);
        }
    }
    const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    write('source/Canopy[BP]/scripts/constants.js', `const PACK_VERSION = '${version}';\nexport { PACK_VERSION };\n`);
    write('source/Canopy[BP]/scripts/main.js', "import { PACK_VERSION } from './constants';\nconsole.log(PACK_VERSION);\n");
    write('source/Canopy[BP]/scripts/lib/jsep/LICENSE', 'Fixture license\n');
    write('source/Canopy[RP]/texts/languages.json', '["en_US","zh_CN"]\n');
    write('source/Canopy[RP]/texts/en_US.lang', 'test.message=Hello %s\n');
    write('source/Canopy[RP]/texts/zh_CN.lang', 'test.message=你好 %s\n');
    return result;
}
