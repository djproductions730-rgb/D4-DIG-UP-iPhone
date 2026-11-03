'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const moduleSrc = fs.readFileSync(path.join(dir, 'firebase-sync.js'), 'utf8');
const rules = fs.readFileSync(path.join(dir, 'firestore.rules'), 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
if (inline.length !== 1) throw new Error('Expected one D4 Trip app inline script');
new vm.Script(inline[0][1], { filename: 'index.html.inline.js' });
const checked = spawnSync(process.execPath, ['--input-type=module', '--check'], {
  input: moduleSrc, encoding: 'utf8'
});
if (checked.status !== 0) throw new Error(checked.stderr || 'Module syntax invalid');
for (const required of [
  '<script src="./firebase-config.js"></script>',
  '<script type="module" src="./firebase-sync.js"></script>',
  'window.D4TripLocal=',
  'window.D4TripCloud?.localChanged?.()'
]) if (!html.includes(required)) throw new Error('Missing app sync bridge: '+required);
for (const required of [
  'request.auth.uid == userId',
  'request.resource.data.revision == resource.data.revision + 1',
  'allow list: if false',
  'allow read, write: if false'
]) if (!rules.includes(required)) throw new Error('Missing restrictive Firestore rule: '+required);
console.log('PASS: app JavaScript syntax, Firebase bridge links and deny-by-default rule checks');
const tests = spawnSync(process.execPath, ['--test', path.join(dir, 'firebase-sync.test.cjs')], {
  stdio: 'inherit'
});
if (tests.status !== 0) process.exit(tests.status || 1);
