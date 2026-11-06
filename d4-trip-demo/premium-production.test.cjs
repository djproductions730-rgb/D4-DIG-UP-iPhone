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
assert.doesNotMatch(html, /Join with Trip Code|Cloud code joining is not active yet/,'Old code join modal and redemption flow must not ship');
for (const color of ['#081B43','#14275A','#7138F5','#F332B5','#FF9A50','#FFD26B']) {
  assert.ok(css.includes(color), 'Missing design token '+color);
}
assert.match(css, /body\.d4-premium\.d4-light/);
assert.match(css, /env\(safe-area-inset-bottom\)/);

const t = {
  id:'REAL_DOC_REFERENCE', name:'Existing trip name', destination:'Existing destination',
  start:'2026-11-06', end:'2026-11-09', members:['Member A','Member B']
};
let owner = true,editor = true,role = 'owner',view = 'trip',tab = 'overview',hasTrip=true;
const events = {};
const cloud = {user:{email:'owner@example.test'}};
const context = {
  topBar:()=>'original-header',
  home:()=>'<div class="hero"><div class="row"><button data-action="d4-open-invite">Join by Name</button></div></div><section>Dashboard</section>',
  tripsPage:()=>'<button data-action="d4-open-invite">Join by Name</button><div class="trip-list">Trips</div>',
  entryPage: () => '<h1>My Trips</h1><button class="d4-install-help" data-action="install-help">Install D4 Trip on Phone</button>' +
    '<button class="d4-install-help" data-action="replay-intro">Replay Logo Intro</button>' +
    '<button data-action="enter-app">Open dashboard</button>Choose a trip → Collection → Trip Dashboard',
  bottomNav: () => 'legacy-nav',
  collectionsPage: () => '<div class="d4-payment-counts">Totals</div>' +
    '<button class="cc-open-members">View Members</button>' +
    '<button>✈️ Enter Trip →</button>',
  tripOverview: () => 'legacy-overview',
  tripPage: () => 'legacy-page',tripPlan:()=> 'original-plan',tripExpenses:()=> 'original-expenses',tripMembers:()=> 'original-members',
  profilePage: () => '<section id="real-account-panel">Existing Firebase account UI</section>',
  chatsPage: () => 'legacy-live-chat',
  URL, location:{origin:'https://d4-trip.web.app',pathname:'/',href:'https://d4-trip.web.app/'},
  localStorage: {getItem:()=>null,setItem:()=>{}},
  document: {
    body: {classList:{add:()=>{},toggle:()=>{}}},
    documentElement: {style:{}},
    addEventListener:(name,callback)=>{(events[name]??=[]).push(callback)}
  },
  window: {D4TripCloud:cloud,D4Team:{hasAccess:()=>true,canEdit:()=>editor},D4TripJoin:{mainAdminInbox:()=>'<section class="d4-main-admin-inbox"><button data-join-decision="approved" data-trip-id="REAL_DOC_REFERENCE">Accept</button><button data-join-decision="rejected" data-trip-id="REAL_DOC_REFERENCE">Reject</button></section>',mainAdminBanner:()=>'<div class="d4-main-join-banner">Pending</div>',homeRequests:()=>'<section class="d4-home-join-requests"><button data-join-decision="approved">Accept</button><button data-join-decision="rejected">Reject</button></section>',adminPanel:()=>'<section>Admin request review</section>'}},
  current:()=>hasTrip?t:null, isMain:()=>owner, isTripAdmin:()=>editor,
  esc:v=>String(v), render:()=>{},teamId:'real-team-id',
  get view(){return view},set view(v){view=v},
  get tripTab(){return tab},set tripTab(v){tab=v},
  collectionTotals:()=>({progress:40,full:1,partial:1,unpaid:0,paid:5000,target:12500,pending:7500,rows:[{member:'Member A',status:'Paid',paid:4000},{member:'Member B',status:'Partial',paid:1000}]}),
  money:v=>'₹'+v, datesInTrip:()=>['2026-11-06','2026-11-07','2026-11-08','2026-11-09'],
  shortDate:v=>v
};
vm.createContext(context);
vm.runInContext(src,context,{filename:'premium-production.js'});
assert.match(context.entryPage(),/id="d4-main-join-link"/,'Main Admin My Trips displays full link field');
assert.match(context.entryPage(),/data-team="share-join-link"/,'Main Admin My Trips offers Copy Link');
assert.match(context.entryPage(),/https:\/\/d4-trip\.web\.app\/\?team=real-team-id/,'Main Admin sees exact trip invitation URL');
assert.match(context.home(),/id="d4-main-join-link"/,'Home displays share URL');
assert.match(context.profilePage(),/id="d4-main-join-link"/,'Settings displays share URL');
context.teamId='';
context.view='trip';
context.tripTab='overview';
const openAdmin=events.click.find(fn=>fn.toString().includes("d4-admin-panel"));
assert.ok(openAdmin,'Control Centre click handler is registered');
openAdmin({target:{closest:()=>({dataset:{action:'d4-admin-panel'}})},preventDefault(){}});
const baseAdminPanel=context.tripPage();
assert.match(baseAdminPanel,/Main Admin Panel/,'Verified Main Admin is labeled correctly');
assert.match(baseAdminPanel,/d4-main-admin-inbox/,'Main Admin Control Centre shows live inbox');
assert.match(baseAdminPanel,/data-join-decision="approved"/,'Direct accept action is available');
assert.match(baseAdminPanel,/data-join-decision="rejected"/,'Direct reject action is available');
assert.match(baseAdminPanel,/d4-main-join-link/,'Full trip link is displayed in Control Centre');
assert.doesNotMatch(baseAdminPanel,/Request management is loading|Open your shared trip first/,'Old misleading placeholders removed');
owner=false;
const localAdminPanel=context.tripPage();
assert.match(localAdminPanel,/Trip Admin Panel/,'Local Trip Admin role is distinguishable');
assert.match(localAdminPanel,/Firebase Sign In/,'Local admins get an actionable authorization message');
assert.doesNotMatch(localAdminPanel,/Request management is loading/);
owner=true;
openAdmin({target:{closest:()=>({dataset:{action:'nav'}})},preventDefault(){} });
context.teamId='real-team-id';

context.teamId='';
assert.match(context.home(),/d4-main-admin-inbox/,'Base Main Admin Home shows incoming requests without ?team=');
assert.match(context.entryPage(),/d4-main-admin-inbox/,'My Trips shows Main Admin requests');
assert.match(context.home(),/data-join-decision="approved"/,'Base Home allows direct approve');
assert.match(context.home(),/data-join-decision="rejected"/,'Base Home allows direct reject');
context.teamId='real-team-id';
assert.match(context.topBar(),/data-action="d4-back"/);
assert.match(context.topBar(),/Back to Payments/,'overview back leads to payments');
assert.match(context.topBar(),/My Trips/);
context.tripTab='plan';
assert.match(context.topBar(),/Back to Trip Dashboard/,'trip-day back leads to dashboard');
context.tripTab='overview';
context.view='collections';
assert.match(context.topBar(),/Back to My Trips/,'collections back leads to trip selection');
context.view='profile';
assert.match(context.topBar(),/Back to Trip Dashboard/,'settings back leads to trip dashboard');
context.view='trip';
const nav = context.bottomNav();
assert.equal((nav.match(/<button /g)||[]).length,8,'Admin sees seven sections plus Admin shortcut in right rail');
assert.match(nav,/class="d4-liquid-rail"/,'Navigation is a right-side rail, not a bottom bar');
for(const label of ['Home','Day Plan','Members','Payments','Expenses','Chat','Settings'])assert.ok(nav.includes(label));
assert.doesNotMatch(nav,/d4p-bottom|bottom-nav/);
assert.equal(nav.includes('Memories'),false);
assert.match(css,/d4-liquid-rail\{position:fixed/);
assert.match(css,/right:8px/);
const entry = context.entryPage();
assert.match(entry, /Explore Trips/);
assert.doesNotMatch(entry, /install-help|replay-intro/);
owner=false;
context.teamId='';
const guestEntry=context.entryPage();
assert.match(guestEntry,/d4-single-join-entry/,'Guest has standalone scrollable name entry');
assert.match(guestEntry,/d4-save-join-name/,'Step 1 is visible immediately');
assert.match(guestEntry,/id="d4-guest-name-input"/,'Name input visible');
assert.match(guestEntry,/Submit Name/);
assert.doesNotMatch(guestEntry,/d4-new-card-list|d4-new-bottom|d4-open-trip-link|Join with Code/,'Old trip grid and second step cannot clip name box');
assert.equal((guestEntry.match(/<button[^>]*type="submit"[^>]*>/g)||[]).length,1,'Only one form action at a time');
const guestHome=context.home();
assert.equal((guestHome.match(/Join by Name/g)||[]).length,1,'Exactly one Join by Name button remains on Home');
assert.equal((guestHome.match(/id="d4-guest-name-input"/g)||[]).length,1,'Home shows one usable Name box');
assert.doesNotMatch(context.tripsPage(),/Join by Name/,'Trips list does not show duplicate Join by Name button');
owner=true;
context.teamId='real-team-id';
const board=context.collectionsPage();
assert.match(board, /d4p-ring/);
assert.match(board, /d4-blue-breakdown/);
for(const label of ['Total Trip Amount','Paid in Full','Advance \/ Partial Paid','Total Received','Remaining Amount'])assert.ok(board.includes(label));
assert.match(css,/d4-blue-breakdown/);
assert.match(css,/touch-action:pan-y/);
assert.match(board, /Continue/);
assert.match(board, /Skip/);
assert.match(board, /enter-selected-trip/);
assert.match(context.chatsPage(), /Coming Soon/);
assert.doesNotMatch(context.chatsPage(),/legacy-live-chat/);
const dashboard=context.tripOverview(t);
assert.ok(dashboard.includes('Existing destination'),'Existing data, not mock names');
assert.match(dashboard,/d4-home-join-requests/,'Shared trip admin home displays pending approvals');
assert.match(dashboard,/data-join-decision="approved"/,'Home has Accept action');
assert.match(dashboard,/data-join-decision="rejected"/,'Home has Reject action');
assert.match(dashboard,/Paid \/ Pending/);
assert.match(dashboard,/d4p-nav-grid/);
const navTiles=(dashboard.match(/data-action="(?:open-tab|nav)"[^>]+class=/g)||[]);
assert.equal((dashboard.match(/class="d4p-tile"/g)||[]).length >= 9,true,'All nine navigation cards exist');
for(const section of ['Overview','Day Plan','Expenses','Paid / Pending','Members','Alerts','Memories','Reports','Settings'])assert.ok(dashboard.includes(section),section+' missing');
assert.doesNotMatch(dashboard,/Split & Settle|Split Costs/);
assert.match(css,/d4p-nav-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(dashboard,/Members/);
assert.match(dashboard,/Main Admin Quick Actions/);
assert.match(context.tripPage(),/Existing destination/);
context.tripTab='settle';
assert.doesNotMatch(context.tripPage(),/Smart split|Who pays whom/);
assert.equal(context.tripTab,'overview');
context.tripTab='plan';assert.match(context.tripPage(),/original-plan/);context.tripTab='overview';
assert.match(dashboard,/Promote Admin/);
assert.match(dashboard,/Demote Admin/);
assert.match(dashboard,/Add Expense/);
assert.match(context.profilePage(),/data-team="share-join-link"/,'Main Admin Settings has one-tap join link copy');
assert.equal((context.profilePage().match(/data-team="share-join-link"/g)||[]).length,1,'Exactly one Share Join Link button in Main Admin Settings');
assert.match(css,/bottom:calc\(20px \+ env\(safe-area-inset-bottom\)\)/,'Copied confirmation appears at bottom');
assert.match(context.profilePage(),/real-account-panel/);
assert.match(context.profilePage(),/Delete Existing trip name/);
owner=false;editor=true;
assert.match(context.tripOverview(t),/Admin Quick Actions/);
assert.doesNotMatch(context.tripOverview(t),/Promote Admin/);
owner=false;editor=false;
assert.doesNotMatch(context.tripOverview(t),/Admin Quick Actions|Promote Admin/);
assert.match(context.profilePage(),/view-only mode/);
assert.doesNotMatch(context.profilePage(),/Delete Existing trip name/);
hasTrip=false;
assert.match(context.profilePage(),/data-action="d4-open-invite"/,'new user can open a name-only invite link from profile');
assert.doesNotMatch(context.profilePage(),/data-modal="join-trip"|Join with Code/);
assert.match(context.profilePage(),/data-action="entry-back"/,'new user can return to Trips');
assert.doesNotMatch(context.profilePage(),/Delete Existing trip name/);
console.log('PASS: Premium D4 Trip script parses, right rail, scoreboard, role-scoped actions, themes and original account panel.');
