'use strict';
(function(){
 function entryDate(e){const v=e.date||e.created||e.when;if(!v)return null;const text=String(v);if(/^\d{4}-\d{2}-\d{2}$/.test(text)){const [y,m,d]=text.split('-').map(Number);const date=new Date(y,m-1,d);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null}const date=new Date(v);return Number.isFinite(date.getTime())?date:null}
 function filterEntries(entries,filter,year,now=new Date()){const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);let start=null,end=tomorrow;
  if(filter==='today')start=today;
  else if(filter==='yesterday'){start=new Date(today);start.setDate(start.getDate()-1);end=today}
  else if(filter==='week'){start=new Date(today);start.setDate(start.getDate()-(start.getDay()+6)%7);end=new Date(start);end.setDate(end.getDate()+7)}
  else if(filter==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,1)}
  else if(filter==='year'){start=new Date(Number(year),0,1);end=new Date(Number(year)+1,0,1)}
  return entries.map((entry,index)=>({entry,index,date:entryDate(entry)})).filter(row=>filter==='all'||row.date&&start&&row.date>=start&&row.date<end).sort((a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0)||b.index-a.index);
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
 function dayKey(date){return date?[date.getFullYear(),date.getMonth()+1,date.getDate()].join('-'):'unknown'}
 function dayLabel(date){if(!date)return 'Date unavailable';const now=new Date(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);if(dayKey(date)===dayKey(now))return 'Today';if(dayKey(date)===dayKey(yesterday))return 'Yesterday';return date.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
 transactionHistory=function(){const rows=filterEntries(data.entries,range,selectedYear);const years=Array.from(new Set([new Date().getFullYear(),selectedYear,...data.entries.map(entry=>entryDate(entry)?.getFullYear()).filter(Boolean)])).sort((a,b)=>b-a);let html='<div class="history-premium-head"><div><h2>Transaction History</h2><p>All your money movements</p></div><button class="history-add" type="button" onclick="openTransaction()">+ Add</button></div><div class="history-filters" role="group" aria-label="Filter transaction history">'+Object.entries(labels).map(([key,label])=>'<button class="history-filter" type="button" aria-pressed="'+(range===key)+'" data-history-range="'+key+'">'+label+'</button>').join('')+'</div>'+(range==='year'?'<div class="history-year"><label class="field" for="history-year">Choose year</label><select class="input" id="history-year" onchange="setHistoryYear(this.value)">'+years.map(y=>'<option '+(y===selectedYear?'selected':'')+'>'+y+'</option>').join('')+'</select></div>':'')+'<p class="history-result-note" role="status">'+rows.length+' transaction'+(rows.length===1?'':'s')+' · '+(range==='year'?selectedYear:labels[range])+(range==='week'?' (Monday–Sunday)':'')+'</p>';
 if(!rows.length)return html+'<div class="card empty"><div class="symbol">🧾</div><b>No transactions in this period</b><p class="muted">Choose another date range or tap All to see your history.</p></div>';
 const balances=historyBalances(data.banks,data.entries);let group='';for(const {entry:e,index,date} of rows){const key=dayKey(date);if(key!==group){html+='<h3 class="history-date-heading">▣ &nbsp;'+tidy(dayLabel(date))+(date?', '+date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'')+'</h3>';group=key}const b=data.banks.find(b=>String(b.id)===String(e.bankId));
 const balance=balances[index];
 const isExpense=e.type==='Expense',isIncome=e.type==='Income';
 const bankName=e.type==='Transfer'?(e.fromBank+' → '+e.toBank):(b?.name||e.bank||'Unassigned original entry');
 const bankKind=/hdfc/i.test(bankName)?'hdfc':/kotak/i.test(bankName)?'kotak':/axis/i.test(bankName)?'axis':/icici/i.test(bankName)?'icici':/\\bsbi\\b|state bank/i.test(bankName)?'sbi':/pluxee|sodexo/i.test(bankName)?'pluxee':'other';
 const bankGlyph={hdfc:'',kotak:'K',axis:'A',icici:'i',sbi:'SBI',pluxee:'P',other:'🏦'}[bankKind];
 const title=['Love','Brother','Sister'].includes(e.category)&&(e.personName||e.loveName)?e.category+' · '+(e.personName||e.loveName):e.category||'Other';
 const amountText=(isExpense?'↓ −':isIncome?'↑ +':'⇄')+fmt(e.amount);
 const dateText=date?date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'Date unavailable';
 const balanceHtml=balance?'<div class="premium-balance"><span>Before <strong>'+fmt(balance.before)+'</strong></span><span>After <strong>'+fmt(balance.after)+'</strong></span>'+(balance.estimated?'<small class="balance-estimate">Estimated from bank history</small>':'')+'</div>':'';
 html+='<article class="card history-statement-card '+(isExpense?'expense-card':isIncome?'income-card':'transfer-card')+'"><div class="premium-bank-corner" title="'+tidy(bankName)+'"><span class="statement-bank-icon '+bankKind+'" role="img" aria-label="'+tidy(bankName)+' bank symbol">'+bankGlyph+'</span> '+tidy(bankName)+'</div><div class="history-row"><div class="badge-icon">'+categoryIcon(e.category)+'</div><div class="grow"><div class="label">'+tidy(e.category==='Online Shopping'&&e.note?String(e.note).split(' · ')[0]:title)+'</div><div class="muted">'+tidy(e.category==='Online Shopping'?[e.category,...String(e.note||'').split(' · ').slice(1)].join(' · '):e.note||e.type||'Transaction')+'</div></div><div class="right"><div class="statement-amount '+(isExpense?'txamount expense':isIncome?'txamount income':'')+'">'+amountText+'</div><div class="muted">'+tidy(e.type||'')+'</div></div></div>'+balanceHtml+'<div class="premium-card-footer"><span>'+tidy(dateText)+'</span><button type="button" class="premium-edit" data-edit-entry="'+index+'" aria-label="Edit transaction '+(index+1)+'">✎ Edit</button></div></article>'}return html};
 window.setHistoryYear=function(year){const y=Number(year);if(!Number.isInteger(y)||y<1900||y>9999)return;selectedYear=y;range='year';render()};
 document.getElementById('view').addEventListener('click',e=>{const target=e.target.closest('[data-history-range]');if(target&&Object.hasOwn(labels,target.dataset.historyRange)){range=target.dataset.historyRange;render()}});
})();