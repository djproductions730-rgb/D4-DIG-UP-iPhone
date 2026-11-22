'use strict';
(function(){
 const previous=plans;
 const cash=n=>fmt(Math.round((Number(n)||0)*100)/100);
 const safe=s=>tidy(String(s??''));
 const isGoa=p=>p&&p.kind!=='savingGoal'&&/goa/i.test(p.name||'');
 const rows=(p,i)=>data.entries.filter(e=>e.tripLinked===true&&e.type==='Expense'&&String(e.tripPlanId)===String(p.tripPlanId||'plan-index-'+i));
 const icon=c=>/train|ticket/i.test(c)?'🚆':/snack/i.test(c)?'🍿':/food/i.test(c)?'🍴':/accessor|shop/i.test(c)?'🛍️':/travel|transport/i.test(c)?'🚐':/hotel|stay/i.test(c)?'🛏️':/activit/i.test(c)?'🌴':'🧳';
 function journal(p,i){
  const past=Array.isArray(p.planEntries)?p.planEntries.filter(x=>x.kind==='expense'):[];
  const linked=rows(p,i),spent=Number(p.actualSpent||0)+linked.reduce((s,e)=>s+Number(e.amount||0),0),target=Number(p.target||0),remaining=target-spent;
  const opening=Math.max(0,Math.round((Number(p.actualSpent||0)-past.reduce((s,e)=>s+Number(e.amount||0),0))*100)/100);
  const groups=new Map();if(opening)groups.set('Previously recorded',opening);
  for(const x of past)groups.set(x.category||'Other',(groups.get(x.category||'Other')||0)+Number(x.amount||0));
  for(const x of linked)groups.set(x.tripCategory||'Other',(groups.get(x.tripCategory||'Other')||0)+Number(x.amount||0));
  const percent=target?Math.round(spent/target*100):0;
  const recent=[...past.map(x=>({date:x.date,category:x.category,note:x.note,amount:x.amount})),...linked.map(x=>({date:x.date||String(x.created||'').slice(0,10),category:x.tripCategory,note:x.note,amount:x.amount}))].reverse().slice(0,5);
  return '<article class="goa-journal"><div class="goa-cover"><div class="goa-cover-top">D4 <strong>DIG UP</strong><span>TRAVEL JOURNAL</span></div><div class="goa-cover-title">Goa <em>Travel Journal</em></div><div class="goa-cover-sub">'+safe(p.note||'Travel and advance')+'</div></div>'+
   '<div class="goa-j-stats"><div class="goa-j-ring" style="--pct:'+Math.min(100,Math.max(0,percent))+'%"><b>'+percent+'%</b></div><div><small>Target</small><b>'+cash(target)+'</b></div><div><small>Spent</small><b>'+cash(spent)+'</b></div><div><small>Remaining</small><b class="'+(remaining>=0?'positive':'negative')+'">'+cash(remaining)+'</b></div></div>'+
   '<div class="goa-j-date">📅 '+safe(String(p.dueDate||p.targetDate||'').slice(0,10))+'</div>'+
   '<div class="goa-j-actions"><button onclick="openLinkedTripExpense(undefined,'+i+')"><span>🧾</span>Add Trip Expense</button><button onclick="openPlanEntry('+i+',\'saving\')"><span>🐷</span>Add Savings</button><button onclick="go(\'transactions\')"><span>☷</span>Transactions</button><button onclick="openPlanEditor('+i+')"><span>✎</span>Edit Plan</button></div>'+
   '<div class="goa-j-heading">📊 Category Breakdown <b>'+cash(spent)+'</b></div><div class="goa-j-cats">'+[...groups].map(([c,n])=>'<div class="goa-j-cat"><span>'+icon(c)+'</span><small>'+safe(c)+'</small><b>'+cash(n)+'</b></div>').join('')+'</div>'+
   '<div class="goa-j-heading">🧳 Recent Trip Expenses <b>'+recent.length+' entries</b></div><div class="goa-j-recent">'+recent.map(x=>'<div><span>'+icon(x.category)+'</span><section><b>'+safe(x.note||x.category||'Expense')+'</b><small>'+safe(x.date||'Previously recorded')+' · '+safe(x.category||'Other')+'</small></section><strong>'+cash(x.amount)+'</strong></div>').join('')+'</div>'+
   '<details class="goa-j-linked"><summary>🔗 Bank-linked Trip Expenses · '+cash(linked.reduce((s,e)=>s+Number(e.amount||0),0))+'</summary>'+linked.map(e=>'<div>'+safe(e.note||e.tripCategory)+' · '+cash(e.amount)+' <button onclick="openLinkedTripExpense(\''+safe(e.id)+'\')">Edit</button></div>').join('')+'</details>'+
   '<div class="goa-j-foot">New Trip Expenses update Transactions and the selected Bank balance. Previous records stay unchanged.</div></article>';
 }
 plans=function(){
  let html=previous(),i=0;
  return html.replace(/<article class="fp">[\s\S]*?<\/article>/g,m=>{
   while(i<data.plans.length&&data.plans[i].kind==='savingGoal')i++;
   const index=i++,p=data.plans[index];
   return isGoa(p)?journal(p,index):m;
  });
 };
})();
