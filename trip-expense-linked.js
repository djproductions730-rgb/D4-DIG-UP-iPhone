'use strict';
(function(){
 const CATEGORIES=['Food & Drinks','Snacks','Train Snacks','Shopping & Accessories','Travel & Transport','Hotel & Stay','Activities','Tickets','Other'];
 const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const validAmount=n=>Number.isFinite(n)&&n>0&&n<=1e11&&Math.abs(round(n)-n)<.000001;
 const escape=s=>tidy(String(s??''));
 const isTrip=p=>p&&p.kind!=='savingGoal'&&(/goa|trip|travel|holiday/i.test(String(p.name||''))||String(p.category||'').toLowerCase()==='travel');
 const linked=(p,i)=>data.entries.filter(e=>e.type==='Expense'&&String(e.tripPlanId)===String(p.tripPlanId||'plan-index-'+i)&&e.tripLinked===true);
 const identity=(p,i)=>String(p.tripPlanId||'plan-index-'+i);
 const stamp=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const categories=()=>CATEGORIES.map(c=>'<option value="'+escape(c)+'">'+escape(c)+'</option>').join('');
 function choosePlan(){return data.plans.map((p,i)=>isTrip(p)?'<option value="'+i+'">'+escape(p.name)+'</option>':'').join('')}
 function pickBank(){return data.banks.map(b=>'<option value="'+escape(b.id)+'">'+escape(b.name+(b.nick?' · '+b.nick:''))+'</option>').join('')}
 function planLinkedSection(p,i){
  if(!isTrip(p))return '';
  const rows=linked(p,i);
  return '<details class="trip-linked"><summary>🔗 Linked Trip Expenses · '+money(rows.reduce((s,e)=>s+Number(e.amount||0),0))+'</summary>'+
   (rows.length?rows.slice().reverse().map(e=>'<div class="trip-linked-row"><span>'+escape(e.tripCategory||'Other')+' · '+escape(e.note||'Expense')+'<small>'+escape(String(e.date||e.created||'').slice(0,10))+'</small></span><span><b>'+money(e.amount)+'</b> <button class="button ghost mini" type="button" onclick="openLinkedTripExpense(\''+escape(e.id)+'\')">✎</button> <button class="button ghost mini" type="button" onclick="deleteLinkedTripExpense(\''+escape(e.id)+'\')">🗑</button></span></div>').join(''):'<p class="muted">New linked trip expenses will appear here.</p>')+
   '</details><button class="button trip-link-btn" type="button" onclick="openLinkedTripExpense(undefined,'+i+')">＋ Trip Expense · Bank linked</button>';
 }
 const previousPlans=plans;
 plans=function(){
  let html=previousPlans(),i=0;
  // The existing renderer emits exactly one article per plan, in data.plans order.
  return html.replace(/<\/article>/g,match=>{
   const p=data.plans[i],idx=i++;return planLinkedSection(p,idx)+match;
  });
 };
 const css=document.createElement('style');
 css.textContent='.trip-link-btn{margin-top:12px;width:100%;background:linear-gradient(115deg,#e8b985,#b891e9)!important;color:#24172e!important;font-weight:850!important;border:0!important}.trip-linked{margin-top:13px;padding:9px 12px;border:1px solid #85638d;border-radius:13px;background:#271b39;color:#f9f0ff}.trip-linked summary{cursor:pointer;font-size:13px;font-weight:750}.trip-linked-row{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid #ffffff20;padding:10px 0;font-size:12px}.trip-linked-row small{display:block;color:#d4bedf;margin-top:4px}.trip-linked-row .button{min-width:34px;padding:6px!important}.trip-edit-form .field{display:block;margin:12px 0;color:#f8eaff}.trip-edit-form select,.trip-edit-form input{width:100%;min-height:44px;background:#2b1f3b;color:white;border:1px solid #9774a8;border-radius:10px;padding:10px;font-size:16px}.trip-edit-form .trip-note{color:#dfc7e9;font-size:12px;line-height:1.6}';
 document.head.appendChild(css);
 window.deleteLinkedTripExpense=function(entryId){
  const original=JSON.stringify(data),stored=localStorage.getItem(KEY);
  const entry=data.entries.find(x=>String(x.id)===String(entryId)&&x.tripLinked===true&&x.type==='Expense');
  if(!entry){alert('Linked trip expense not found.');return}
  const bank=data.banks.find(b=>String(b.id)===String(entry.bankId));
  const amount=Number(entry.amount);
  if(!bank||!validAmount(amount)||!Number.isFinite(Number(bank.balance))){alert('Bank or amount missing. No changes made.');return}
  if(!confirm('Delete '+money(amount)+' trip expense and return '+money(amount)+' to '+bank.name+'?'))return;
  try{
   if(JSON.stringify(data)!==original||localStorage.getItem(KEY)!==stored)throw Error('Records changed. Reopen and retry.');
   const next=JSON.parse(original),b=next.banks.find(x=>String(x.id)===String(entry.bankId));
   if(!b)throw Error('Original bank missing.');
   b.balance=round(Number(b.balance)+amount);
   if(!Number.isFinite(b.balance)||Math.abs(b.balance)>1e12)throw Error('Bank balance outside supported range.');
   const index=next.entries.findIndex(x=>String(x.id)===String(entry.id)&&x.tripLinked===true);
   if(index<0)throw Error('Expense missing.');
   next.entries.splice(index,1);
   localStorage.setItem(KEY,JSON.stringify(next));
   data=next;closeSheet();render();
  }catch(error){alert(error.message||'Could not delete expense.')}
 };
 window.openLinkedTripExpense=function(entryId,planIndex){
  const existing=entryId!==undefined&&entryId!==null;
  const e=existing?data.entries.find(x=>String(x.id)===String(entryId)&&x.tripLinked===true):null;
  if(existing&&!e){alert('Linked expense not found.');return}
  if(!data.banks.length){alert('Add a bank account first.');return}
  if(!data.plans.some(isTrip)){alert('Create a Travel plan first.');return}
  const original=JSON.stringify(data),stored=localStorage.getItem(KEY),initialIndex=existing?data.plans.findIndex((p,i)=>identity(p,i)===String(e.tripPlanId)):Number(planIndex);
  const selectedPlan=initialIndex>=0&&isTrip(data.plans[initialIndex])?initialIndex:data.plans.findIndex(isTrip);
  const options=choosePlan(),bankOptions=pickBank();
  showSheet(existing?'✎ Re-Edit Trip Expense':'✦ New Trip Expense','<form id="trip-linked-form" class="trip-edit-form">'+
    '<div class="trip-modal-banner"><span>🏝️</span><div><b>Goa · Add Trip Expense</b><small>Saved to Trip Journal, Transactions & Bank</small></div></div>'+
    '<label class="field">Trip Plan<select name="plan" required>'+options+'</select></label>'+
    '<label class="field">Category *</label><div class="trip-category-grid" role="group" aria-label="Trip expense category">'+CATEGORIES.map((c,j)=>'<label class="trip-category-tile"><input type="radio" name="category" value="'+escape(c)+'" '+((existing?e.tripCategory===c:j===0)?'checked':'')+' required><span class="trip-category-emoji">'+({'Food & Drinks':'🍴','Snacks':'🍿','Train Snacks':'🚆','Shopping & Accessories':'🛍️','Travel & Transport':'🚐','Hotel & Stay':'🛏️','Activities':'🌴','Tickets':'🎟️','Other':'•••'}[c])+'</span><span>'+escape(c)+'</span></label>').join('')+'</div>'+
    '<label class="field">Bank Account<select name="bank" required>'+bankOptions+'</select></label>'+
    '<label class="field">Amount (₹)<input name="amount" type="number" min="0.01" max="100000000000" step="0.01" required value="'+(existing?Number(e.amount):'')+'"></label>'+
    '<label class="field">Date<input name="date" type="date" required value="'+escape(existing?(e.date||stamp()):stamp())+'"></label>'+
    '<label class="field">Description / Note<input name="note" maxlength="200" placeholder="e.g. Lunch at Calangute" value="'+escape(existing?e.note:'')+'"></label>'+
    '<div class="error" role="alert"></div>'+(existing?'<button class="button ghost" type="button" id="trip-delete-btn" style="width:100%;margin-bottom:10px;border:1px solid #ff7499;color:#ffc0ce">🗑 Delete Expense & Refund Bank</button>':'')+'<button class="button" type="submit" style="width:100%;min-height:48px;background:linear-gradient(105deg,#ff83ac,#c84bf5);color:#20112c;font-weight:850">Save Trip Expense</button></form>');
  const form=document.getElementById('trip-linked-form');
  form.elements.plan.value=String(selectedPlan);
  if(existing){const cat=form.querySelector('input[name=category][value="'+(CATEGORIES.includes(e.tripCategory)?e.tripCategory:'Other')+'"]');if(cat)cat.checked=true;form.elements.bank.value=String(e.bankId)}
  if(existing)form.querySelector('#trip-delete-btn').onclick=()=>window.deleteLinkedTripExpense(e.id);
  form.onsubmit=ev=>{
   ev.preventDefault();
   const error=form.querySelector('[role=alert]');
   try{
    if(JSON.stringify(data)!==original||localStorage.getItem(KEY)!==stored)throw Error('Records changed. Close and reopen this form to avoid overwriting data.');
    const f=Object.fromEntries(new FormData(form)),amount=Number(f.amount),pi=Number(f.plan);
    if(!validAmount(amount))throw Error('Enter a valid amount.');
    if(!Number.isInteger(pi)||!isTrip(data.plans[pi]))throw Error('Choose a valid trip.');
    if(!CATEGORIES.includes(f.category))throw Error('Choose a category.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)||new Date(f.date+'T12:00:00Z').toISOString().slice(0,10)!==f.date)throw Error('Choose a valid date.');
    const next=JSON.parse(original),bank=next.banks.find(b=>String(b.id)===f.bank);
    if(!bank||!Number.isFinite(Number(bank.balance)))throw Error('Bank unavailable.');
    const before=Number(bank.balance);
    if(existing){
     const old=next.entries.find(x=>String(x.id)===String(e.id)&&x.tripLinked===true);
     if(!old)throw Error('Original entry missing.');
     const oldBank=next.banks.find(b=>String(b.id)===String(old.bankId));
     if(!oldBank)throw Error('Original bank missing.');
     oldBank.balance=round(Number(oldBank.balance)+Number(old.amount));
    }
    bank.balance=round(Number(bank.balance)-amount);
    if(!Number.isFinite(bank.balance)||Math.abs(bank.balance)>1e12)throw Error('Bank balance outside supported range.');
    if(bank.balance<0&&!confirm('This expense makes '+bank.name+' balance negative. Continue?'))return;
    const id=existing?e.id:'trip-linked-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
    const oldCreated=existing?e.created:null;
    const entry={...(existing?e:{}),id,tripLinked:true,tripPlanId:identity(next.plans[pi],pi),tripCategory:f.category,type:'Expense',category:'Trip Expense',bankId:bank.id,bank:bank.name,amount:round(amount),date:f.date,created:oldCreated&&String(oldCreated).slice(0,10)===f.date?oldCreated:f.date+'T12:00:00',note:String(f.note||'').trim().slice(0,200),updatedAt:new Date().toISOString()};
    if(existing)next.entries[next.entries.findIndex(x=>String(x.id)===String(e.id))]=entry;else next.entries.push(entry);
    // The plan's opening amount and older plan-only entries remain untouched.
    // Linked bank-backed expenses are derived from entries and displayed separately.
    localStorage.setItem(KEY,JSON.stringify(next));data=next;closeSheet();render();
   }catch(err){error.textContent=err.message||'Could not save this expense.'}
  };
 };
 const originalOpen=openTransaction;
 openTransaction=function(type='Expense'){
  originalOpen(type);
  const form=document.getElementById('txform');
  if(!form||!data.plans.some(isTrip))return;
  const button=document.createElement('button');button.type='button';button.className='button';button.textContent='🏝️ Trip Expense · Choose category';button.style.cssText='width:100%;min-height:44px;background:linear-gradient(110deg,#edc38e,#ba94e8);color:#24182d;font-weight:850';
  button.onclick=()=>window.openLinkedTripExpense();
  const anchor=form.querySelector('.tx-amount');(anchor||form.firstElementChild).before(button);
  const typeInput=form.querySelector('#txtype');
  const refresh=()=>button.hidden=typeInput.value!=='Expense';
  typeInput.addEventListener('change',refresh);refresh();
 };
})();
