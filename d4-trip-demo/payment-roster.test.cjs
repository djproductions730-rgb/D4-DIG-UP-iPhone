'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const script=fs.readFileSync(path.join(root,'reference-premium.js'),'utf8');
const css=fs.readFileSync(path.join(root,'payment-roster.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
new vm.Script(script,{filename:'reference-premium.js'});

function contextFor({admin=true}={}){
 const names=['Fully Paid','Advance One','Advance Two','Awaiting A','Awaiting B','Awaiting C'];
 const t={
  id:'goa',name:'Goa Trip',destination:'Goa',start:'2026-11-23',end:'2026-11-27',
  members:names,admins:[],collection:{targetPerPerson:1000,payments:[
    {id:'a',member:'Fully Paid',amount:1000,date:'2026-11-02',method:'UPI'},
    {id:'b',member:'Advance One',amount:400,date:'2026-11-03',method:'Cash'},
    {id:'c',member:'Advance Two',amount:700,date:'2026-11-04',method:'UPI'}
  ]}
 };
 const c={
  document:{addEventListener:()=>{}},
  window:{},localStorage:{getItem:()=>null,setItem:()=>{}},
  esc:v=>String(v),money:v=>'₹'+Number(v).toLocaleString('en-IN'),
  current:()=>t,isTripAdmin:()=>admin,isMain:()=>false,
  profile:'Member One',view:'collections',tripTab:'overview',teamId:'goa',
  datesInTrip:()=>['2026-11-23','2026-11-24'],shortDate:s=>s,
  collectionTotals:trip=>{
   const each=trip.collection.targetPerPerson,rows=trip.members.map(member=>{
    const paid=trip.collection.payments.filter(p=>p.member===member).reduce((s,p)=>s+p.amount,0);
    return {member,paid,target:each,pending:Math.max(0,each-paid),
     status:paid>=each?'Paid':paid>0?'Partial':'Pending'};
   });
   const paid=rows.reduce((s,r)=>s+r.paid,0),target=rows.length*each;
   return {paid,target,pending:target-paid,progress:Math.round(paid/target*100),
    full:rows.filter(r=>r.status==='Paid').length,
    partial:rows.filter(r=>r.status==='Partial').length,
    unpaid:rows.filter(r=>r.status==='Pending').length,rows};
  },
  calculations:()=>({total:0,categories:{}}),
  bottomNav:()=>'',home:()=>'',entryPage:()=>'',profilePage:()=>'',render:()=>{},
  tripOverview:()=>'',tripMembers:()=>'',tripPage:()=>'',adminPage:()=>'',expensesPage:()=>'',collectionsPage:()=>'<p>Legacy payment tools</p>'
 };
 vm.createContext(c);vm.runInContext(script,c);
 return {c,t};
}

test('all six members appear in a scrollable page without pagination or popup',()=>{
 const {c}=contextFor(),page=c.collectionsPage();
 assert.match(page,/id="d4-payment-roster"/);
 assert.match(page,/data-roster-scroll/);
 assert.match(page,/data-roster-total="6"/);
 const roster=page.split('<section class="ref-payment-roster"')[1].split('<section class="ref-card ref-recent"')[0];
 assert.equal((roster.match(/data-roster-card/g)||[]).length,6);
 for(const name of ['Fully Paid','Advance One','Advance Two','Awaiting A','Awaiting B','Awaiting C']){
  assert.ok(roster.includes('>'+name+'</strong>'),name+' missing');
 }
 assert.match(css,/max-height:min\(57dvh,620px\)/,'Member list is independently scrollable');
});

test('paid, partial, unpaid groups and amounts are clearly separated',()=>{
 const {c}=contextFor(),page=c.collectionsPage();
 assert.match(page,/data-roster-group="paid"/);
 assert.match(page,/data-roster-group="partial"/);
 assert.match(page,/data-roster-group="unpaid"/);
 assert.match(page,/data-roster-filter="paid"/);
 assert.match(page,/data-roster-filter="partial"/);
 assert.match(page,/data-roster-filter="unpaid"/);
 assert.match(page,/ref-status-paid/);
 assert.match(page,/ref-status-partial/);
 assert.match(page,/ref-status-unpaid/);
 assert.match(page,/Paid <b>₹1,000<\/b>/);
 assert.match(page,/Balance <b>₹600<\/b>/);
 assert.match(page,/Balance <b>₹1,000<\/b>/);
 assert.match(css,/ref-status-unpaid/);
 assert.match(css,/ref-status-partial/);
});

test('admin sees per-member Edit Paid and Add, ordinary member can only read',()=>{
 const {c}=contextFor({admin:true}),markup=c.collectionsPage();
 const roster=markup.split('<section class="ref-payment-roster"')[1].split('<section class="ref-card ref-recent"')[0];
 assert.equal((roster.match(/data-action="collection-member-total"/g)||[]).length,6);
 assert.equal((roster.match(/data-action="collection-member-pay"/g)||[]).length,6);
 const viewer=contextFor({admin:false}).c.collectionsPage();
 const viewerRoster=viewer.split('<section class="ref-payment-roster"')[1].split('<section class="ref-card ref-recent"')[0];
 assert.doesNotMatch(viewerRoster,/data-action="collection-member-total"/);
 assert.doesNotMatch(viewerRoster,/data-action="collection-member-pay"/);
});

test('full member list is first; legacy tools are collapsible beneath it',()=>{
 const {c}=contextFor(),page=c.collectionsPage();
 assert.ok(page.indexOf('ref-payment-roster')<page.indexOf('ref-card ref-recent'));
 assert.match(page,/details class="ref-original-finance"/);
 assert.match(page,/Legacy payment tools/);
 assert.match(index,/payment-roster\.css\?build=40/);
 assert.match(css,/ref-roster-filter\.active/);
 assert.match(css,/ref-roster-search/);
});
