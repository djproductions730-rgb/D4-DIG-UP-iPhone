'use strict';
(function(){
 function entryDate(e){const v=e.date||e.created||e.when||e.timestamp;if(!v)return null;const text=String(v);if(/^\d{4}-\d{2}-\d{2}$/.test(text)){const [y,m,d]=text.split('-').map(Number);const date=new Date(y,m-1,d);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null}const date=new Date(v);return Number.isFinite(date.getTime())?date:null}
 function timeOfDay(entry,date){
  const value=entry.created||entry.when||entry.timestamp||date;
  if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return 0;
  const stamp=new Date(value);
  return Number.isFinite(stamp.getTime())?((stamp.getHours()*60+stamp.getMinutes())*60+stamp.getSeconds())*1000+stamp.getMilliseconds():0;
 }
 function calendarDay(date){return date?new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime():-Infinity}
 function filterEntries(entries,filter,year,now=new Date()){const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);let start=null,end=tomorrow;
  if(filter==='today')start=today;
  else if(filter==='yesterday'){start=new Date(today);start.setDate(start.getDate()-1);end=today}
  else if(filter==='week'){start=new Date(today);start.setDate(start.getDate()-(start.getDay()+6)%7);end=new Date(start);end.setDate(end.getDate()+7)}
  else if(filter==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,1)}
  else if(filter==='year'){start=new Date(Number(year),0,1);end=new Date(Number(year)+1,0,1)}
  return entries.map((entry,index)=>({entry,index,date:entryDate(entry)})).filter(row=>filter==='all'||row.date&&start&&row.date>=start&&row.date<end).sort((a,b)=>calendarDay(b.date)-calendarDay(a.date)||timeOfDay(b.entry,b.date)-timeOfDay(a.entry,a.date)||b.index-a.index);
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={filterEntries,entryDate};return}
 let range='all',selectedYear=new Date().getFullYear();const labels={all:'All',today:'Today',yesterday:'Yesterday',week:'This Week',month:'This Month',year:'Year'};
 const style=document.createElement('style');
 style.textContent=`
.history-premium-head,.premium-card-footer,.premium-balance{display:flex;align-items:center;justify-content:space-between;gap:8px}
.history-premium-head h2{margin-bottom:3px}.history-premium-head p,.history-result-note{font-size:12px;color:#d5c7e5}.history-year .input{max-width:160px}
.history-filters{display:flex;gap:6px;flex-wrap:wrap}.history-filter,.history-add,.premium-edit{padding:9px 12px;border-radius:12px;color:#fff;background:#342144;border:1px solid #9f68b7}.history-filter[aria-pressed=true],.history-add{background:#75289b}
.history-date-heading{font-size:15px;color:#eedcff}.history-statement-card{color:white!important;margin:12px 0;padding:14px!important;background:radial-gradient(ellipse at top left,#682985,transparent 75%),linear-gradient(130deg,#38134d,#190d2e)!important;border:1.5px solid #da93ff!important;box-shadow:inset 0 0 9px #dc8dff66,0 0 13px #b43af465!important;border-radius:20px!important}
.premium-bank-corner{font-size:12px;color:#e5d4f5;font-weight:700}.history-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:15px 0}.history-row .grow{min-width:75px;flex:1;overflow-wrap:anywhere}.history-row .label{font-weight:850;color:white;font-size:16px}.history-row .muted{color:#dfcdec}.history-row .right{margin-left:auto}
.history-row .badge-icon{width:46px;height:48px;border-radius:12px;background:linear-gradient(135deg,#bb68d4,#531674);border:1px solid #e7abff;overflow:hidden}.history-row .category-art{max-width:100%;max-height:100%;object-fit:contain}
.statement-amount{font-size:clamp(17px,4.8vw,24px);font-weight:900}.statement-amount.expense{color:#ff688b}.statement-amount.income{color:#63f583}
.premium-balance{display:grid;grid-template-columns:1fr 1fr;padding:10px;border:1px solid #9e59b7;border-radius:11px;background:#2a0e3e;color:#f0dffa;font-size:12px}.premium-balance span+span{border-left:1px solid #a465b2;padding-left:12px}.premium-balance strong{display:block;color:white;font-size:16px}.premium-balance.unavailable{display:block}.premium-card-footer{margin-top:9px;color:#d5bbdf;font-size:11px}.premium-edit{padding:5px 10px}
 .history-statement-card.expense-card{--edge:#f58190;--glow:#ef44594a;--top:#762632;--base:#290e17;--tint:#ffb3c0}
 .history-statement-card.income-card{--edge:#63dba1;--glow:#35ce8b40;--top:#18593f;--base:#09261b;--tint:#acf3ca}
 .history-statement-card:is(.expense-card,.income-card){background:linear-gradient(135deg,var(--top),var(--base) 87%)!important;border-color:var(--edge)!important;box-shadow:inset 0 0 8px var(--glow),0 3px 14px var(--glow)!important}
 .history-statement-card:is(.expense-card,.income-card) :is(.badge-icon,.premium-balance,.premium-edit){background:var(--base)!important;border-color:var(--edge)!important;color:#fff}
 .history-statement-card:is(.expense-card,.income-card) :is(.muted,.premium-card-footer,.premium-bank-corner){color:var(--tint)}
 .balance-estimate{grid-column:1/-1;font-size:10px;color:inherit}
 .premium-bank-corner{display:flex;align-items:center;gap:7px}
 .premium-bank-corner .bank-logo{width:32px;height:32px;padding:4px;border-radius:8px}
 .premium-bank-corner .bank-logo>span:not([hidden]){font-size:0}
 .premium-bank-corner .bank-logo>span:not([hidden])::after{content:'🏦';font-size:16px}

 .sad-spends{margin:18px 0;padding:14px;border:1px solid #f46add;border-radius:18px;background:radial-gradient(ellipse at 12% 70%,#41103e,transparent 56%),#180a1d;color:#fff;box-shadow:0 0 14px #eb3bbe44}
 .sad-spends header{display:flex;align-items:center;justify-content:space-between;gap:7px;flex-wrap:wrap;padding:0}
 .sad-spends h2{margin:0;color:white;font-size:19px}.sad-spends header div{display:flex;border:1px solid #8c4a90;border-radius:12px;overflow:hidden}.sad-spends button{background:#231029;color:white;padding:7px 10px;font-size:12px}.sad-spends button[aria-pressed=true]{background:#aa167d}
 .sad-spends footer{padding:5px 0 9px;color:#dfc7dc;font-size:13px}.sad-spends footer b{color:#ff90d7}
 .spend-spotlight{display:grid;grid-template-columns:minmax(90px,33%) minmax(0,1fr);gap:9px;align-items:center}
 .spotlight-wallet{display:block;width:100%;height:auto;mask-image:radial-gradient(ellipse 71% 71%,black 64%,transparent 100%)}
 .sad-spends ol{display:grid;gap:6px;margin:0;padding:0;list-style:none;min-width:0}
 .sad-spends li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:2px 6px;background:#241124;border:1px solid #75416d;border-radius:10px;padding:5px 8px;font-size:13px;overflow-wrap:anywhere}
 .sad-spends li:first-child{padding-block:10px;background:linear-gradient(105deg,#7e194e,#381029);border-color:#ff72af;box-shadow:0 0 8px #ed398348}
 .spend-art{grid-row:span 2}.spend-art :is(svg,img){display:block;width:48px;height:48px;object-fit:contain}
 .sad-spends li b{grid-row:span 2}.sad-spends li strong,.sad-spends li small{text-align:right}.sad-spends li strong{font-size:14px}.sad-spends li:first-child strong{font-size:18px}.sad-spends li small{color:#ffc0d8}
 @media(max-width:520px){
  .sad-spends{padding:10px}.spend-spotlight{grid-template-columns:32% minmax(0,1fr);gap:7px}
  .sad-spends li{grid-template-columns:44px minmax(0,1fr);gap:2px 6px;padding:6px}
  .sad-spends .spend-art{grid-row:1 / span 3}.sad-spends .spend-art :is(svg,img){width:44px;height:44px}
  .sad-spends li b,.sad-spends li strong,.sad-spends li small{grid-column:2;grid-row:auto;text-align:left}
 }
 
 `;document.head.appendChild(style);
 function historyBalances(banks, entries){
  const valid=value=>value!=null&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const paise=value=>Math.round(Number(value)*100);
  const running=new Map(banks.filter(b=>valid(b.balance)).map(b=>[String(b.id),paise(b.balance)]));
  function account(id,name){
   if(id!=null&&String(id)!=='')return String(id);
   const matches=banks.filter(b=>name&&String(b.name).trim().toLowerCase()===String(name).trim().toLowerCase());
   return matches.length===1?String(matches[0].id):null;
  }
  const balances=[];
  for(let i=entries.length-1;i>=0;i--){
   const e=entries[i],transfer=e.type==='Transfer';
   const source=account(e.bankId,transfer?e.fromBank:e.bank);
   const target=transfer?account(e.toBankId,e.toBank):null;
   const known=valid(e.balanceBefore)&&valid(e.balanceAfter);
   if(known)balances[i]={before:Number(e.balanceBefore),after:Number(e.balanceAfter),estimated:false};
   if(!valid(e.amount)||!['Income','Expense','Transfer'].includes(e.type)){
    running.delete(source);running.delete(target);continue;
   }
   const amount=paise(e.amount);
   if(transfer&&running.has(target))running.set(target,running.get(target)-amount);
   const after=known?paise(e.balanceAfter):running.get(source);
   if(after===undefined)continue;
   const before=known?paise(e.balanceBefore):after+(e.type==='Income'?-amount:amount);
   if(!known)balances[i]={before:before/100,after:after/100,estimated:true};
   if(source!==null)running.set(source,before);
  }
  return balances;
 }
 function bankMark(name){
  if(/pluxee|sodexo/i.test(name))return '<span class="bank-logo" role="img" aria-label="Pluxee"><img src="./assets/brands/pluxee-symbol.png" alt=""></span>';
  const mark=badge(name);
  if(mark.includes('class="bank-logo"'))return mark;
  return '<span class="bank-logo" role="img" aria-label="'+tidy(name)+'">🏦</span>';
 }
 function dayKey(date){return date?[date.getFullYear(),date.getMonth()+1,date.getDate()].join('-'):'unknown'}
 function dayLabel(date){if(!date)return 'Date unavailable';const now=new Date(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);if(dayKey(date)===dayKey(now))return 'Today';if(dayKey(date)===dayKey(yesterday))return 'Yesterday';return date.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
 let spendRange='month',selectedBankName='';
 const spendLabels={today:'Day',week:'Week',month:'Month'};
 window.renderTopSpends=function(){
  const amounts=new Map();
  let total=0;
  for(const {entry} of filterEntries(data.entries,spendRange,selectedYear)){
   const paise=Math.round(Number(entry.amount)*100);
   if(entry.type!=='Expense'||!Number.isFinite(paise)||paise<=0)continue;
   const name=String(entry.category||'').trim()||'Other';
   amounts.set(name,(amounts.get(name)||0)+paise);
   total+=paise;
  }
  const top=[...amounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3);
  const period={today:'Today',week:'This Week',month:'This Month'}[spendRange];
  const tabs=Object.entries(spendLabels).map(([key,label])=>`<button type="button" data-spend-range="${key}" aria-pressed="${key===spendRange}">${label}</button>`).join('');
  const share=amount=>Math.round(amount*100/total)+'%';
  const cards=top.map(([name,paise])=>`<li><span class="spend-art" aria-hidden="true">${categoryIcon(name)}</span><b>${tidy(name)}</b><strong>${fmt(paise/100)}</strong><small>${share(paise)}</small></li>`).join('');
  return `<section class="sad-spends"><header><h2>Top 3 Spends</h2><div role="group" aria-label="Top spends period">${tabs}</div></header><footer>${period} · Total spent <b>${fmt(total/100)}</b></footer><div class="spend-spotlight"><img class="spotlight-wallet" src="./assets/spotlight-wallet.webp" width="295" height="246" alt="">${cards?`<ol>${cards}</ol>`:'<p>No expenses in this period.</p>'}</div></section>`;
 };
 function bankLabel(name){
  const label=String(name||'').trim();
  for(const [pattern,short] of [[/^hdfc( bank)?$/i,'HDFC'],[/^axis( bank)?$/i,'Axis'],[/^kotak( mahindra)?( bank)?$/i,'Kotak'],[/^(pluxee|sodexo)$/i,'Pluxee']]){
   if(pattern.test(label))return short;
  }
  return label||'Unassigned';
 }
 function filterHistoryByBank(periodRows){
  const names=new Map(),accounts=new Map();
  function register(name){
   const label=bankLabel(name),key=label.toLowerCase();
   if(!names.has(key))names.set(key,label);
   return key;
  }
  for(const name of ['HDFC','Axis','Kotak','Pluxee'])register(name);
  for(const bank of data.banks)accounts.set(String(bank.id),register(bank.name));
  function sides(entry){
   const source=accounts.get(String(entry.bankId))||register(entry.fromBank||entry.bank);
   const target=entry.type==='Transfer'?(accounts.get(String(entry.toBankId))||register(entry.toBank)):null;
   return [source,target];
  }
  for(const entry of data.entries)sides(entry);
  if(!names.has(selectedBankName))selectedBankName='';
  const rows=selectedBankName?periodRows.filter(({entry})=>sides(entry).includes(selectedBankName)):periodRows;
  const options=[['','All'],...names].map(([key,label])=>`<button class="history-filter" type="button" data-history-bank="${tidy(key)}" aria-pressed="${key===selectedBankName}">${tidy(label)}</button>`).join('');
  return {rows,html:`<h3>Bank</h3><div class="history-filters" role="group" aria-label="Filter by bank">${options}</div>`};
 }
 document.getElementById('view').addEventListener('click',event=>{
  const button=event.target.closest('[data-spend-range],[data-history-bank]');
  if(!button)return;
  if(button.hasAttribute('data-history-bank'))selectedBankName=button.dataset.historyBank;
  else spendRange=button.dataset.spendRange;
  render();
 });
 transactionHistory=function(){const {rows,html:bankControls}=filterHistoryByBank(filterEntries(data.entries,range,selectedYear));const years=Array.from(new Set([new Date().getFullYear(),selectedYear,...data.entries.map(entry=>entryDate(entry)?.getFullYear()).filter(Boolean)])).sort((a,b)=>b-a);let html='<div class="history-premium-head"><div><h2>Transaction History</h2><p>All your money movements</p></div><button class="history-add" type="button" onclick="openTransaction()">+ Add</button></div><div class="history-filters" role="group" aria-label="Filter transaction history">'+Object.entries(labels).map(([key,label])=>'<button class="history-filter" type="button" aria-pressed="'+(range===key)+'" data-history-range="'+key+'">'+label+'</button>').join('')+'</div>'+(range==='year'?'<div class="history-year"><label class="field" for="history-year">Choose year</label><select class="input" id="history-year" onchange="setHistoryYear(this.value)">'+years.map(y=>'<option '+(y===selectedYear?'selected':'')+'>'+y+'</option>').join('')+'</select></div>':'')+bankControls+'<p class="history-result-note" role="status">'+rows.length+' transaction'+(rows.length===1?'':'s')+' · '+(range==='year'?selectedYear:labels[range])+(range==='week'?' (Monday–Sunday)':'')+'</p>';
 html=html.replace('<div class="history-filters"', statementPanel(selectedBankName) + '<div class="history-filters"');
 if(!rows.length)return html+'<div class="card empty"><div class="symbol">🧾</div><b>No transactions in this period</b><p class="muted">Choose another date range or tap All to see your history.</p></div>';
 const balances=historyBalances(data.banks,data.entries);let group='';for(const {entry:e,index,date} of rows){const key=dayKey(date);if(key!==group){html+='<h3 class="history-date-heading">▣ &nbsp;'+tidy(dayLabel(date))+(date?', '+date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'')+'</h3>';group=key}const b=data.banks.find(b=>String(b.id)===String(e.bankId));
 const balance=balances[index];
 const isExpense=e.type==='Expense',isIncome=e.type==='Income';
 const sourceName=b?.name||e.fromBank||e.bank||'Bank';
 const destinationName=data.banks.find(bank=>String(bank.id)===String(e.toBankId))?.name||e.toBank||'Bank';
 const marks=e.type==='Transfer'?bankMark(sourceName)+'<span aria-label="to">→</span>'+bankMark(destinationName):bankMark(sourceName);
 const title=['Love','Brother','Sister'].includes(e.category)&&(e.personName||e.loveName)?e.category+' · '+(e.personName||e.loveName):e.category||'Other';
 const amountText=(isExpense?'↓ −':isIncome?'↑ +':'⇄')+fmt(e.amount);
 const payment=e.payment??e.paymentApp??'';
 const paymentLine=payment?'<div class="muted">'+upiApps.symbol(payment)+' '+tidy(payment)+'</div>':'';
 const dateText=date?date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'Date unavailable';
 const balanceHtml=balance?'<div class="premium-balance"><span>Before <strong>'+fmt(balance.before)+'</strong></span><span>After <strong>'+fmt(balance.after)+'</strong></span>'+(balance.estimated?'<small class="balance-estimate">Estimated from bank history</small>':'')+'</div>':'';
 html+='<article class="card history-statement-card '+(isExpense?'expense-card':isIncome?'income-card':'transfer-card')+'"><div class="premium-bank-corner">'+marks+'</div><div class="history-row"><div class="badge-icon">'+categoryIcon(e.category)+'</div><div class="grow"><div class="label">'+tidy(e.category==='Online Shopping'&&e.note?String(e.note).split(' · ')[0]:title)+'</div><div class="muted">'+tidy(e.category==='Online Shopping'?[e.category,...String(e.note||'').split(' · ').slice(1)].join(' · '):e.note||e.type||'Transaction')+'</div>'+paymentLine+'</div><div class="right"><div class="statement-amount '+(isExpense?'txamount expense':isIncome?'txamount income':'')+'">'+amountText+'</div><div class="muted">'+tidy(e.type||'')+'</div></div></div>'+balanceHtml+'<div class="premium-card-footer"><span>'+tidy(dateText)+'</span><button type="button" class="premium-edit" data-edit-entry="'+index+'" aria-label="Edit transaction '+(index+1)+'">✎ Edit</button></div></article>'}return html};
 window.statementRows=()=>filterHistoryByBank(filterEntries(data.entries,'all',selectedYear)).rows;
 window.setHistoryYear=function(year){const y=Number(year);if(!Number.isInteger(y)||y<1900||y>9999)return;selectedYear=y;range='year';render()};
 document.getElementById('view').addEventListener('click',e=>{const target=e.target.closest('[data-history-range]');if(target&&Object.hasOwn(labels,target.dataset.historyRange)){range=target.dataset.historyRange;render()}});
})();