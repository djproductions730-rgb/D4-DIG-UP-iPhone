'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=__dirname;
const src=fs.readFileSync(path.join(root,'install-app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'install-app.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
new vm.Script(src,{filename:'install-app.js'});

function browser({ios=false,standalone=false,safari=true}={}){
 const listeners={window:{},document:{}},created=[];
 const window={
   addEventListener:(name,fn)=>(listeners.window[name]??=[]).push(fn),
   matchMedia:()=>({matches:standalone}),
   prompt:()=>{}
 };
 const navigator={
   userAgent:ios?(safari?'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0) AppleWebKit/605.1.15 Safari/605.1.15':
     'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0) AppleWebKit/605.1.15 CriOS/132 Safari/605.1.15'):
     'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138',
   platform:ios?'iPhone':'Linux',maxTouchPoints:ios?5:0,standalone:false,
   clipboard:{writeText:()=>Promise.resolve()}
 };
 const document={
   addEventListener:(name,fn)=>(listeners.document[name]??=[]).push(fn),
   querySelector:()=>null,
   querySelectorAll:()=>[],
   body:{appendChild:el=>created.push(el)},
   createElement:()=>({id:'',className:'',innerHTML:'',querySelector:()=>({focus:()=>{}}),remove:()=>{}})
 };
 const base={
   window,navigator,document,
   location:{href:'https://d4-trip.web.app/?team=some-team'},
   topBar:()=>'<header class="topbar"><div class="top-actions"><button>Old Profile</button></div></header>',
   home:()=>'<div>Existing Home</div>',
   entryPage:()=>'<main>Existing Entry</main>',
   profilePage:()=>'<div>Existing Settings</div>',
   render:()=>{},
 };
 vm.createContext(base);
 vm.runInContext(src,base,{filename:'install-app.js'});
 return {ctx:base,created,listeners};
}

test('manifest is installable and has real Home Screen icon links',()=>{
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.id,'./');
 assert.equal(manifest.start_url,'./?source=installed');
 assert.ok(manifest.icons.some(x=>x.sizes==='192x192'));
 assert.ok(manifest.icons.some(x=>x.sizes==='512x512'));
 assert.match(html,/apple-touch-icon-v28\.png/);
 for(const [file,version] of [['install-app.js',38],['install-app.css',38]]){
   assert.ok(html.includes(file+'?build='+version),'Missing HTML asset '+file);
   assert.ok(sw.includes(file+'?build='+version),'Missing SW asset '+file);
 }
 assert.match(html,/sw\.js\?build=50/);
 assert.match(css,/d4-install-button/);
});

test('install control is visible in header, Home, Entry and Settings before install',()=>{
 const {ctx}=browser();
 for(const page of ['topBar','home','entryPage','profilePage']){
   const output=ctx[page]();
   assert.match(output,/data-d4-install="1"/,page+' must expose Install App');
   assert.match(output,/Install/);
 }
 assert.match(ctx.home(),/Existing Home/,'No original content should be replaced');
 assert.match(ctx.entryPage(),/Existing Entry/);
});

test('Android uses native browser prompt from a direct click, without falsely claiming installation',()=>{
 const {ctx,listeners}=browser();
 let prompted=0,prevented=0;
 listeners.window.beforeinstallprompt[0]({
   preventDefault:()=>{prevented++},
   prompt:()=>{prompted++},
   userChoice:Promise.resolve({outcome:'accepted'})
 });
 assert.equal(prevented,1);
 assert.equal(ctx.window.D4TripInstall.hasPrompt(),true);
 listeners.document.click[0]({
   target:{closest:sel=>sel==='[data-d4-install]'?{dataset:{d4Install:'1'}}:null},
   preventDefault:()=>{},stopPropagation:()=>{}
 });
 assert.equal(prompted,1,'Native prompt must start on the install-button click');
 assert.equal(ctx.window.D4TripInstall.isInstalled(),false,'Do not claim installed before appinstalled');
 listeners.window.appinstalled[0]();
 assert.equal(ctx.window.D4TripInstall.isInstalled(),true);
 assert.doesNotMatch(ctx.topBar(),/data-d4-install/,'Hide install CTA once installed');
});

test('iPhone instructions include Safari Share and Add to Home Screen',()=>{
 const {ctx,listeners,created}=browser({ios:true});
 listeners.document.click[0]({
   target:{closest:sel=>sel==='[data-d4-install]'?{}:null},
   preventDefault:()=>{},stopPropagation:()=>{}
 });
 assert.equal(created.length,1);
 assert.match(created[0].innerHTML,/Add to Home Screen/);
 assert.match(created[0].innerHTML,/Open as Web App/);
 assert.match(created[0].innerHTML,/Safari/);
});

test('iPhone third-party browser asks user to open same link in Safari',()=>{
 const {ctx,created}=browser({ios:true,safari:false});
 ctx.window.D4TripInstall.showInstructions();
 assert.match(created[0].innerHTML,/same D4 Trip link in Safari/);
 assert.match(created[0].innerHTML,/Copy this trip link/);
});

test('already-installed standalone app is not asked to reinstall',()=>{
 const {ctx}=browser({standalone:true});
 assert.equal(ctx.window.D4TripInstall.isInstalled(),true);
 for(const fn of ['home','entryPage','profilePage','topBar'])assert.doesNotMatch(ctx[fn](),/data-d4-install/);
});

test('installed start URL restores last explicitly opened trip where browser storage is shared',()=>{
 const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(bootstrap&&bootstrap.includes('d4_trip_installed_team_v1'));
 const mem={};
 const storage={getItem:key=>mem[key]||null,setItem:(key,v)=>{mem[key]=v}};
 const ctx1={location:{search:'?team=secureGoa77',pathname:'/',hash:'',replace:()=>{}},localStorage:storage,URLSearchParams};
 vm.createContext(ctx1);
 vm.runInContext(bootstrap,ctx1);
 assert.equal(mem['d4_trip_installed_team_v1'],'secureGoa77');
 let destination='';
 const ctx2={location:{search:'?source=installed',pathname:'/',hash:'',replace:url=>{destination=url}},localStorage:storage,URLSearchParams};
 vm.createContext(ctx2);
 vm.runInContext(bootstrap,ctx2);
 assert.match(destination,/team=secureGoa77/);
 assert.match(destination,/source=installed/);
});
