'use strict';
// D4 DIG UP iPhone: standalone local loan management.
// Imported Google Sheets records remain snapshots; no bank network requests occur.
function loanById(id){return data.loans.find(l=>String(l.id)===String(id));}
function validLoanDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(v+'T12:00:00Z'));}
function loanDay(v){return String(v||'').slice(0,10);}
function loanMonth(first,index){
 const d=new Date(loanDay(first)+'T12:00:00Z');
 if(Number.isNaN(d.getTime()))return '';
 const year=d.getUTCFullYear(),month=d.getUTCMonth()+index;
 const monthEnd=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return new Date(Date.UTC(year,month,Math.min(d.getUTCDate(),monthEnd))).toISOString().slice(0,10);
}
function loanEmi(l){
 const p=Number(l.principal)||0,months=Number(l.months)||1,r=(Number(l.annualRate)||0)/1200;
 const explicit=Number(l.emi);
 if(explicit>0&&Number.isFinite(explicit))return explicit;
 return r>0?p*r/(1-Math.pow(1+r,-months)):p/months;
}
function loanStatus(l,onDate=new Date().toISOString().slice(0,10)){
 let principal=Math.max(0,Number(l.principal)||0),interest=0,totalPaid=0,dueCount=0;
 const events=[];
 const months=Math.min(600,Math.max(0,Math.floor(Number(l.months)||0)));
 for(let i=0;i<months;i++){const d=loanMonth(l.firstDue,i);if(d&&d<=onDate)events.push({date:d,kind:0});}
 for(const p of l.payments||[]){const date=loanDay(p.date);const amount=Number(p.amount);if(date&&date<=onDate&&Number.isFinite(amount)&&amount>0)events.push({date,kind:1,amount});}
 events.sort((a,b)=>a.date.localeCompare(b.date)||a.kind-b.kind);
 const mRate=Math.max(0,Number(l.annualRate)||0)/1200;
 for(const e of events){
  if(e.kind===0){if(principal>0.005){interest+=principal*mRate;dueCount++;}}
  else {let payment=e.amount;totalPaid+=payment;const towardInterest=Math.min(interest,payment);interest-=towardInterest;payment-=towardInterest;principal=Math.max(0,principal-payment);}
  principal=Math.round(principal*100)/100;interest=Math.round(interest*100)/100;
 }
 const outstanding=Math.max(0,Math.round((principal+interest)*100)/100);
 const due=Math.max(0,Math.min(outstanding,loanEmi(l)*dueCount-totalPaid));
 let nextDue='';
 for(let i=0;i<months;i++){const day=loanMonth(l.firstDue,i);if(day>onDate){nextDue=day;break;}}
 return {outstanding,principal,interest,paid:totalPaid,due,nextDue,emi:loanEmi(l)};
}
function loansPage(){
 const list=Array.isArray(data.loans)?data.loans:[];
 const totalOutstanding=list.reduce((a,l)=>a+loanStatus(l).outstanding,0);
 let html='<div class="section-head"><h2>💳 Loans & EMI</h2><button class="button" type="button" data-loan-action="new">+ Add Loan</button></div>';
 html+='<div class="loan-hero"><div class="loan-hero-meta">ESTIMATED LOAN OUTSTANDING</div><div class="loan-hero-total">'+fmt(totalOutstanding)+'</div><div class="loan-hero-foot"><span>'+list.length+' Loans</span><span>Local tracker</span></div></div>';
 html+='<p class="loan-caption">Estimates use your entered interest rate, due dates and recorded payments. Lender balances may differ. Editing or marking an EMI paid here will not send money or update Google Sheets.</p>';
 if(!list.length)return html+'<div class="card empty"><div class="symbol">🪙</div><b>No loans added</b><p class="muted">Add a personal loan, pay-later balance or EMI to start tracking.</p></div>';
 html+=list.map(l=>{
  const st=loanStatus(l),paid=(l.payments||[]).reduce((a,p)=>a+Number(p.amount||0),0);
  return '<div class="loan-card"><div class="loan-card-head"><div class="loan-symbol">🪙</div><div class="grow"><div class="loan-title">'+tidy(l.name||'Unnamed Loan')+'</div><div class="muted">'+tidy(l.lender||'Lender not set')+'</div></div><button type="button" class="loan-small-btn" data-loan-action="edit" data-loan-id="'+tidy(l.id)+'">✎ Edit</button></div>'+
   '<div class="loan-balance-label">ESTIMATED REMAINING</div><div class="loan-balance">'+fmt(st.outstanding)+'</div>'+
   '<div class="loan-stats"><div><small>Monthly EMI</small><strong>'+fmt(st.emi)+'</strong></div><div><small>Total recorded paid</small><strong>'+fmt(paid)+'</strong></div></div>'+
   '<div class="loan-bottom"><span>📅 '+(st.nextDue?'Next due: '+tidy(st.nextDue):'No future scheduled EMI')+'</span><span>'+((Number(l.annualRate)||0)>0?tidy(l.annualRate)+'% APR':'0% APR')+'</span></div>'+
   '<div class="loan-actions"><button class="loan-pay" type="button" data-loan-action="pay" data-loan-id="'+tidy(l.id)+'">💸 Record EMI</button><button class="loan-history" type="button" data-loan-action="history" data-loan-id="'+tidy(l.id)+'">🧾 History</button></div></div>';
 }).join('');
 return html;
}
function loanBankOptions(selected){
 return '<option value="">Choose bank account</option>'+data.banks.map(b=>'<option value="'+tidy(String(b.id))+'"'+(String(b.id)===String(selected)?' selected':'')+'>'+tidy(b.name+' · '+(b.nick||'Account')+' ('+fmt(b.balance)+')')+'</option>').join('');
}
function loanForm(id){
 const l=id?loanById(id):null;if(id&&!l)return;
 const v=(x)=>tidy(x??'');
 const input=(name,label,value,type='text',extra='')=>'<label class="field" for="loan-'+name+'">'+label+'</label><input class="input" id="loan-'+name+'" type="'+type+'" value="'+v(value)+'" '+extra+' required>';
 const inputs=input('name','Loan name',l?.name||'', 'text','maxlength="80"')+
 input('lender','Lender / bank',l?.lender||'', 'text','maxlength="80"')+
 input('principal','Original principal (₹)',l?.principal??'', 'number','min="0.01" step="0.01"')+
 input('rate','Annual interest rate (%)',l?.annualRate??0,'number','min="0" max="100" step="0.01"')+
 input('months','Duration (months)',l?.months??12,'number','min="1" max="600" step="1"')+
 '<label class="field" for="loan-emi">Monthly EMI (₹) — 0 to auto-calculate</label><input class="input" id="loan-emi" type="number" min="0" step="0.01" value="'+v(l?.emi??0)+'" required>'+
 input('due','First due date',loanDay(l?.firstDue)||new Date().toISOString().slice(0,10),'date')+
 '<label class="field" for="loan-bank">Preferred payment bank (optional)</label><select class="input" id="loan-bank">'+loanBankOptions(data.banks.find(b=>b.name===l?.bank)?.id||'')+'</select>'+
 '<button class="button" type="submit" style="width:100%">💾 '+(l?'Save Loan Changes':'Add Loan')+'</button>';
 showSheet(l?'Edit Loan':'Add New Loan','<p class="loan-caption">Only this iPhone copy is updated. Existing EMI payment records are preserved.</p><form id="loan-form">'+inputs+'</form>');
 document.getElementById('loan-form').onsubmit=e=>{
  e.preventDefault();
  const el=name=>document.getElementById('loan-'+name).value;
  const name=el('name').trim(),lender=el('lender').trim(),principal=Number(el('principal')),annualRate=Number(el('rate')),months=Number(el('months')),emi=Number(el('emi')),firstDue=el('due'),bankID=el('bank');
  if(!name||!lender||!Number.isFinite(principal)||principal<=0||!Number.isFinite(annualRate)||annualRate<0||annualRate>100||!Number.isInteger(months)||months<1||months>600||!Number.isFinite(emi)||emi<0||!validLoanDate(firstDue)){alert('Check loan name, amounts, rate, duration and due date.');return;}
  const bank=data.banks.find(b=>String(b.id)===bankID);
  if(l){Object.assign(l,{name,lender,principal,annualRate,months,emi,firstDue,bank:bank?.name||''});}
  else data.loans.push({id:'local-loan-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,lender,principal,annualRate,months,emi,firstDue,bank:bank?.name||'',payments:[],local:true});
  closeSheet();tab='loans';save();
 };
}
function loanPaymentForm(id){
 const l=loanById(id);if(!l)return;
 if(!data.banks.length){alert('Add a bank account before recording an EMI payment.');openBankPicker();return;}
 const expected=loanEmi(l);
 showSheet('Record EMI · '+l.name,
 '<p class="loan-caption">Record a payment you already made. This does not transfer money. The chosen bank balance will decrease only when you save this NEW payment.</p>'+
 '<form id="emi-form"><label class="field">Pay from bank</label><select class="input" id="emi-bank" required>'+loanBankOptions(data.banks.find(b=>b.name===l.bank)?.id||'')+'</select>'+
 '<label class="field">Paid amount (₹)</label><input class="input" id="emi-amount" type="number" required min="0.01" step="0.01" value="'+Number(expected).toFixed(2)+'">'+
 '<label class="field">Payment date</label><input class="input" id="emi-date" type="date" required value="'+new Date().toISOString().slice(0,10)+'">'+
 '<label class="field">Payment note</label><input class="input" id="emi-note" maxlength="180" value="'+tidy(l.name+' EMI payment')+'">'+
 '<button type="submit" class="button" style="width:100%">✅ Save Payment & Deduct Bank</button></form>');
 document.getElementById('emi-form').onsubmit=e=>{
  e.preventDefault();
  const bankID=document.getElementById('emi-bank').value;
  const bank=data.banks.find(b=>String(b.id)===bankID);
  const amount=Number(document.getElementById('emi-amount').value);
  const date=document.getElementById('emi-date').value;
  const note=document.getElementById('emi-note').value.trim();
  const today=new Date().toISOString().slice(0,10);
  if(!bank||!Number.isFinite(amount)||amount<=0||!validLoanDate(date)||date>today){alert('Select a bank and enter a valid past/today payment.');return;}
  if(Number(bank.balance)<amount&&!confirm('Bank balance will become negative. Continue?'))return;
  if(!confirm('Record '+fmt(amount)+' paid from '+bank.name+' for '+l.name+'? This will deduct only this bank balance, not send money.'))return;
  const id='local-emi-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const txId='loan-tx-'+id;
  bank.balance=Math.round((Number(bank.balance)-amount)*100)/100;
  if(!Array.isArray(l.payments))l.payments=[];
  l.payments.push({id,date,amount,bank:bank.name,bankId:bank.id,txId,note,local:true});
  data.entries.push({id:txId,bankId:bank.id,type:'Expense',category:'Loan EMI',note:note||'EMI payment · '+l.name,amount,created:date+'T12:00:00',loanId:l.id,loanPaymentId:id});
  closeSheet();tab='loans';save();
 };
}
function loanHistory(id){
 const l=loanById(id);if(!l)return;
 const pays=(l.payments||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 let content='<div class="loan-hero"><div class="loan-hero-meta">ESTIMATED OUTSTANDING</div><div class="loan-hero-total">'+fmt(loanStatus(l).outstanding)+'</div></div>'+
 '<h2>📋 Payment History</h2>';
 if(!pays.length)content+='<div class="card empty">No payments recorded yet.</div>';
 else content+=pays.map(p=>'<div class="card"><div class="row"><div><strong>'+fmt(p.amount)+'</strong><div class="muted">'+tidy(loanDay(p.date)||'')+' · '+tidy(p.bank||'Bank not recorded')+'</div></div>'+(p.local===true?'<button type="button" class="loan-small-btn" data-loan-action="undo" data-loan-id="'+tidy(l.id)+'" data-payment-id="'+tidy(p.id)+'">Undo</button>':'<span class="pill">Imported</span>')+'</div>'+(p.note?'<p class="muted">'+tidy(p.note)+'</p>':'')+'</div>').join('');
 content+='<p class="loan-caption">Imported payments are already reflected in original transactions and will not deduct your bank balance again. Undo is available only for newly recorded local payments.</p>';
 showSheet('History · '+l.name,content);
}
function undoLocalLoanPayment(loanId,paymentId){
 const l=loanById(loanId);if(!l)return;
 const payment=(l.payments||[]).find(p=>String(p.id)===String(paymentId)&&p.local===true);
 if(!payment)return alert('Only new local payments can be undone.');
 const tx=data.entries.find(e=>String(e.id)===String(payment.txId)&&String(e.loanPaymentId)===String(payment.id));
 const bank=data.banks.find(b=>String(b.id)===String(payment.bankId));
 if(!bank||!tx)return alert('Linked local bank transaction is unavailable. No changes were made.');
 if(!confirm('Undo this local EMI entry and refund '+fmt(payment.amount)+' to '+bank.name+'?'))return;
 bank.balance=Math.round((Number(bank.balance)+Number(payment.amount))*100)/100;
 l.payments=l.payments.filter(p=>p!==payment);
 data.entries=data.entries.filter(e=>e!==tx);
 closeSheet();tab='loans';save();
}
function handleLoanAction(action,id,paymentId){
 if(action==='new')loanForm();
 if(action==='edit')loanForm(id);
 if(action==='pay')loanPaymentForm(id);
 if(action==='history')loanHistory(id);
 if(action==='undo')undoLocalLoanPayment(id,paymentId);
}
