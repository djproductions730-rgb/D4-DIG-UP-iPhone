'use strict';
(function(){
 function value(n,label){const x=Number(n);if(!Number.isFinite(x)||x<0||x>1e11||Math.abs(x*100-Math.round(x*100))>0.0001)throw Error('Enter a valid '+label+' with up to two decimal places.');return Math.round(x*100)/100}
 function editPlan(current,index,change){if(!Number.isInteger(index)||!current.plans?.[index])throw Error('Plan unavailable.');const name=String(change.name||'').trim().slice(0,100);if(!name)throw Error('Enter a plan name.');const due=String(change.dueDate||'');if(due){const d=new Date(due+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==due)throw Error('Choose a valid target date.')}const next=JSON.parse(JSON.stringify(current));next.plans[index]={...next.plans[index],name,target:value(change.target,'target amount'),saved:value(change.saved,'saved amount'),actualSpent:value(change.actualSpent,'spent amount'),dueDate:due,targetDate:due,note:String(change.note||'').trim().slice(0,500),updatedAt:new Date().toISOString()};return next}
 function budgetState(entries,budget,now=new Date()){const month=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');const spent=entries.filter(e=>e.type==='Expense'&&String(e.date||e.created||e.when||'').slice(0,7)===month).reduce((sum,e)=>sum+(Number.isFinite(Number(e.amount))?Math.max(0,Number(e.amount)):0),0);return {spent:Math.round(spent*100)/100,ratio:budget>0?spent/budget:0,status:!(budget>0)?'unset':spent>budget?'over':spent===budget?'limit':spent>=budget*0.8?'near':'safe'}}
 function planBudgetState(plan){const budget=Number.isFinite(Number(plan.target))?Math.max(0,Number(plan.target)):0,spent=Number.isFinite(Number(plan.actualSpent))?Math.max(0,Number(plan.actualSpent)):0;return {budget,spent,ratio:budget>0?spent/budget:0,status:!budget?'unset':spent>budget?'over':spent===budget?'limit':spent>=budget*.8?'near':'safe'}}
 if(typeof module!=='undefined'&&module.exports){module.exports={editPlan,budgetState,planBudgetState};return}
 function bankSummary(){return '<section class="home-bank-balances"><div class="section-head"><h2>🏦 Bank-wise Balances</h2><span class="muted">'+data.banks.length+' accounts</span></div>'+(data.banks.length?data.banks.map(b=>'<button type="button" class="bank-card" data-bank-id="'+tidy(String(b.id))+'">'+badge(b.name)+'<div class="grow"><div class="label">'+tidy(b.name)+'</div><small>'+tidy(b.nick||'Account')+'</small></div><div class="price">'+fmt(b.balance)+'</div><span class="chev">›</span></button>').join(''):'<div class="card"><p class="muted">Add a bank account to see its balance here.</p><button class="button ghost" onclick="openBankPicker()">Add Bank</button></div>')+'</section>'}
 const originalHome=home;home=function(){return originalHome().replace('<div class="split"',bankSummary()+'<div class="split"')};
 const covers={Travel:'travel',Business:'mg-shop-income',Home:'home',Family:'family',Shopping:'shopping',Savings:'pf-advance',Custom:'other'};
 function category(p){
  if(p.category)return String(p.category);
  if(/goa|trip|travel|holiday/i.test(p.name))return 'Travel';
  return /business|shop setup/i.test(p.name)?'Business':'Custom';
 }
 const galleries={
  Travel:[['travel','Flight'],['goa','Beach'],['petrol','Road trip']],
  Business:[['mg-shop-income','Shop'],['in-office','Office'],['online-shopping','Online store']],
  Home:[['home','House'],['bills','Bills'],['shopping','Home shopping']],
  Family:[['family','Family'],['relatives','Relatives'],['love','Love']],
  Shopping:[['shopping','Shopping bags'],['online-shopping','Online order'],['food','Groceries']],
  Savings:[['pf-advance','Savings'],['allowance','Allowance'],['home','Home goal']]
 };
 const allImages=[['other','Custom'],...Object.values(galleries).flat()].filter(([id],i,rows)=>rows.findIndex(([other])=>other===id)===i);
 const imageIds=new Set(allImages.map(([id])=>id));
 function imagePath(id){return id==='goa'?'./assets/plan-goa.webp':'./assets/category-art/'+id+'.webp'}
 function defaultImage(p){
  const key=p.cover||category(p);
  if(key==='Travel'&&/goa/i.test(p.name))return 'goa';
  return Object.hasOwn(covers,key)?covers[key]:'other';
 }
 function validPhoto(src){return typeof src==='string'&&src.length<200000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(src)}
 function picture(p){
  if(p.coverImage==='photo'&&validPhoto(p.coverPhoto))return p.coverPhoto;
  return imagePath(imageIds.has(p.coverImage)?p.coverImage:defaultImage(p));
 }
 async function resizePhoto(file){
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.src=url;await img.decode();
   const scale=Math.min(1,540/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#23142f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const result=canvas.toDataURL('image/jpeg',0.75);
   if(!validPhoto(result))throw Error('Choose a smaller photo.');
   return result;
  }finally{URL.revokeObjectURL(url)}
 }
 const style=document.createElement('style');style.textContent=`
 .fp-pictures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-height:225px;overflow:auto}.fp-pictures label{display:grid;gap:3px;position:relative;cursor:pointer;text-align:center;padding:5px;border:2px solid transparent;border-radius:10px;color:white;background:#362344;font-size:12px}.fp-pictures label:has(:checked){border-color:#e6a2ff;background:#603378}.fp-pictures input{position:absolute;top:3px;left:3px}.fp-pictures img{width:100%;height:50px;object-fit:contain}
 .fp{margin:16px 0;padding:16px;border:1px solid #895197;border-radius:22px;background:linear-gradient(140deg,#31143f,#190b28 72%);color:white}
 .fp-head{display:grid;grid-template-columns:minmax(0,1fr) 48%;align-items:center;gap:6px}.fp-head img{width:100%;height:140px;object-fit:cover;border-radius:14px;mask-image:linear-gradient(90deg,transparent,#000 16%)}
 .fp h2{font-size:clamp(23px,6vw,34px);line-height:1.1;margin:8px 0;overflow-wrap:anywhere}.fp small{color:#e8c9f4}
 .fp-stats{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.fp-stats b{display:block;font-size:clamp(18px,4vw,24px);overflow-wrap:anywhere}
 .fp-state{color:#b0ffe3;background:#173d36;border-radius:12px;padding:12px;font-weight:bold}.fp-state.over{background:#532034;color:#ffb2bd}.fp-state.near,.fp-state.limit{background:#483429;color:#ffda9c}
 .fp-meter{height:7px;background:#40284c;margin:12px 0;border-radius:6px;overflow:hidden}.fp-meter span{display:block;height:100%;background:#ba89ff}.fp-meter.over{background:#ff738b}
 .fp details{border-bottom:1px solid #663e74}.fp summary,.fp-bank>summary{cursor:pointer;padding:12px 0;font-weight:bold}.fp-line{display:flex;justify-content:space-between;gap:10px;padding:5px 0;overflow-wrap:anywhere}.fp-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.fp-actions button{flex:1 1 auto}
 .fp{background:linear-gradient(125deg,#242842,#161c35);border-color:#394163}.fp-goal progress{width:100%;accent-color:#5ce6b0}.fp-reached{display:block;color:#82efb5}.fp .fp-actions .button:not(.ghost){background:#55e8d4!important;color:#10252a!important}
 `;document.head.appendChild(style);
 const log=p=>Array.isArray(p.planEntries)?p.planEntries:[];
 const total=rows=>rows.reduce((sum,row)=>sum+Math.round(row.amount*100),0)/100;
 function line(label,amount){return '<div class="fp-line"><span>'+tidy(label)+'</span><b>'+fmt(amount)+'</b></div>'}
 function card(p,i){
  const {budget,spent,status,ratio}=planBudgetState(p),diff=Math.round((budget-spent)*100)/100;
  const expenses=log(p).filter(r=>r.kind==='expense'),savings=log(p).filter(r=>r.kind==='saving');
  const opening=Math.round((spent-total(expenses))*100)/100;
  const groups=new Map();
  if(opening>0)groups.set('Previously recorded',opening);
  for(const r of expenses)groups.set(r.category,(groups.get(r.category)||0)+Number(r.amount));
  const timeline=rows=>rows.slice().reverse().map(r=>line(r.date+' · '+(r.note||r.category),r.amount)).join('');
  return `<article class="fp"><div class="fp-head"><div><small>${tidy(category(p))}</small><h2>${tidy(p.name)}</h2><button class="button ghost" onclick="openPlanEditor(${i})">Edit plan</button></div><img src="${picture(p)}" alt=""></div><div class="fp-stats"><div><small>Target</small><b>${fmt(budget)}</b></div><div><small>Actual spent</small><b>${fmt(spent)}</b></div></div>${status==='over'?'<div class="fp-state over">Exceeded by '+fmt(-diff)+'</div>':''}${p.dueDate||p.targetDate?'<p>Target date · '+tidy(String(p.dueDate||p.targetDate).slice(0,10))+'</p>':''}${p.note?'<p>'+tidy(p.note)+'</p>':''}<details><summary>Category breakdown</summary>${[...groups].map(([name,n])=>line(name,n)).join('')||'No expenses yet.'}</details><details><summary>Spend timeline</summary>${timeline(expenses)}${opening>0?line('Previously recorded',opening):''}${!expenses.length&&!opening?'No expenses yet.':''}</details>${p.saved||savings.length?'<details><summary>Plan savings · '+fmt(p.saved||0)+'</summary>'+timeline(savings)+(Number(p.saved)>total(savings)?line('Previously saved',p.saved-total(savings)):'')+'</details>':''}<div class="fp-actions"><button class="button" onclick="openPlanEntry(${i},'expense')">+ Add expense</button><button class="button ghost" onclick="openPlanEntry(${i},'saving')">+ Add savings</button></div></article>`;
 }
 function goalCard(p,i){
  const saved=Number(p.saved)||0,target=Number(p.target)||0;
  return `<article class="fp fp-goal"><div class="fp-head"><div><small>${tidy(category(p))}</small><h2>${tidy(p.name)}</h2><p>${fmt(saved)} saved${target?' of '+fmt(target):''}</p>${target?`<progress aria-label="Savings progress" value="${Math.min(saved,target)}" max="${target}"></progress>`:''}${target>0&&saved>=target?'<b class="fp-reached">✓ Goal reached</b>':''}</div><img src="${picture(p)}" alt=""></div><div class="fp-actions"><button class="button ghost" onclick="openPlanEditor(${i})">Edit</button><button class="button" onclick="openPlanEntry(${i},'saving')">+ Save</button></div></article>`;
 }
 plans=function(){
  const open=document.querySelector('.fp-bank')?.open||false;
  return '<div class="section-head"><h2>Future Plans</h2><button class="button" onclick="openPlanEditor()">+ New plan</button></div>'+(data.plans.map((p,i)=>p.kind==='savingGoal'?'':card(p,i)).join('')||'<p>Create a plan to track your estimate, expenses and savings.</p>')+'<div class="section-head"><h2>Savings</h2><button class="button" onclick="openPlanEditor(undefined,true)">+ Category</button></div>'+data.plans.map((p,i)=>p.kind==='savingGoal'?goalCard(p,i):'').join('')+'<details class="card fp-bank" '+(open?'open':'')+'><summary>Bank savings · '+savingsMoney(growthState(data.savings).paise)+'</summary>'+savingsPage()+'</details>';
 };
 function field(label,name,type,val,attrs=''){
  return `<label class="field">${label}<input class="input" name="${name}" type="${type}" value="${tidy(val??'')}" ${attrs}></label>`;
 }
 function money(label,name,val){return field(label,name,'number',val,'required min="0" max="100000000000" step="0.01"')}
 function sheet(title,html,update){
  const initial=JSON.stringify(data),stored=localStorage.getItem(KEY);
  showSheet(title,'<form id="fp-form">'+html+'<p role="alert" class="error"></p><button class="button" type="submit">Save</button></form>');
  const form=document.getElementById('fp-form');
  form.onsubmit=event=>{
   event.preventDefault();
   try{
    if(JSON.stringify(data)!==initial||localStorage.getItem(KEY)!==stored)throw Error('Records changed. Reopen the plan.');
    const next=update(Object.fromEntries(new FormData(form)));
    localStorage.setItem(KEY,JSON.stringify(next));data=next;closeSheet();render();
   }catch(error){form.querySelector('[role=alert]').textContent=error.message}
  };
  return form;
 }
 window.openPlanEditor=function(index,goal=false){
  const creating=index===undefined,p=creating?{}:data.plans[index];if(!p)return;
  const isGoal=creating?goal:p.kind==='savingGoal';
  const c=creating?(isGoal?'Business':'Travel'):category(p),custom=!Object.hasOwn(covers,c)||c==='Custom';
  const options=key=>Object.keys(covers).map(k=>'<option '+(k===key?'selected':'')+'>'+k+'</option>').join('');
  const spent=total(log(p).filter(r=>r.kind==='expense')),saved=total(log(p).filter(r=>r.kind==='saving'));
  let photo=validPhoto(p.coverPhoto)?p.coverPhoto:'',selected=photo&&p.coverImage==='photo'?'photo':imageIds.has(p.coverImage)?p.coverImage:defaultImage(creating?{category:c}:p);
  const form=sheet(isGoal?(creating?'New savings category':'Edit savings category'):(creating?'New future plan':'Edit future plan'),field(isGoal?'Savings goal name':'Plan name','name','text',p.name,'required maxlength="100"')+'<label class="field">Category<select class="input" name="category">'+options(custom?'Custom':c)+'</select></label><div id="fp-custom">'+field('Custom category','custom','text',custom&&c!=='Custom'?c:'','maxlength="60"')+'</div><fieldset><legend>Plan image</legend><div class="fp-pictures"></div><label class="field">Add your photo<input class="input" type="file" accept="image/*" id="fp-photo"></label></fieldset>'+money(isGoal?'Savings target (₹)':'Spending target (₹)','target',p.target||0)+(isGoal?'':money('Previously recorded expenses (₹)','openingSpend',Math.max(0,Math.round(((p.actualSpent||0)-spent)*100)/100)))+money('Previously saved (₹)','openingSave',Math.max(0,Math.round(((p.saved||0)-saved)*100)/100))+field('Target date (optional)','dueDate','date',String(p.dueDate||p.targetDate||'').slice(0,10))+field('Notes','note','text',p.note,'maxlength="500"'),f=>{
   const base=creating?{...data,plans:[...data.plans,{}]}:data,i=creating?data.plans.length:index;
   const next=editPlan(base,i,{...f,actualSpent:(Math.round(value(f.openingSpend||0,'amount')*100)+Math.round(spent*100))/100,saved:(Math.round(value(f.openingSave,'amount')*100)+Math.round(saved*100))/100});
   Object.assign(next.plans[i],{category:f.category==='Custom'?(f.custom.trim()||'Custom'):f.category,cover:f.category,coverImage:f.picture});
   if(isGoal)next.plans[i].kind='savingGoal';
   if(f.picture==='photo'&&photo)next.plans[i].coverPhoto=photo;else delete next.plans[i].coverPhoto;
   return next;
  });
  function refresh(){
   const key=form.elements.category.value;
   form.querySelector('#fp-custom').hidden=key!=='Custom';
   const choices=[...(galleries[key]||allImages)];
   if(photo)choices.push(['photo','Your photo']);
   if(!choices.some(([id])=>id===selected))selected=choices[0][0];
   form.querySelector('.fp-pictures').innerHTML=choices.map(([id,label])=>`<label><input type="radio" name="picture" value="${id}" ${selected===id?'checked':''}><img alt="" src="${id==='photo'?photo:imagePath(id)}"><span>${label}</span></label>`).join('');
  }
  form.elements.category.onchange=refresh;
  form.querySelector('.fp-pictures').onchange=e=>{selected=e.target.value};
  const upload=form.querySelector('#fp-photo');
  upload.onchange=async()=>{
   const file=upload.files[0];if(!file)return;
   const save=form.querySelector('[type=submit]'),error=form.querySelector('[role=alert]');
   upload.disabled=save.disabled=true;error.textContent='Preparing photo…';
   try{photo=await resizePhoto(file);selected='photo';refresh();error.textContent=''}
   catch(e){error.textContent='Choose a smaller JPEG, PNG or WebP photo.'}
   finally{upload.disabled=save.disabled=false;upload.value=''}
  };
  refresh();
 };
 window.openPlanEntry=function(index,kind){
  const p=data.plans[index],expense=kind==='expense';if(!p||(!expense&&kind!=='saving'))return;
  sheet((expense?'Add expense':'Add savings')+' · '+p.name,money('Amount (₹)','amount','')+field('Date','date','date',pxDateKey(new Date()),'required')+(expense?field('Expense category','category','text','','required maxlength="60" placeholder="Travel, stay, food…"'):'')+field('Note (optional)','note','text','','maxlength="200"')+'<p class="muted">Recorded against this plan only.</p>',f=>{
   const amount=value(f.amount,'amount');if(!amount)throw Error('Enter an amount above zero.');
   if(!f.date||expense&&!f.category.trim())throw Error('Complete the date and expense category.');
   const key=expense?'actualSpent':'saved',combined=value((Math.round((Number(p[key])||0)*100)+Math.round(amount*100))/100,'total');
   const plan={...p,[key]:combined,planEntries:[...log(p),{kind,amount,date:f.date,category:expense?f.category.trim():'Savings',note:f.note.trim()}].sort((a,b)=>String(a.date).localeCompare(String(b.date)))};
   return {...data,plans:data.plans.map((old,i)=>i===index?plan:old)};
  });
 };
 render();
})();
