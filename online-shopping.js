'use strict';
(function(){
 const categoryName='Online Shopping';
 const groups={
  'Groceries & quick delivery':['Swiggy Instamart','Blinkit','Zepto','BigBasket','BB Now','JioMart','Amazon Fresh','Flipkart Minutes','DMart Ready','Nature’s Basket','FreshToHome','Licious','Country Delight','MilkBasket'],
  'Marketplaces':['Amazon','Flipkart','Meesho','Snapdeal','ShopClues','IndiaMART'],
  'Fashion & footwear':['Myntra','AJIO','Nykaa Fashion','Tata CLiQ Fashion','Shopsy','Zudio','H&M','Zara','UNIQLO','Westside','Pantaloons','Max Fashion','Bewakoof','The Souled Store','Snitch','Urbanic','NEWME','FirstCry','Hopscotch','Decathlon','Puma','Adidas','Nike','Bata'],
  'Beauty & personal care':['Nykaa','Purplle','Tira','Mamaearth','SUGAR Cosmetics','Minimalist','Plum','mCaffeine','WOW Skin Science'],
  'Electronics & appliances':['Croma','Reliance Digital','Vijay Sales','Samsung','Apple','Mi Store','OnePlus','boAt','Noise','Dell','HP','Lenovo','ASUS','Acer','realme','Vivo','OPPO','iQOO'],
  'Home, furniture & gifts':['IKEA','Pepperfry','Urban Ladder','Wakefit','Home Centre','HomeTown','Ferns N Petals','IGP'],
  'Medicines & wellness':['Tata 1mg','PharmEasy','Netmeds','Apollo Pharmacy','MedPlus','HealthKart'],
  'Food delivery':['Swiggy','Zomato','EatSure','EatClub','Domino’s','Pizza Hut','KFC','McDelivery'],
  'Jewellery & accessories':['CaratLane','BlueStone','Tanishq','GIVA','Lenskart','Titan','Fastrack'],
  'Books, stationery & pets':['Bookswagon','Crossword','SapnaOnline','Heads Up For Tails','Supertails']
 };
 // A single deduplicated A–Z catalog keeps every store easy to find.
 const stores=[...new Set([...Object.values(groups).flat(),...["Aachho","Allen Solly","Amazon Bazaar","Amazon Pharmacy","American Eagle","AND","Arata","Arrow","Babyhug","Bajaj Electronics","Biba","BISSELL","Borosil","Campus","Cilory","Clovia","DaMENSCH","Dot & Key","Dr. Sheth’s","FabAlley","Fabindia","FableStreet","Fossil","Gadgets Now","GOAT","Good Earth","Happilo","Health & Glow","Himalaya","iHerb","Jockey","Kalyan Jewellers","Kama Ayurveda","Kushal’s","Lakmé","Levi’s","Libas","Lifestyle","Louis Philippe","Manyavar","Marks & Spencer","Metro Shoes","Mochi","Mokobara","MyGlamm","Nestasia","Nykaa Man","ONLY","Orient Electric","Peter England","Prestige","Rare Rabbit","Raymond","Reebok","Samsung Shop","Skechers","Smytten","Spar India","Spykar","SuperBottoms","Swiss Beauty","Tata CLiQ Luxury","The Body Shop","The Derma Co","The Man Company","Trent","U.S. Polo Assn.","Ugaoo","Van Heusen","Vero Moda","Vishal Mega Mart","W for Woman","Westlife","Wildcraft","WoodenStreet","Woodland","Xiaomi","Zivame","Zouk"]])].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'}));
 const style=document.createElement('style');
 style.textContent=`
 .shopping-site-box{margin:14px 0 20px}.shopping-site-box[hidden]{display:none!important}
 .shopping-search{margin-bottom:8px!important}.shopping-selection{color:#e5c9ff;font-size:13px;font-weight:800;margin:9px 0;overflow-wrap:anywhere}
 .shopping-store-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-height:290px;overflow-y:auto;overscroll-behavior:contain;padding:4px 4px 12px;scrollbar-width:thin;scrollbar-color:#ad58e5 #1b1531}
 .shopping-store{position:relative;min-width:0;min-height:84px;border:1px solid #70518b;border-radius:14px;padding:10px 5px;background:linear-gradient(145deg,#302044,#191c34);color:#f8f3ff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;touch-action:manipulation}
 .shopping-store span{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:#b76cff26;color:#efcbff;font-size:15px;font-weight:900}
 .shopping-store b{font-size:11px;line-height:1.3;overflow-wrap:anywhere;text-align:center}.shopping-store[aria-pressed="true"]{border:2px solid #d891ff;background:linear-gradient(140deg,#8024bd,#482477);box-shadow:0 0 12px #c743ff55}
 .shopping-store[aria-pressed="true"]:after{content:'✓';position:absolute;right:5px;top:3px;font-weight:900;color:#fff}.shopping-store:focus-visible{outline:3px solid #dba3ff;outline-offset:1px}.shopping-no-results{grid-column:1/-1;color:#d4c6e6;padding:12px;font-size:13px}
 `;
 document.head.append(style);
 const openBeforeShopping=openTransaction;
 openTransaction=function(initialType='Expense'){
  openBeforeShopping(initialType);
  const form=document.getElementById('txform');
  if(!form)return;
  const category=form.querySelector('#txcat'),type=form.querySelector('#txtype');
  const box=document.createElement('div');
  box.className='shopping-site-box';
  box.innerHTML='<div class="field" id="shopping-site-label">Shopping app / website · Tap to select</div><input type="hidden" id="shopping-site"><label class="field" for="shopping-search">Search apps / stores</label><input class="input shopping-search" type="search" id="shopping-search" placeholder="Search Amazon, Meesho, Zepto…" autocomplete="off"><p class="shopping-selection" role="status" aria-live="polite">Tap an app below</p><div class="shopping-store-grid" role="group" aria-labelledby="shopping-site-label"></div><div id="shopping-other-box" hidden><label class="field" for="shopping-other">Website / store name</label><input class="input" id="shopping-other" maxlength="80" placeholder="Enter website or store name" autocomplete="off"></div>';
  form.querySelector('.category-choices').after(box);
  const site=box.querySelector('#shopping-site'),other=box.querySelector('#shopping-other');
  const search=box.querySelector('#shopping-search'),grid=box.querySelector('.shopping-store-grid');
  const choices=[...stores,'__other__'];
  const labelFor=name=>name==='__other__'?'Other website / Instagram store':name;
  function paintStores(){
   const query=search.value.trim().toLocaleLowerCase('en');
   const matches=choices.filter(name=>name==='__other__'||labelFor(name).toLocaleLowerCase('en').includes(query));
   grid.innerHTML=(matches.length===1&&query?'<p class="shopping-no-results">No matching app. Use Other to add your store.</p>':'')+matches.map(name=>'<button type="button" class="shopping-store" data-shopping-store="'+tidy(name)+'" aria-pressed="'+(name===site.value)+'"><span aria-hidden="true">'+(name==='__other__'?'+':tidy(name.slice(0,2).toUpperCase()))+'</span><b>'+tidy(labelFor(name))+'</b></button>').join('');
   grid.scrollTop=0;
  }
  search.addEventListener('input',paintStores);
  grid.addEventListener('click',event=>{
   const button=event.target.closest('[data-shopping-store]');
   if(!button)return;
   site.value=button.dataset.shoppingStore;
   grid.querySelectorAll('[data-shopping-store]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.shoppingStore===site.value)));
   box.querySelector('.shopping-selection').textContent='✓ Selected: '+labelFor(site.value);
   form.querySelector('#category-save-error').textContent='';
   refresh();
   if(site.value==='__other__')other.focus();
  });
  paintStores();
  function refresh(){
   const expense=type.value==='Expense';
   if(!expense&&category.value===categoryName)pickTransactionCategory('Food');
   const enabled=expense&&category.value===categoryName;
   box.hidden=!enabled;
   site.disabled=!enabled;
   search.disabled=!enabled;
   const custom=enabled&&site.value==='__other__';
   other.disabled=!custom;other.required=custom;
   box.querySelector('#shopping-other-box').hidden=!custom;
   form.querySelector('[data-category-choice="Online Shopping"]').hidden=!expense;
   category.querySelector('option[value="Online Shopping"]').disabled=!expense;
  }
  category.addEventListener('change',refresh);
  type.addEventListener('change',refresh);
  form.addEventListener('click',refresh);
  site.addEventListener('change',refresh);
  refresh();
  const submit=form.onsubmit;
  form.onsubmit=function(event){
   if(box.hidden)return submit.call(this,event);
   event.preventDefault();
   const name=(site.value==='__other__'?other.value:site.value).trim();
   if(!name){form.querySelector('#category-save-error').textContent='Tap a shopping app or enter your store name.';return;}
   const note=form.querySelector('#txnote'),original=note.value;
   // Reuse the existing expense save flow; the merchant stays in history and backups.
   note.value=(name+(original.trim()?' · '+original.trim():'')).slice(0,500);
   try{return submit.call(this,event)}finally{note.value=original}
  };
 };
})();
