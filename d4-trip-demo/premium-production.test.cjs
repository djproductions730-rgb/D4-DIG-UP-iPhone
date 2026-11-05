'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'premium-production.css'), 'utf8');
const src = fs.readFileSync(path.join(root, 'premium-production.js'), 'utf8');
new vm.Script(src, {filename:'premium-production.js'});

assert.match(html, /premium-production\.css/);
assert.match(html, /premium-production\.js/);
for (const color of ['#081B43','#14275A','#7138F5','#F332B5','#FF9A50','#FFD26B']) {
  assert.ok(css.includes(color), 'Missing design token '+color);
}
assert.match(css, /body\.d4-premium\.d4-light/);
assert.match(css, /env\(safe-area-inset-bottom\)/);

const t = {
  id:'REAL_DOC_REFERENCE', name:'Existing trip name', destination:'Existing destination',
  start:'2026-11-06', end:'2026-11-09', members:['Member A','Member B']
};
let owner = true,editor = true,role = 'owner',view = 'trip',tab = 'overview';
const events = {};
const cloud = {user:{email:'owner@example.test'}};
const context = {
  topBar:()=>'original-header',
  entryPage: () => '<h1>My Trips</h1><button class="d4-install-help" data-action="install-help">Install D4 Trip on Phone</button>' +
    '<button class="d4-install-help" data-action="replay-intro">Replay Logo Intro</button>' +
    'Choose a trip → Collection → Trip Dashboard',
  bottomNav: () => 'legacy-nav',
  collectionsPage: () => '<div class="d4-payment-counts">Totals</div>' +
    '<button class="cc-open-members">View Members</button>' +
    '<button>✈️ Enter Trip →</button>',
  tripOverview: () => 'legacy-overview',
  tripPage: () => 'legacy-page',tripPlan:()=> 'original-plan',tripExpenses:()=> 'original-expenses',tripMembers:()=> 'original-members',
  profilePage: () => '<section id="real-account-panel">Existing Firebase account UI</section>',
  chatsPage: () => 'legacy-live-chat',
  localStorage: {getItem:()=>null,setItem:()=>{}},
  document: {
    body: {classList:{add:()=>{},toggle:()=>{}}},
    documentElement: {style:{}},
    addEventListener:(name,callback)=>{events[name]=callback}
  },
  window: {D4TripCloud:cloud,D4Team:{}},
  current:()=>t, isMain:()=>owner, isTripAdmin:()=>editor,
  esc:v=>String(v), render:()=>{},teamId:'real-team-id',
  get view(){return view},set view(v){view=v},
  get tripTab(){return tab},set tripTab(v){tab=v},
  collectionTotals:()=>({progress:40,full:1,partial:1,unpaid:0,paid:5000,target:12500,pending:7500}),
  money:v=>'₹'+v, datesInTrip:()=>['2026-11-06','2026-11-07','2026-11-08','2026-11-09'],
  shortDate:v=>v
};
vm.createContext(context);
vm.runInContext(src,context,{filename:'premium-production.js'});
assert.match(context.topBar(),/Trip Dashboard/);
assert.match(context.topBar(),/My Trips/);
const nav = context.bottomNav();
assert.equal((nav.match(/<button /g)||[]).length, 4,'Exactly four bottom navigation buttons');
for(const label of ['Expenses','Trip Days','Settings','Chats'])assert.ok(nav.includes(label));
assert.equal(nav.includes('Memories'),false);
assert.equal(nav.includes('Home'),false);
const entry = context.entryPage();
assert.match(entry, /Explore Trips/);
assert.doesNotMatch(entry, /install-help|replay-intro/);
const board=context.collectionsPage();
assert.match(board, /d4p-ring/);
assert.match(board, /Continue/);
assert.match(board, /Skip/);
assert.match(board, /enter-selected-trip/);
assert.match(context.chatsPage(), /Coming Soon/);
assert.doesNotMatch(context.chatsPage(),/legacy-live-chat/);
const dashboard=context.tripOverview(t);
assert.ok(dashboard.includes('Existing destination'),'Existing data, not mock names');
assert.match(dashboard,/Payment Scoreboard/);
assert.match(dashboard,/Members/);
assert.match(dashboard,/Main Admin Quick Actions/);
assert.match(context.tripPage(),/Existing destination/);
context.tripTab='plan';assert.match(context.tripPage(),/original-plan/);context.tripTab='overview';
assert.match(dashboard,/Promote Admin/);
assert.match(dashboard,/Demote Admin/);
assert.match(dashboard,/Add Expense/);
assert.match(context.profilePage(),/real-account-panel/);
owner=false;editor=true;
assert.match(context.tripOverview(t),/Admin Quick Actions/);
assert.doesNotMatch(context.tripOverview(t),/Promote Admin/);
owner=false;editor=false;
assert.doesNotMatch(context.tripOverview(t),/Admin Quick Actions|Promote Admin/);
assert.match(context.profilePage(),/view-only mode/);
console.log('PASS: Premium D4 Trip script parses, 4 tabs, scoreboard, role-scoped actions, themes and original account panel.');
