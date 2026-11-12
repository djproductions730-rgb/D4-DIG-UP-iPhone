#!/usr/bin/env node
'use strict';
/* Package original D4 Trip app frontend as a single HTML file.
 * Package the whole project source as a single readable text file.
 * This script never deploys or changes Firebase data/roles.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'single-file-build');
fs.mkdirSync(out,{recursive:true});
const read=f=>fs.readFileSync(path.join(root,f));
const utf8=f=>read(f).toString('utf8');
const binaryTypes={'.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
const imageData=f=>'data:'+binaryTypes[path.extname(f).toLowerCase()]+';base64,'+read(f).toString('base64');
let html=utf8('index.html'),cssFiles=[],jsFiles=[],imageFiles=[],missing=[];

// Preserve CSS cascading order.
html=html.replace(/<link\b[^>]*>/gi,tag=>{
 if(!/\brel\s*=\s*["']stylesheet["']/i.test(tag))return tag;
 const m=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
 if(!m||!m[1].startsWith('./'))return tag;
 const f=m[1].slice(2).split(/[?#]/)[0];
 if(!fs.existsSync(path.join(root,f))){missing.push(f);return tag}
 cssFiles.push(f);
 return '\n<style data-d4-original="'+f+'">\n/* SOURCE: '+f+' */\n'+utf8(f).replace(/<\/style/gi,'<\\/style')+'\n</style>\n';
});

// Keep script order and module semantics. Original defer script in head has
// to wait for DOMContentLoaded when converted to an inline classic script.
html=html.replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>\s*<\/script>/gi,tag=>{
 const m=tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
 if(!m||!m[1].startsWith('./'))return tag;
 const f=m[1].slice(2).split(/[?#]/)[0];
 if(!fs.existsSync(path.join(root,f))){missing.push(f);return tag}
 const isModule=/\btype\s*=\s*["']module["']/i.test(tag),isDefer=/\bdefer\b/i.test(tag);
 let body=utf8(f);
 if(isDefer&&!isModule)body="document.addEventListener('DOMContentLoaded',function(){\n"+body+"\n});";
 jsFiles.push(f);
 return '\n<script'+(isModule?' type="module"':'')+' data-d4-original="'+f+'">\n'+
   body.replace(/<\/script/gi,'<\\/script')+'\n//# sourceURL='+f+'\n</script>\n';
});

// Make PNG/SVG/WebP icon and background assets inlined base64 (including
// assets that are referred to from CSS and the HTML image attributes).
for(const asset of fs.readdirSync(root).filter(f=>binaryTypes[path.extname(f).toLowerCase()])
    .sort((a,b)=>b.length-a.length)){
 const from='./'+asset;
 if(!html.includes(from))continue;
 html=html.split(from).join(imageData(asset));
 imageFiles.push(asset);
}

// The manifest contents (including icon data) are embedded in the HTML.
const manifest=JSON.parse(utf8('manifest.webmanifest'));
manifest.icons=(manifest.icons||[]).map(icon=>{
 const f=typeof icon.src==='string'&&icon.src.startsWith('./')?icon.src.slice(2):null;
 return f&&fs.existsSync(path.join(root,f))?{...icon,src:imageData(f)}:icon;
});
const manifestURL='data:application/manifest+json;charset=utf-8,'+
 encodeURIComponent(JSON.stringify(manifest));
html=html.replace(/(<link\s+rel=["']manifest["']\s+href=["'])\.\/manifest\.webmanifest(["'][^>]*>)/i,
 (all,begin,end)=>begin+manifestURL+end);

const requiredCSS=['night.css','intro.css','premium-production.css','obsidian-luxe.css',
 'reference-premium.css','install-app.css','payment-roster.css','trip-day-controls.css'];
const requiredJS=['intro.js','firebase-config.js','shared-beta.js','premium-production.js',
 'goa-milestones.js','reference-premium.js','trip-day-controls.js','install-app.js',
 'firebase-sync.js','team-sync.js','team-join.js','team-invite-runtime.js','shared-runtime.js'];
for(const f of requiredCSS)if(!cssFiles.includes(f))missing.push(f);
for(const f of requiredJS)if(!jsFiles.includes(f))missing.push(f);
if(missing.length)throw Error('Missing files: '+[...new Set(missing)].join(', '));
if(/<script\b[^>]*\bsrc\s*=\s*["']\.\//i.test(html))throw Error('Unbundled local script');
if(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']\.\//i.test(html))throw Error('Unbundled CSS');
const note='<!--\nD4 TRIP v40 - COMPLETE FRONTEND IN ONE HTML FILE\n'+
 'Source branch: dev/d4-trip-join-requests-section-20261107\n'+
 'Includes '+cssFiles.length+' CSS stylesheets, '+jsFiles.length+' JS modules/scripts, icons and photos.\n'+
 'Firebase web SDK modules, online images and fonts still need an internet connection.\n'+
 'PWA service worker (sw.js) must be served as a separate HTTPS same-origin file;\n'+
 'browser security does not permit running SW code directly from an HTML file.\n'+
 'For Firestore rules and server code see the separate ALL-CODE.txt bundle.\n-->\n';
html=html.replace(/<!doctype html>/i,match=>match+'\n'+note);
fs.writeFileSync(path.join(out,'D4-Trip-ONE-FILE.html'),html);

// Export ALL project source files (frontend, Firestore rules, backend drafts,
// tests, icons and SW) into a single UTF8 txt with binary files as Base64.
const skip=new Set(['single-file-build','.git','node_modules','preview','dist','build']);
function enumerate(relative=''){
 return fs.readdirSync(path.join(root,relative),{withFileTypes:true})
  .flatMap(ent=>{
   if(skip.has(ent.name))return[];
   const file=path.join(relative,ent.name);
   return ent.isDirectory()?enumerate(file):ent.isFile()?[file]:[];
  }).sort();
}
const files=enumerate();
let output=['D4 TRIP - ALL PROJECT CODE IN ONE FILE',
 'SOURCE: djproductions730-rgb/D4-DIG-UP-iPhone',
 'BRANCH: dev/d4-trip-join-requests-section-20261107',
 'Binary images use Base64 encoding. Firebase credentials are not bundled.',
 'Firestore rules and backend code need their own deployment context.',
 ''];
for(const file of files){
 const raw=read(file);
 const isBinary=!!binaryTypes[path.extname(file).toLowerCase()]||[...raw.subarray(0,2048)].includes(0);
 const label=file.replace(/\\/g,'/');
 output.push('\n'+'='.repeat(88));
 output.push('BEGIN FILE: '+label);
 output.push('ENCODING: '+(isBinary?'BASE64':'UTF-8'));
 output.push('='.repeat(88));
 output.push(isBinary?raw.toString('base64'):raw.toString('utf8'));
 output.push('END FILE: '+label);
}
const transcript=output.join('\n');
fs.writeFileSync(path.join(out,'D4-Trip-ALL-CODE.txt'),transcript);
fs.writeFileSync(path.join(out,'BUILD-INFO.json'),JSON.stringify({
 htmlBytes:Buffer.byteLength(html),transcriptBytes:Buffer.byteLength(transcript),
 cssFiles,jsFiles,imageFiles,totalFiles:files.length
},null,2));
console.log('BUILT',JSON.stringify({
 htmlBytes:Buffer.byteLength(html),transcriptBytes:Buffer.byteLength(transcript),
 cssFiles:cssFiles.length,jsFiles:jsFiles.length,imageFiles:imageFiles.length,
 projectFiles:files.length
}));
