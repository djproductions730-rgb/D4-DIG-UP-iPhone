'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'premium-production.css'), 'utf8');
const src = fs.readFileSync(path.join(root, 'premium-production.js'), 'utf8');
const refSrc = fs.readFileSync(path.join(root, 'reference-premium.js'), 'utf8');
const refCss = fs.readFileSync(path.join(root, 'reference-premium.css'), 'utf8');
new vm.Script(src, {filename:'premium-production.js'});
new vm.Script(refSrc, {filename:'reference-premium.js'});

assert.match(html, /premium-production\.css/);
assert.match(html, /premium-production\.js/);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for(const asset of ['team-join.js','firebase-sync.js']){
  assert.ok(html.includes('./'+asset+'?build=27'), 'Versioned asset missing from index: '+asset);
  assert.ok(sw.includes('./'+asset+'?build=27'), 'Versioned asset missing from offline cache: '+asset);
}
for(const [asset,version] of [
  ['premium-production.css',45],
  ['goa-milestones.js',29],
  ['obsidian-luxe.css',34],
  ['reference-premium.css',41],
  ['reference-premium.js',60],
  ['install-app.js',38],
  ['install-app.css',38],
  ['payment-roster.css',40],
  ['trip-day-controls.js',40],
  ['trip-day-controls.css',40],
  ['home-circular-luxe.css',60]
]){
  assert.ok(html.includes('./'+asset+'?build='+version), 'Current asset missing from index: '+asset);
  assert.ok(sw.includes('./'+asset+'?build='+version), 'Current asset missing from offline cache: '+asset);
}
assert.match(html, /sw\.js\?build=71/, 'Force service-worker update');
assert.match(src, /d4-build-version/, 'Admin v26 build marker');
assert.doesNotMatch(src, /Request management is loading|Open your shared trip first/, 'Old stuck loading/share instructions must not ship');

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
  expensesPage: () => '<section>original-expenses-page</section>',
  adminPage: () => '<section>original-admin-page</section>',
  calculations: () => ({total:730,categories:{Travel:730}}),
  URL, location:{origin:'https://d4-trip.web.app',pathname:'/',href:'https://d4-trip.web.app/'},
  localStorage: {getItem:()=>null,setItem:()=>{}},
  document: {
    body: {classList:{add:()=>{},toggle:()=>{}}},
    documentElement: {style:{}},
    addEventListener:(name,callback)=>{(events[name]??=[]).push(callback)}
  },
  window: {D4TripCloud:cloud,D4Team:{hasAccess:()=>true,canEdit:()=>editor},D4TripJoin:{mainAdminInbox:()=>'<section class="d4-main-admin-inbox"><button data-join-decision="approved" data-trip-id="REAL_DOC_REFERENCE">Accept</button><button data-join-decision="rejected" data-trip-id="REAL_DOC_REFERENCE">Reject</button></section>',mainAdminBanner:()=>'<div class="d4-main-join-banner">Pending</div>',homeRequests:()=>'<section class="d4-home-join-requests"><button data-join-decision="approved">Accept</button><button data-join-decision="rejected">Reject</button></section>',adminPanel:()=>'<section class="d4-shared-requests"><button data-join-decision="approved">Accept</button><button data-join-decision="rejected">Reject</button></section>',approvedMembersPanel:()=>'<section class="d4-approved-members-panel">Approved Members</section>',pendingCount:()=>2}},
  profile:'Owner', current:()=>hasTrip?t:null, isMain:()=>owner, isTripAdmin:()=>editor,
  esc:v=>String(v), render:()=>{},teamId:'real-team-id',
  get view(){return view},set view(v){view=v},
  get tripTab(){return tab},set tripTab(v){tab=v},
  collectionTotals:()=>({progress:40,full:1,partial:1,unpaid:0,paid:5000,target:12500,pending:7500,rows:[{member:'Member A',status:'Paid',paid:4000},{member:'Member B',status:'Partial',paid:1000}]}),
  money:v=>'₹'+v, datesInTrip:()=>['2026-11-06','2026-11-07','2026-11-08','2026-11-09'],
  shortDate:v=>v
};
vm.createContext(context);
vm.runInContext(src,context,{filename:'premium-production.js'});
vm.runInContext(refSrc,context,{filename:'reference-premium.js'});
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
assert.match(baseAdminPanel,/d4-approved-members-panel/,'Approved members remain in Control Centre');
assert.match(baseAdminPanel,/data-action="d4-requests-panel"/,'Control Centre links to dedicated Requests screen');
assert.doesNotMatch(baseAdminPanel,/d4-main-admin-inbox|data-join-decision/,'Approvals no longer clutter Control Centre');
assert.match(baseAdminPanel,/d4-main-join-link/,'Full trip link is displayed in Control Centre');
assert.doesNotMatch(baseAdminPanel,/Request management is loading|Open your shared trip first/,'Old misleading placeholders removed');
const openRequests=events.click.find(fn=>fn.toString().includes("name==='d4-requests-panel'"));
assert.ok(openRequests,'Dedicated Requests click handler exists');
openRequests({target:{closest:()=>({dataset:{action:'d4-requests-panel'}})},preventDefault(){}});
const requestsPage=context.tripPage();
assert.match(requestsPage,/d4-requests-page/,'Requests has its own page');
assert.match(requestsPage,/d4-main-admin-inbox/,'Main Admin inbox appears only on Requests page');
assert.match(requestsPage,/data-join-decision="approved"/,'Main Admin can accept in Requests');
assert.match(requestsPage,/data-join-decision="rejected"/,'Main Admin can reject in Requests');
assert.doesNotMatch(requestsPage,/d4-approved-members-panel/,'Approved roster is a separate section');
assert.match(context.bottomNav(),/aria-label="More sections"/,'Five-button navigation includes More sections');
openAdmin({target:{closest:()=>({dataset:{action:'d4-admin-panel'}})},preventDefault(){}});
assert.match(context.tripPage(),/d4-approved-members-panel/,'Back to Admin shows approved members');
owner=false;
const localAdminPanel=context.tripPage();
assert.match(localAdminPanel,/Trip Admin Panel/,'Local Trip Admin role is distinguishable');
assert.match(localAdminPanel,/data-action="d4-requests-panel"/,'Local Trip Admin has a Requests shortcut');
openRequests({target:{closest:()=>({dataset:{action:'d4-requests-panel'}})},preventDefault(){}});
assert.match(context.tripPage(),/Firebase Sign In/,'Unauthenticated local Trip Admin receives sign-in instructions in Requests');
assert.doesNotMatch(localAdminPanel,/Request management is loading/);
owner=true;
openAdmin({target:{closest:()=>({dataset:{action:'nav'}})},preventDefault(){} });
context.teamId='real-team-id';

context.teamId='';
assert.doesNotMatch(context.home(),/d4-main-admin-inbox|data-join-decision/,'Home no longer mixes in request decisions');
assert.doesNotMatch(context.entryPage(),/d4-main-admin-inbox|data-join-decision/,'Trip library no longer mixes in request decisions');
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
assert.equal((nav.match(/<button /g)||[]).length,5,'Reference layout displays five mobile navigation buttons');
assert.match(nav,/class="bottom-nav ref-bottom-nav"/,'Navigation uses the approved bottom bar');
for(const label of ['Home','Day Plan','Chat','More'])assert.ok(nav.includes(label),label+' missing');
assert.match(nav,/data-ref-action="toggle-plus"/,'Gold central plus button must open actions');
assert.doesNotMatch(nav,/class="d4-liquid-rail"/,'Outdated right rail must not reappear');
const moreHandler=events.click.find(fn=>fn.toString().includes('dataset.refAction'));
assert.ok(moreHandler,'Reference navigation toggle click handler registered');
moreHandler({target:{closest:selector=>selector==='[data-ref-action]'?{dataset:{refAction:'toggle-more'}}:null},preventDefault(){},stopImmediatePropagation(){}});
const moreNav=context.bottomNav();
for(const label of ['Members','Payments','Expenses','Reports','Memories','Alerts','Settings','Main Admin'])assert.ok(moreNav.includes(label),label+' missing from More menu');
assert.match(refCss,/bottom-nav\.ref-bottom-nav/,'Approved bottom navigation has styles');
assert.match(refCss,/ref-nav-plus/,'Premium plus-button styles present');
assert.match(refCss,/safe-area-inset-bottom/,'iPhone safe area protected');
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
assert.doesNotMatch(dashboard,/d4-home-join-requests|data-join-decision/,'Dashboard keeps requests in their dedicated section');
assert.match(dashboard,/Trip Payments/);
assert.match(dashboard,/d4p-nav-grid/);
const navTiles=(dashboard.match(/data-action="(?:open-tab|nav)"[^>]+class=/g)||[]);
assert.equal((dashboard.match(/class="d4p-tile"/g)||[]).length >= 6,true,'Six visible navigation cards plus preserved legacy controls exist');
assert.match(dashboard, /data-view="tickets"/,'Tickets remains a working navigation target');
for(const section of ['Overview','Day Plan','Tickets','Alerts','Reports','Settings'])assert.ok(dashboard.includes(section),section+' missing');
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
assert.doesNotMatch(context.bottomNav(),/Requests|data-action="d4-requests-panel"/,'Members cannot open admin requests');
assert.match(context.profilePage(),/view-only mode/);
assert.doesNotMatch(context.profilePage(),/Delete Existing trip name/);
hasTrip=false;
assert.match(context.profilePage(),/data-action="d4-open-invite"/,'new user can open a name-only invite link from profile');
assert.doesNotMatch(context.profilePage(),/data-modal="join-trip"|Join with Code/);
assert.match(context.profilePage(),/data-action="entry-back"/,'new user can return to Trips');
assert.doesNotMatch(context.profilePage(),/Delete Existing trip name/);
console.log('PASS: Premium D4 Trip scripts parse, reference bottom navigation, real-data scoreboard, role permissions and account panel.');

for(const asset of ['premium-production.js','team-sync.js']){
  const version=asset==='premium-production.js'?45:30;
  assert.ok(html.includes('./'+asset+'?build='+version), 'Shared sync version missing from index: '+asset);
  assert.ok(sw.includes('./'+asset+'?build='+version), 'Shared sync version missing from offline cache: '+asset);
}

hasTrip=true;owner=true;editor=true;
context.teamId='';
context.view='trip';context.tripTab='plan';
const privatePlan=context.tripPage();
assert.match(privatePlan,/Private trip copy/,'Admin local Day Plan warns it is not shared');
assert.match(privatePlan,/data-team="open-shared"/,'Verified owner can open Firebase team trip');
assert.match(privatePlan,/private edits are not automatically transferred/i,'Never silently sync local data');
context.teamId='real-team-id';owner=false;editor=false;
const memberPlan=context.tripPage();
assert.doesNotMatch(memberPlan,/Member view only|Everyone approved for this exact trip link|day-plan stops/,'Shared refresh guide is icon-only');
assert.match(memberPlan,/data-team="refresh-shared"/,'Shared trip has a manual refresh');
assert.doesNotMatch(memberPlan,/data-team="open-shared"/,'Member cannot publish or open another trip via owner action');
context.tripTab='members';
const memberRoster=context.tripPage();
assert.match(memberRoster,/original-members/,'Read-only member can view roster');
assert.match(memberRoster,/Approved members can view every name/);
assert.match(css,/d4-team-sync-guide/,'Mode status is styled for mobile');

hasTrip=true;owner=true;editor=true;
assert.match(context.tripMembers(t),/Member A/,'New member cards render existing roster names');
assert.match(context.expensesPage(),/₹730/,'Expense category totals use underlying data calculations');
assert.match(refCss,/\.ref-ring/,'Payment progress ring visual styles exist');
assert.match(refCss,/\.ref-person/,'Member cards are styled');
assert.match(refCss,/\.ref-expense-row/,'Expense cards are styled');
assert.match(refCss,/\.ref-trip-hero/,'Travel hero graphic styles exist');
assert.match(refCss,/\.ref-admin-hero/,'Admin hero styles exist');
assert.doesNotMatch(refSrc,/firebase\.firestore\(|setDoc\(|updateDoc\(|deleteDoc\(/,'Reference layer must not write cloud data');
console.log('PASS: Reference UI v36, real trip data and original permissions retained.');
