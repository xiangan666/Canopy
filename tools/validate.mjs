import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packNames = ['Canopy[BP]', 'Canopy[RP]'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function versionTuple(version) {
    if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        throw new Error(`Invalid stable package version: ${version}`);
    }
    const tuple = version.split('.').map(Number);
    if (tuple.some((part) => !Number.isSafeInteger(part) || part > 65535)) {
        throw new Error('Version components must be integers between 0 and 65535.');
    }
    return tuple;
}

function sameTuple(left, right) {
    return Array.isArray(left) && left.length === 3 && left.every((value, index) => value === right[index]);
}

function collectFiles(root) {
    const files = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        const fullPath = path.join(root, entry.name);
        if (lstatSync(fullPath).isSymbolicLink()) throw new Error(`Symbolic links are not packaged: ${fullPath}`);
        if (entry.isDirectory()) files.push(...collectFiles(fullPath));
        else if (entry.isFile()) files.push(fullPath);
        else throw new Error(`Unsupported file type: ${fullPath}`);
    }
    return files.sort();
}

export function validateManifests(manifests, version) {
    const expected = versionTuple(version);
    const uuids = new Set();
    for (const [index, manifest] of manifests.entries()) {
        const label = packNames[index];
        if (manifest.format_version !== 2 || !manifest.header || !Array.isArray(manifest.modules) || manifest.modules.length === 0) {
            throw new Error(`${label}: a format 2 manifest with a header and modules is required.`);
        }
        if (!sameTuple(manifest.header.version, expected) || !manifest.header.name?.includes(`v${version}`)) {
            throw new Error(`${label}: header version/name differs from package.json (${version}). Run npm run version.`);
        }
        const engine = manifest.header.min_engine_version;
        if (!Array.isArray(engine) || engine.length !== 3 || engine.some((part) => !Number.isInteger(part) || part < 0)) {
            throw new Error(`${label}: invalid min_engine_version.`);
        }
        for (const component of [manifest.header, ...manifest.modules]) {
            if (!uuidPattern.test(component.uuid) || uuids.has(component.uuid.toLowerCase())) {
                throw new Error(`${label}: invalid or duplicate UUID: ${component.uuid}`);
            }
            uuids.add(component.uuid.toLowerCase());
            if (!Array.isArray(component.version) || component.version.length !== 3 || component.version.some((part) => !Number.isInteger(part) || part < 0)) {
                throw new Error(`${label}: invalid module/header version.`);
            }
        }
        const peer = manifests[1 - index];
        const dependency = manifest.dependencies?.find((item) => item.uuid === peer.header.uuid);
        if (!dependency || !sameTuple(dependency.version, expected)) {
            throw new Error(`${label}: missing or mismatched peer pack dependency.`);
        }
        for (const item of manifest.dependencies ?? []) {
            if (item.uuid && item.uuid !== peer.header.uuid) throw new Error(`${label}: unknown pack dependency: ${item.uuid}`);
            if (item.module_name && (typeof item.version !== 'string' || item.version.length === 0)) {
                throw new Error(`${label}: scripting dependency needs an exact version: ${item.module_name}`);
            }
        }
    }
    if (!sameTuple(manifests[0].header.min_engine_version, manifests[1].header.min_engine_version)) {
        throw new Error('Both packs must declare the same minimum engine version.');
    }
    if (!manifests[0].modules.some((module) => module.type === 'script' && module.language === 'javascript' && module.entry === 'scripts/main.js')) {
        throw new Error('Behavior pack must declare scripts/main.js as its JavaScript entry point.');
    }
    if (!manifests[1].modules.some((module) => module.type === 'resources')) {
        throw new Error('Resource pack must declare a resources module.');
    }
}

export function parseLang(content, label = 'language file') {
    const entries = new Map();
    for (const [index, line] of content.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
        if (!line.trim() || line.trimStart().startsWith('#')) continue;
        const separator = line.indexOf('=');
        if (separator < 1) throw new Error(`${label}:${index + 1}: expected key=value.`);
        const key = line.slice(0, separator).trim();
        if (entries.has(key)) throw new Error(`${label}:${index + 1}: duplicate language key: ${key}`);
        entries.set(key, line.slice(separator + 1));
    }
    return entries;
}

function placeholders(value) {
    return (value.match(/%(?:[1-9]\d*|[sdf])/g) ?? []).sort().join(',');
}

export function validateLanguages(languageRoot) {
    const names = readdirSync(languageRoot).filter((name) => name.endsWith('.lang')).sort();
    const languages = new Map(names.map((name) => [name.slice(0, -5), parseLang(readFileSync(path.join(languageRoot, name), 'utf8'), name)]));
    const declared = JSON.parse(readFileSync(path.join(languageRoot, 'languages.json'), 'utf8'));
    if (!Array.isArray(declared) || new Set(declared).size !== declared.length ||
        [...declared].sort().join(',') !== [...languages.keys()].sort().join(',')) {
        throw new Error('languages.json must list each existing language exactly once.');
    }
    const chinese = languages.get('zh_CN');
    const english = languages.get('en_US');
    if (!chinese || !english) throw new Error('Both zh_CN.lang and en_US.lang are required.');
    const allKeys = new Set([...languages.values()].flatMap((entries) => [...entries.keys()]));
    const missing = [...allKeys].filter((key) => !chinese.has(key));
    if (missing.length) throw new Error(`zh_CN.lang is missing ${missing.length} keys: ${missing.join(', ')}`);
    for (const [key, value] of english) {
        if (placeholders(value) !== placeholders(chinese.get(key))) {
            throw new Error(`zh_CN.lang: placeholder mismatch for ${key}`);
        }
    }
    return { languages: languages.size, chineseKeys: chinese.size };
}

export function validateImports(scriptFiles, scriptsRoot, dependencies) {
    const normalize = (file) => path.relative(scriptsRoot, file).split(path.sep).join('/');
    const knownFiles = new Set(scriptFiles.map(normalize));
    let importCount = 0;
    for (const file of scriptFiles) {
        const source = readFileSync(file, 'utf8');
        const imports = [
            ...source.matchAll(/^\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s+)?["']([^"']+)["']/gm),
            ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)
        ];
        for (const [, specifier] of imports) {
            importCount++;
            if (specifier.startsWith('.')) {
                const resolved = path.resolve(path.dirname(file), specifier);
                const target = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
                if (!knownFiles.has(normalize(target))) {
                    throw new Error(`${normalize(file)}: missing import or incorrect path case: ${specifier}`);
                }
            } else if (!knownFiles.has(specifier.endsWith('.js') ? specifier : `${specifier}.js`) && !dependencies.has(specifier)) {
                throw new Error(`${normalize(file)}: undeclared scripting dependency: ${specifier}`);
            }
        }
    }
    return importCount;
}

function validateMarkdown(root) {
    const files = [...readdirSync(root).filter((name) => name.endsWith('.md')).map((name) => path.join(root, name))];
    if (existsSync(path.join(root, 'docs'))) files.push(...collectFiles(path.join(root, 'docs')).filter((name) => name.endsWith('.md')));
    for (const file of files) {
        for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(([^\s)]+)\)/g)) {
            if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) continue;
            const local = decodeURIComponent(target.split('#')[0]);
            if (!existsSync(path.resolve(path.dirname(file), local))) {
                throw new Error(`${path.relative(root, file)}: broken local Markdown link: ${target}`);
            }
        }
    }
}

export function validateProject(root) {
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    versionTuple(packageJson.version);
    const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    if (lock.version !== packageJson.version || lock.packages?.['']?.version !== packageJson.version) {
        throw new Error('package-lock.json version differs from package.json.');
    }
    const sourceRoot = path.join(root, 'source');
    if (readdirSync(sourceRoot).sort().join(',') !== [...packNames].sort().join(',')) {
        throw new Error('source/ must contain only Canopy[BP]/ and Canopy[RP]/.');
    }
    const files = collectFiles(sourceRoot);
    for (const file of files) {
        const relative = path.relative(sourceRoot, file);
        if (path.basename(file) !== 'LICENSE' && !/\.(?:js|ts|json|lang|md|png|mcstructure)$/.test(file)) {
            throw new Error(`Unexpected package file: ${relative}`);
        }
        if (file.endsWith('.json')) {
            try { JSON.parse(readFileSync(file, 'utf8')); }
            catch (error) { throw new Error(`${relative}: invalid JSON: ${error.message}`); }
        }
    }
    const manifests = packNames.map((name) => JSON.parse(readFileSync(path.join(sourceRoot, name, 'manifest.json'), 'utf8')));
    validateManifests(manifests, packageJson.version);
    for (const [index, name] of packNames.entries()) {
        for (const required of ['LICENSE', 'pack_icon.png', ...(index === 0 ? ['scripts/main.js', 'scripts/constants.js'] : ['texts/zh_CN.lang'])]) {
            if (!files.includes(path.join(sourceRoot, name, required))) throw new Error(`${name}: missing required file: ${required}`);
        }
    }
    const constants = readFileSync(path.join(sourceRoot, packNames[0], 'scripts/constants.js'), 'utf8');
    if (!constants.includes(`const PACK_VERSION = '${packageJson.version}';`)) {
        throw new Error('PACK_VERSION differs from package.json. Run npm run version.');
    }
    const languageSummary = validateLanguages(path.join(sourceRoot, packNames[1], 'texts'));
    const scripts = files.filter((file) => file.endsWith('.js'));
    const scriptsRoot = path.join(sourceRoot, packNames[0], 'scripts');
    const dependencies = new Set((manifests[0].dependencies ?? []).map((entry) => entry.module_name).filter(Boolean));
    const importCount = validateImports(scripts, scriptsRoot, dependencies);
    for (const file of scripts) {
        const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
            input: readFileSync(file, 'utf8'), encoding: 'utf8', timeout: 15_000, windowsHide: true
        });
        if (result.error || result.status !== 0) {
            throw new Error(`${path.relative(root, file)}: syntax check failed: ${result.error?.message ?? result.stderr}`);
        }
    }
    validateMarkdown(root);
    return { version: packageJson.version, files: files.length, scripts: scripts.length, imports: importCount, ...languageSummary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    try {
        const summary = validateProject(root);
        console.log(`Validated Canopy ${summary.version}: ${summary.files} files, ${summary.scripts} scripts, ${summary.imports} imports, ${summary.languages} languages, ${summary.chineseKeys} Chinese keys.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
