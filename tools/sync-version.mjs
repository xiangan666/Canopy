import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Bedrock pack versions require a stable X.Y.Z version.');
}
const tuple = version.split('.').map(Number);
if (tuple.some((part) => !Number.isSafeInteger(part) || part > 65535)) {
    throw new Error('Each version component must be an integer between 0 and 65535.');
}

function replaceFile(relativePath, transform) {
    const target = path.join(root, relativePath);
    const original = readFileSync(target, 'utf8');
    const updated = transform(original);
    if (updated !== original) {
        const temporary = `${target}.${process.pid}.tmp`;
        writeFileSync(temporary, updated);
        renameSync(temporary, target);
    }
}

for (const pack of ['Canopy[BP]', 'Canopy[RP]']) {
    replaceFile(`source/${pack}/manifest.json`, (original) => {
        const manifest = JSON.parse(original);
        manifest.header.version = tuple;
        manifest.header.name = manifest.header.name.replace(/v\d+\.\d+\.\d+/, `v${version}`);
        for (const dependency of manifest.dependencies ?? []) {
            if (dependency.uuid) dependency.version = tuple;
        }
        // Preserve the existing indentation convention in each manifest.
        return `${JSON.stringify(manifest, null, pack === 'Canopy[BP]' ? '\t' : 2)}\n`;
    });
}
replaceFile('source/Canopy[BP]/scripts/constants.js', (original) => {
    if (!/const PACK_VERSION = '[^']+';/.test(original)) {
        throw new Error('Cannot locate PACK_VERSION in constants.js.');
    }
    return original.replace(/const PACK_VERSION = '[^']+';/, `const PACK_VERSION = '${version}';`);
});
console.log(`Synchronized pack headers, pack dependencies and PACK_VERSION to ${version}.`);
