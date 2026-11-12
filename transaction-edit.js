'use strict';
(function(){
 const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
 function entryDate(entry){if(/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date||'')))return entry.date;const parsed=new Date(entry.created||entry.when||Date.now()),d=Number.isFinite(parsed.getTime())?parsed:new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
 function bankFor(current,id,name){if(id){const b=current.banks.find(b=>String(b.id)===String(id));if(b)return b;throw Error('The transaction bank account is missing.');}const matches=current.banks.filter(b=>b.name===name);if(matches.length!==1)throw Error('The bank account cannot be matched safely.');return matches[0]}
 function linked(entry){return Boolean(entry.loanId||entry.loanPaymentId||entry.planId||entry.planID||entry.loanID)||/loan|emi/i.test(entry.category||'')}
 function editData(current,index,change){
  if(!Number.isInteger(index)||!current.entries[index])throw Error('Transaction unavailable.');
  const next=JSON.parse(JSON.stringify(current)),old=next.entries[index];
  if(linked(old))throw Error('This entry is linked to a loan or plan. Manage it from that loan or plan to keep its history consistent.');
  const amount=Number(change.amount);if(!Number.isFinite(amount)||amount<=0||amount>1e11||Math.abs(amount-round(amount))>1e-7)throw Error('Enter a positive amount with up to two decimal places.');
  const date=String(change.date||'');const dt=new Date(date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==date)throw Error('Choose a valid date.');
  const type=old.type==='Transfer'?'Transfer':change.type;if(!['Expense','Income','Transfer'].includes(type))throw Error('Unsupported transaction type.');
  if(!Number.isFinite(Number(old.amount))||Number(old.amount)<0)throw Error('Original transaction amount is invalid.');
  const adjust=(bank,delta)=>{if(!Number.isFinite(Number(bank.balance)))throw Error('Invalid bank balance.');bank.balance=round(Number(bank.balance)+delta);if(Math.abs(bank.balance)>1e12)throw Error('Balance is outside supported limits.')};
  const apply=(e,direction)=>{const amount=Number(e.amount);if(e.type==='Transfer'){const from=bankFor(next,e.bankId,e.fromBank),to=bankFor(next,e.toBankId,e.toBank);if(String(from.id)===String(to.id))throw Error('Choose two different accounts.');adjust(from,-amount*direction);adjust(to,amount*direction)}else if(e.type==='Income'||e.type==='Expense'){adjust(bankFor(next,e.bankId,e.bank),(e.type==='Income'?amount:-amount)*direction)}else throw Error('Unsupported original transaction type.')};
  const priorStamp=old.created||old.when;
  const clock=new Date(priorStamp);
  const time=Number.isFinite(clock.getTime())?clock.toTimeString().slice(0,8)+'.'+String(clock.getMilliseconds()).padStart(3,'0'):'12:00:00';
  const created=date===entryDate(old)&&priorStamp?priorStamp:date+'T'+time;
  const entry={...old,type,amount:round(amount),date,created,note:String(change.note||'').trim().slice(0,500),updatedAt:new Date().toISOString()};
  if(change.payment!==undefined)entry.payment=String(change.payment).trim().slice(0,80);
  if(type==='Transfer'){const from=bankFor(next,change.bankId,''),to=bankFor(next,change.toBankId,'');entry.bankId=String(from.id);entry.toBankId=String(to.id);entry.bank=from.name;entry.fromBank=from.name;entry.toBank=to.name;entry.category='Transfer'}else{const bank=bankFor(next,change.bankId,'');entry.bankId=String(bank.id);entry.bank=bank.name;entry.category=String(change.category||'Other').trim().slice(0,80)||'Other';delete entry.toBankId;delete entry.fromBank;delete entry.toBank}
  if(['Love','Brother','Sister'].includes(entry.category)){entry.personName=String(change.loveName??old.personName??old.loveName??'').trim().slice(0,70);if(entry.category==='Love')entry.loveName=entry.personName;else delete entry.loveName}else{delete entry.loveName;delete entry.personName}
  if(next.banks.some(b=>/^pluxee$/i.test(String(b.name).trim())&&[String(old.bankId),String(entry.bankId)].includes(String(b.id)))){
   const changes=[];
   for(const field of ['date','amount','note','category','type','bankId']){
    const before=field==='date'?entryDate(old):String(old[field]??'');
    const after=String(entry[field]??'');
    if(before!==after)changes.push({field,before,after});
   }
   if(changes.length)entry.pxEdits=[...(Array.isArray(old.pxEdits)?old.pxEdits:[]),{at:entry.updatedAt,changes}];
  }
  apply(old,-1);apply(entry,1);if(entry.type!==old.type||Number(entry.amount)!==Number(old.amount)||String(entry.bankId)!==String(old.bankId)||date!==entryDate(old)){delete entry.balanceBefore;delete entry.balanceAfter;}next.entries[index]=entry;return next;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={editData,entryDate};return}
 const oldHistory=transactionHistory;
 transactionHistory=function(){let html=oldHistory();let index=data.entries.length-1;return html.replace(/<div class="card row">/g,()=>{const i=index--;return '<div class="card row" style="flex-wrap:wrap"><button type="button" class="button ghost mini" style="margin-left:auto;order:5" data-edit-entry="'+i+'" aria-label="Edit transaction '+(i+1)+'">✎ Edit</button>'})};
 const pickerStyle = document.createElement('style');
 pickerStyle.textContent = `
  .edit-bank-group{border:0;padding:0;margin:0;min-width:0}
  .edit-bank-options{display:flex;flex-wrap:wrap;gap:8px}
  .edit-bank-choice{position:relative;cursor:pointer}
  .edit-bank-choice input{position:absolute;opacity:0;width:1px;height:1px}
  .edit-bank-tile{position:relative;display:grid;justify-items:center;gap:4px;padding:6px;border:2px solid transparent;border-radius:15px}
  .edit-bank-choice input:checked + .edit-bank-tile{border-color:#c477ff;background:#7030a43b}
  .edit-bank-choice input:checked + .edit-bank-tile:after{content:'✓';position:absolute;top:-3px;right:-3px;border-radius:50%;width:17px;height:17px;text-align:center;background:#722caf;color:white;font:bold 13px/17px sans-serif}
  .edit-bank-choice input:focus-visible + .edit-bank-tile{outline:3px solid #94baff;outline-offset:2px}
  .edit-bank-tile small{max-width:10em;overflow-wrap:anywhere}
 `;
 document.head.appendChild(pickerStyle);
 function bankPicker(field, title, selected){
  const choices=data.banks.map((bank,index)=>{
   const duplicates=data.banks.filter(other=>other.name.trim().toLowerCase()===bank.name.trim().toLowerCase());
   const detail=duplicates.length>1 ? ((bank.nick && duplicates.filter(other=>other.nick===bank.nick).length===1) ? bank.nick : 'Account '+(index+1)) : '';
   const label=[bank.name,detail||bank.nick].filter(Boolean).join(' · ');
   return '<label class="edit-bank-choice" title="'+tidy(label)+'"><input type="radio" name="'+field+'" value="'+tidy(String(bank.id))+'" aria-label="'+tidy(label)+'"'+(String(bank.id)===String(selected.id)?' checked':'')+'><span class="edit-bank-tile">'+badge(bank.name)+(detail?'<small>'+tidy(detail)+'</small>':'')+'</span></label>';
  });
  return '<fieldset class="edit-bank-group"><legend class="field">'+title+'</legend><div class="edit-bank-options">'+choices.join('')+'</div></fieldset>';
 }
 window.openTransactionEditor=function(index){const entry=data.entries[index];if(!entry)return;if(linked(entry)){showSheet('Linked Transaction','<p class="muted">This transaction is linked to a loan or plan. Use its loan or plan history to make changes so payment totals stay correct.</p><button class="button" onclick="go(\'loans\')">Open Loans</button>');return}
 let from,to;try{from=bankFor(data,entry.bankId,entry.type==='Transfer'?entry.fromBank:entry.bank);if(entry.type==='Transfer')to=bankFor(data,entry.toBankId,entry.toBank)}catch(e){alert(e.message);return}
 const transfer=entry.type==='Transfer';const original=JSON.stringify(data);const date=entryDate(entry);
 showSheet(transfer?'Edit Transfer':'Edit Transaction','<form id="edit-transaction"><p class="muted">Updates this browser’s record and adjusts the affected bank balances. Your original Android records stay unchanged.</p>'+(transfer?'':'<label class="field" for="edit-type">Transaction type</label><select class="input" id="edit-type"><option>Expense</option><option>Income</option></select>')+bankPicker('edit-bank',transfer?'From account':'Bank account',from)+(transfer?bankPicker('edit-to','To account',to):'<label class="field" for="edit-category">Category</label><input class="input" id="edit-category" maxlength="80" required value="'+tidy(entry.category||'Other')+'">')+'<label class="field" for="edit-amount">Amount (₹)</label><input class="input" id="edit-amount" type="number" step="0.01" min="0.01" max="100000000000" required value="'+Number(entry.amount)+'"><label class="field" for="edit-date">Date</label><input class="input" id="edit-date" type="date" required value="'+tidy(date)+'"><label class="field" for="edit-note">Notes</label><textarea class="input" id="edit-note" maxlength="500">'+tidy(entry.note||'')+'</textarea><div id="edit-love-box" class="hidden"><label class="field" for="edit-love-name">Person’s name</label><input class="input" id="edit-love-name" maxlength="70" value="'+tidy(entry.personName||entry.loveName||'')+'"></div><div class="error" id="edit-error" role="status"></div><button class="button" type="submit" style="width:100%">Save Changes</button></form>');
 if(!transfer)document.getElementById('edit-type').value=entry.type;
 const payment=upiApps.mount(document.getElementById('edit-amount').previousElementSibling,entry.payment??entry.paymentApp??'');
 const editCategory=document.getElementById('edit-category');if(editCategory){const toggleLove=()=>document.getElementById('edit-love-box').classList.toggle('hidden',!['Love','Brother','Sister'].includes(editCategory.value.trim()));editCategory.addEventListener('input',toggleLove);toggleLove()}
 document.getElementById('edit-transaction').onsubmit=e=>{e.preventDefault();try{if(JSON.stringify(data)!==original)throw Error('Records changed while editing. Close this form and reopen the transaction.');const next=editData(data,index,{payment:payment(),type:transfer?'Transfer':document.getElementById('edit-type').value,bankId:e.currentTarget.elements.namedItem('edit-bank').value,toBankId:transfer?e.currentTarget.elements.namedItem('edit-to').value:'',category:transfer?'Transfer':document.getElementById('edit-category').value,amount:document.getElementById('edit-amount').value,date:document.getElementById('edit-date').value,note:document.getElementById('edit-note').value,loveName:document.getElementById('edit-love-name').value});const negative=next.banks.some(b=>Number(b.balance)<0&&Number(data.banks.find(old=>String(old.id)===String(b.id))?.balance)>=0);if(negative&&!confirm('This edit will make an account balance negative. Save changes?'))return;try{localStorage.setItem(KEY,JSON.stringify(next))}catch(_){throw Error('Could not save changes. Free storage or download a backup first. Your records were not changed.')}data=next;closeSheet();if(tab!=='pluxee')tab='transactions';render()}catch(error){document.getElementById('edit-error').textContent=error.message||'Could not edit transaction.'}};
 };
 document.getElementById('view').addEventListener('click',e=>{const button=e.target.closest('[data-edit-entry]');if(button){e.preventDefault();openTransactionEditor(Number(button.dataset.editEntry))}});
})();