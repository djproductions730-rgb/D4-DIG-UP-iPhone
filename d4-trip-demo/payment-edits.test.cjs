'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');

function extract(name){
 const start=html.indexOf('function '+name+'(');
 assert.notEqual(start,-1,'Missing function '+name);
 const end=html.indexOf('\n}\n',start);
 assert.notEqual(end,-1,'Unterminated function '+name);
 return html.slice(start,end+3);
}

function fixture(){
 const t={
  id:'trip-demo',members:['Alice','Bob'],admins:['Admin'],canEdit:true,
  collection:{targetPerPerson:1000,payments:[
   {id:'receipt-a',member:'Alice',amount:300,date:'2026-11-01',method:'UPI',note:'Advance'},
   {id:'receipt-b',member:'Bob',amount:500,date:'2026-11-02',method:'Cash',note:'Deposit'}
  ]}
 };
 let serial=0,shouldSave=true;
 const ctx={
  isTripAdmin:t=>t.canEdit,
  money:v=>'₹'+Number(v).toFixed(2),
  uid:()=> 'audit-'+(++serial),
  today:()=> '2026-11-08',
  profile:'Admin',
  saveTripChange(t,fn){
   const before=structuredClone(t);
   try{
    fn();
    if(!shouldSave)throw Error('Change not saved');
   }catch(e){
    Object.keys(t).forEach(k=>delete t[k]);
    Object.assign(t,before);
    throw e;
   }
  }
 };
 vm.createContext(ctx);
 for(const name of ['collectionTotals','collectionMemberTotalSave','collectionEditSave']){
  vm.runInContext(extract(name),ctx);
 }
 return {t,ctx,denyWrite:()=>{shouldSave=false}};
}

test('member paid total corrects one person and refreshes all dashboard totals',()=>{
 const {t,ctx}=fixture();
 assert.equal(ctx.collectionTotals(t).paid,800);
 let totals=ctx.collectionMemberTotalSave(t,'Alice','700');
 assert.equal(totals.paid,1200);
 assert.equal(totals.pending,800);
 assert.equal(totals.rows.find(r=>r.member==='Alice').paid,700);
 assert.equal(totals.rows.find(r=>r.member==='Bob').paid,500);
 assert.equal(t.collection.payments.length,3,'Old payments retained');
 assert.equal(t.collection.payments[2].amount,400,'Only correction delta is added');
 totals=ctx.collectionMemberTotalSave(t,'Alice','250');
 assert.equal(totals.rows.find(r=>r.member==='Alice').paid,250);
 assert.equal(totals.paid,750);
 assert.equal(totals.pending,1250);
 assert.equal(t.collection.payments[3].amount,-450,'Downward corrections retain ledger');
 assert.equal(t.collection.payments[3].adjustment,true);
});

test('editing one receipt updates that member total and keeps payment history',()=>{
 const {t,ctx}=fixture();
 let totals=ctx.collectionEditSave(t,'receipt-a',{member:'Alice',amount:'600',method:'UPI',date:'2026-11-05',note:'Updated advance'});
 assert.equal(totals.paid,1100);
 assert.equal(totals.rows.find(r=>r.member==='Alice').paid,600);
 assert.equal(t.collection.payments.length,2);
 assert.equal(t.collection.payments[0].editHistory.length,1);
 assert.equal(t.collection.payments[0].editHistory[0].previous.amount,300);
 assert.equal(t.collection.payments[0].date,'2026-11-05');
});

test('amount edits validate limits and admin permissions',()=>{
 const {t,ctx}=fixture();
 assert.throws(()=>ctx.collectionMemberTotalSave(t,'Alice','1001'),/exceeds the member target/);
 assert.throws(()=>ctx.collectionMemberTotalSave(t,'Alice','-5'),/valid amount/);
 assert.throws(()=>ctx.collectionMemberTotalSave(t,'Unknown','50'),/active trip member/);
 t.canEdit=false;
 assert.throws(()=>ctx.collectionMemberTotalSave(t,'Alice','400'),/Only Main Admin or Trip Admin/);
 assert.throws(()=>ctx.collectionEditSave(t,'receipt-a',{member:'Alice',amount:'500',method:'UPI',date:'2026-11-05',note:''}),/Trip Admin access/);
});

test('failed save restores the previous ledger and totals',()=>{
 const {t,ctx,denyWrite}=fixture();
 denyWrite();
 assert.throws(()=>ctx.collectionMemberTotalSave(t,'Alice','750'),/Change not saved/);
 assert.equal(ctx.collectionTotals(t).paid,800);
 assert.equal(t.collection.payments.length,2);
});

test('home UI renders member balances from collectionTotals with edit only for admins',()=>{
 const src=fs.readFileSync(__dirname+'/reference-premium.js','utf8');
 assert.match(src,/function memberAmountPanel\(t\)/);
 assert.match(src,/collectionTotals\(t\)/);
 assert.match(src,/home=function\(\)/);
 assert.match(src,/tripHero\(t\)\+memberAmountPanel\(t\)/);
 assert.match(src,/data-action="collection-member-total"/);
 assert.match(src,/class="ref-full-payment-history"/,'Full history keeps earlier receipts editable');
 assert.match(src,/data-action="collection-edit-payment"/,'Each original receipt has an edit action');
 const markup=fs.readFileSync(__dirname+'/index.html','utf8');
 assert.match(markup,/case 'collection-member-total':/);
 assert.match(markup,/case 'collection-payment-edit':/);
});
