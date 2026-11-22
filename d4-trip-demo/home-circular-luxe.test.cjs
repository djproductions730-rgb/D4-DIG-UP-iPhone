'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const script=fs.readFileSync(path.join(root,'reference-premium.js'),'utf8');
const css=fs.readFileSync(path.join(root,'home-circular-luxe.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
new vm.Script(script,{filename:'reference-premium.js'});
function setup(){
  const t={
    id:'goa-trip',name:'Goa Trip',destination:'Goa',start:'2026-11-24',end:'2026-11-26',
    members:Array.from({length:17},(_,i)=>'Member '+(i+1)),
    collection:{targetPerPerson:9800,payments:[]}
  };
  const calc={paid:54100,pending:112500,target:166600,progress:32.47,rows:[
    {member:'Member 1',paid:9800,pending:0,status:'Paid'},
    {member:'Member 2',paid:2300,pending:7500,status:'Partial'}
  ]};
  const context={
    window:{},localStorage:{getItem:()=>null,setItem:()=>{}},
    document:{addEventListener:()=>{}},
    view:'trip',tripTab:'overview',teamId:'goa-trip',
    esc:value=>String(value),money:n=>'₹'+Math.round(n).toLocaleString('en-IN'),
    shortDate:s=>s,datesInTrip:()=>['2026-11-24','2026-11-25','2026-11-26'],
    collectionTotals:()=>calc,calculations:()=>({total:0,categories:{}}),
    current:()=>t,isTripAdmin:()=>true,isMain:()=>false,profile:'Member 1',
    bottomNav:()=>'old-nav',home:()=>'',tripOverview:()=>'<section>Existing trip tools</section>',
    collectionsPage:()=>'',tripMembers:()=>'',expensesPage:()=>'',entryPage:()=>'',tripPage:()=>'',adminPage:()=>'',render:()=>{}
  };
  vm.createContext(context);
  vm.runInContext(script,context,{filename:'reference-premium.js'});
  return {t,calc,context,show:()=>context.tripOverview(t)};
}

test('Home renders tappable payment speedometer and current member totals',()=>{
 const {calc,t,show}=setup();
 let markup=show();
 assert.match(markup,/class="neon-payments" data-action="nav" data-view="collections"/);
 assert.match(markup,/role="progressbar".*aria-valuenow="32"/);
 assert.match(markup,/>32% collected</);
 assert.match(markup,/₹54,100/);
 assert.match(markup,/₹1,12,500/);
 assert.doesNotMatch(markup,/₹1,66,600/);
 assert.match(markup,/>17<\/b><small>Members/);
 calc.paid=88000;calc.pending=78600;calc.progress=120;t.members.pop();
 markup=show();
 assert.match(markup,/₹88,000/);
 assert.match(markup,/>16<\/b><small>Members/);
 assert.match(markup,/aria-valuenow="100"/);
 calc.progress=Number.NaN;
 assert.match(show(),/aria-valuenow="0"/);
});

test('Home shortcuts open the existing sections and quick editors',()=>{
 const {show}=setup();
 const actions=show().match(/<nav class="ref-hero-actions ref-luxe-actions"[\s\S]*?<\/nav>/)?.[0];
 assert.ok(actions);
 assert.equal((actions.match(/class="ref-action"/g)||[]).length,7);
 for(const action of ['data-ctx="plan"','data-view="tickets"','data-ctx="memories"','data-ctx="members"','data-view="collections"','data-action="quick-expense"','data-action="paid-by-person"'])assert.ok(actions.includes(action),action);
});

test('responsive gold card layout loaded and PWA caches fresh JS and CSS',()=>{
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(min-width:650px\)/);
  assert.match(css,/@media\(max-width:340px\)/);
  assert.match(css,/ref-luxe-actions \.ref-action-ico/);
  assert.match(css,/focus-visible|ref-action/);
  assert.match(html,/reference-premium\.js\?build=60/);
  assert.match(html,/home-circular-luxe\.css\?build=60/);
  assert.match(worker,/reference-premium\.js\?build=60/);
  assert.match(worker,/home-circular-luxe\.css\?build=60/);
});
