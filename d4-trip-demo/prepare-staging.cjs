'use strict';
// Build an isolated preview of this checkout. Never ships live config, account
// credentials, existing local records, server code, or a Firebase SDK.
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname,out=path.join(root,'.staging');
fs.mkdirSync(out,{recursive:true});
const assets=['night.css','premium-production.css','premium-production.js','shared-beta.js','trip-intro.js','intro.css','intro-logo.svg','icon.svg','manifest.webmanifest','fjord.webp','summit.webp','dunes.webp'];
for(const file of assets)fs.copyFileSync(path.join(root,file),path.join(out,file));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('./firebase-config.js','./staging-bootstrap.js')
 .replace(/<script type="module" src="\.\/(firebase-sync|team-sync|shared-runtime)\.js"><\/script>/g,'')
 .replace("if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}",'')
 .replace('<title>D4 Trip — Travel Planner</title>','<title>D4 Trip — Isolated Staging Preview</title>');
fs.writeFileSync(path.join(out,'index.html'),html);
const fixture={version:1,trips:[{id:'staging-goa',name:'Goa · Staging Sample',destination:'Goa',start:'2026-11-10',end:'2026-11-12',kind:'goa',emoji:'🏝️',code:'SAMPLE-ONLY',members:['D','Admin','Member'],admins:['Admin'],collection:{targetPerPerson:8000,payments:[{id:'sample-pay',member:'Member',amount:3000,method:'UPI',note:'ADVANCE · Sample',date:'2026-11-10'}]},plans:[{id:'sample-plan',date:'2026-11-10',time:'08:00',title:'Breakfast together',place:'Hotel cafe',category:'Food',done:false}],expenses:[{id:'sample-expense',amount:325,date:'2026-11-10',paidBy:'Admin',category:'Food & Dining',method:'UPI',note:'Breakfast · Sample expense',mode:'note',participants:[],shares:null,receipt:null}],settlementsPaid:[],reminders:[],notes:[],files:[],memories:[],chats:{admins:[],group:[]}}]};
fs.writeFileSync(path.join(out,'staging-bootstrap.js'),`'use strict';
window.D4_TRIP_FIREBASE_CONFIG=null;
window.D4_TRIP_SHARED_ROLLOUT=false;
(function(){
 const role=localStorage.getItem('d4_stage_role')||'owner';
 const name=role==='owner'?'D':role==='admin'?'Admin':'Member';
 if(!localStorage.getItem('d4_trip_offline_v2'))localStorage.setItem('d4_trip_offline_v2',JSON.stringify(${JSON.stringify(fixture)}));
 localStorage.setItem('d4_trip_offline_profile_v2',name);
 sessionStorage.setItem('d4_trip_cinema_seen_v1','1');
 window.D4TripCloud={user:null,ready:true,isVerifiedOwner:()=>role==='owner',localChanged(){},panel(){return '<section class="card" id="d4-cloud-panel"><h3>Isolated staging</h3><p>Sample data only. Firebase sign-in, cloud writes, invitations and password emails are disconnected. Preview roles only demonstrate the interface.</p></section>'}};
 document.addEventListener('DOMContentLoaded',()=>{
  const bar=document.createElement('aside');bar.id='d4-staging-banner';
  bar.style.cssText='position:sticky;top:0;z-index:2000;background:#ffd26b;color:#081b43;padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:600 12px system-ui';
  bar.innerHTML='<strong>STAGING · Sample data · Cloud disconnected</strong><label>Preview role <select id="d4-stage-role"><option value="owner">Main Admin</option><option value="admin">Admin</option><option value="member">Member</option></select></label>';
  document.body.prepend(bar);const select=document.getElementById('d4-stage-role');select.value=role;
  select.addEventListener('change',()=>{localStorage.setItem('d4_stage_role',select.value);location.reload()});
 });
})();
`);
const config={hosting:{site:'d4-trip',public:'.staging',ignore:['firebase*.json','**/.*'],headers:[{source:'**',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'"}]}]}};
fs.writeFileSync(path.join(root,'firebase.preview.json'),JSON.stringify(config,null,2)+'\n');
console.log('Prepared d4-trip-demo/.staging (sample data; Firebase disconnected).');
console.log('Preview channel only: npx firebase hosting:channel:deploy premium-pr-2 --project d4-trip --config d4-trip-demo/firebase.preview.json --expires 7d');
