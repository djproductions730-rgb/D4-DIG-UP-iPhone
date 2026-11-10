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
 const brandHues={'Amazon':34,'Amazon Fresh':115,'Flipkart':215,'Meesho':320,'Myntra':340,'AJIO':205,'Blinkit':52,'Swiggy Instamart':24,'Zepto':278,'BigBasket':96,'JioMart':212,'Nykaa':336,'Swiggy':24,'Zomato':354,'IKEA':215,'Apple':228,'Croma':166,'Tata 1mg':8};
 function hueFor(name){return brandHues[name]??([...name].reduce((sum,c)=>sum+c.charCodeAt(0),0)%300+20)}
 function markFor(name){return ({Amazon:'a',Flipkart:'F',Meesho:'m',Myntra:'M',Zepto:'Z',Blinkit:'b',AJIO:'A',Nykaa:'N','Swiggy Instamart':'S',Apple:'A'})[name]||(name==='__other__'?'+':name.slice(0,2).toUpperCase())}
 const style=document.createElement('style');
 style.textContent=`
 .shopping-site-box{margin:18px 0 22px}.shopping-site-box[hidden]{display:none!important}
 .shopping-luxe-hero{position:relative;isolation:isolate;display:flex;align-items:center;justify-content:space-between;gap:8px;overflow:hidden;min-height:140px;padding:18px 16px;border:1px solid #d48aff85;border-radius:24px;background:radial-gradient(ellipse at 80% 10%,#bb43e66b,transparent 65%),linear-gradient(130deg,#3c175d,#191835 75%);box-shadow:inset 0 1px 0 #ffffff3d,0 9px 30px #8c21b92b}
 .shopping-luxe-hero:after{content:'';position:absolute;width:150px;height:150px;border:1px solid #f2b7ff30;border-radius:50%;right:-30px;bottom:-85px;z-index:-1}
 .shopping-luxe-copy{min-width:0;z-index:1}.shopping-luxe-copy small{font-size:9px;font-weight:850;letter-spacing:1.8px;color:#e9b5ff}.shopping-luxe-copy h3{font-size:22px;line-height:1.15;letter-spacing:-.6px;color:#fff;margin:8px 0}.shopping-luxe-copy p{font-size:11px;line-height:1.5;color:#e0cee9;margin:0}
 .shopping-luxe-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}.shopping-luxe-tags span{font-size:9px;font-weight:800;border:1px solid #d695ff45;border-radius:20px;padding:4px 7px;background:#ffffff0d;color:#f6e6ff}
 .shopping-luxe-art{width:126px;height:126px;flex-shrink:0;filter:drop-shadow(0 12px 12px #09041d88);transform:rotate(-5deg)}
 .shopping-site-box .field{margin:15px 0 7px;color:#f1dcff;font-size:12px}.shopping-search{margin-bottom:8px!important;padding-left:15px!important;border-radius:16px!important;background:linear-gradient(125deg,#292039,#16172d)!important;border:1px solid #9d69bd!important;box-shadow:inset 0 2px 8px #0003!important}
 .shopping-selection{display:flex;align-items:center;min-height:35px;color:#e9ceff;font-size:12px;font-weight:800;margin:8px 0 11px;padding:8px 11px;border-radius:12px;background:#ae50f017;border:1px solid #bb67ef35;overflow-wrap:anywhere}
 .shopping-store-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:350px;overflow-y:auto;overscroll-behavior:contain;padding:5px 4px 15px;scrollbar-width:thin;scrollbar-color:#ad58e5 #1b1531}
 .shopping-store{--shop-hue:275;position:relative;isolation:isolate;min-width:0;min-height:130px;border:1px solid hsl(var(--shop-hue) 55% 66% / .4);border-radius:20px;padding:14px 6px 11px;background:radial-gradient(ellipse at 50% 0%,hsl(var(--shop-hue) 65% 55% / .25),transparent 80%),linear-gradient(150deg,#2b2240,#141729);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;box-shadow:inset 0 1px 0 #ffffff20,0 5px 9px #08051d55;touch-action:manipulation;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
 .shopping-store:before{content:'';position:absolute;inset:5px;border:1px solid #ffffff06;border-radius:15px;pointer-events:none}
 .shopping-bag{position:relative;display:grid;place-items:center;flex-shrink:0;width:56px;height:53px;margin-top:9px;border-radius:9px 9px 14px 14px;background:linear-gradient(140deg,hsl(var(--shop-hue) 90% 79%),hsl(var(--shop-hue) 70% 55%) 50%,hsl(var(--shop-hue) 75% 32%));border:1px solid hsl(var(--shop-hue) 90% 85% / .7);box-shadow:inset 3px 2px 5px #fff6,inset -5px -4px 6px #0003,5px 7px 0 hsl(var(--shop-hue) 50% 18% / .8),0 12px 16px #0005;transform:perspective(200px) rotateY(-12deg) rotateZ(-5deg);transition:transform .18s ease}
 .shopping-bag:before{content:'';position:absolute;width:24px;height:21px;top:-14px;left:14px;border:4px solid hsl(var(--shop-hue) 90% 84%);border-bottom:0;border-radius:16px 16px 0 0;box-shadow:inset 2px 0 2px #fff7;z-index:-1}
 .shopping-bag i{display:grid;place-items:center;width:34px;height:28px;border-radius:8px;background:#160b3299;color:#fff;font-size:16px;font-weight:950;font-style:normal;letter-spacing:-.7px;box-shadow:inset 0 1px 1px #ffffff50;text-shadow:0 1px 2px #0005}
 .shopping-store b{font-size:11px;font-weight:850;line-height:1.35;overflow-wrap:anywhere;text-align:center;max-width:100%}.shopping-store small{font-size:8px;letter-spacing:1px;color:#c8bad9;font-weight:700;text-transform:uppercase}
 .shopping-store[aria-pressed="true"]{border:2px solid #efbeff;padding:13px 5px 10px;background:radial-gradient(ellipse at 50% 0%,hsl(var(--shop-hue) 75% 60% / .45),transparent 90%),linear-gradient(145deg,#54216e,#271d48);box-shadow:0 0 0 2px #b35bff44,0 0 18px #bc54fa55,inset 0 1px 8px #ffe6ff20}
 .shopping-store[aria-pressed="true"]:after{content:'✓';position:absolute;right:6px;top:6px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#efc4ff;color:#4b1265;font-weight:950;font-size:13px;box-shadow:0 2px 6px #0004}
 .shopping-store[aria-pressed="true"] .shopping-bag{transform:perspective(200px) rotateY(0deg) rotateZ(0deg) translateY(-3px)}
 .shopping-store:active{transform:scale(.96)}.shopping-store:focus-visible{outline:3px solid #e3b2ff;outline-offset:1px}.shopping-no-results{grid-column:1/-1;color:#d4c6e6;padding:12px;font-size:13px}
 [data-quick="online-shopping"]{position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 0%,#e85bbb66,transparent 75%),linear-gradient(145deg,#53206c,#261943)!important;border:1px solid #e8a4fa!important;box-shadow:inset 0 1px 5px #ffc7ff44,0 5px 18px #b13edf44!important}
 [data-quick="online-shopping"] .quick-icon{background:linear-gradient(145deg,#ffe0ff,#c77af2)!important;box-shadow:inset 2px 2px 4px #fff8,3px 5px 0 #743694,0 8px 14px #0a031c66!important;transform:rotate(-7deg);border:1px solid #ffddff;color:#45115f!important}
 [data-quick="online-shopping"] .quick-name{color:#fff!important;text-shadow:0 1px 4px #0005}
 @media(max-width:360px){.shopping-luxe-art{width:99px;height:110px}.shopping-luxe-copy h3{font-size:19px}.shopping-store-grid{gap:7px}.shopping-store{border-radius:16px;min-height:123px}.shopping-bag{width:49px;height:48px}.shopping-bag:before{left:10px}.shopping-store b{font-size:10px}}
 @media(prefers-reduced-motion:reduce){.shopping-store,.shopping-bag{transition:none}}
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
  box.innerHTML='<div class="shopping-luxe-hero"><div class="shopping-luxe-copy"><small>D4 SHOPPING</small><h3>Shop it.<br>Track it.</h3><p>Your favourite stores,<br>one beautiful place.</p><div class="shopping-luxe-tags"><span>'+stores.length+' STORES</span><span>A–Z</span></div></div><svg class="shopping-luxe-art" viewBox="0 0 160 160" aria-hidden="true" focusable="false"><defs><linearGradient id="d4-shop-bag" x2=".9" y2="1"><stop stop-color="#ffcbff"/><stop offset=".4" stop-color="#c777ff"/><stop offset="1" stop-color="#7145cb"/></linearGradient><linearGradient id="d4-shop-side" x2="1" y2="1"><stop stop-color="#9360d1"/><stop offset="1" stop-color="#3b256b"/></linearGradient><linearGradient id="d4-shop-card" x2="1" y2="1"><stop stop-color="#ffdc9c"/><stop offset="1" stop-color="#ff9788"/></linearGradient></defs><ellipse cx="84" cy="140" rx="54" ry="11" fill="#0a0528" opacity=".4"/><g transform="rotate(13 118 60)"><rect x="91" y="27" width="53" height="69" rx="11" fill="url(#d4-shop-card)" stroke="#ffe6cf"/><path d="M91 47h53" stroke="#bc5669" stroke-width="10"/><rect x="101" y="64" width="15" height="11" rx="3" fill="#fff5ca"/><path d="M102 83h23" stroke="#b96375" stroke-width="3" stroke-linecap="round"/></g><path d="m39 62 65-8 23 18-7 58-19 12-65-14Z" fill="url(#d4-shop-side)" stroke="#c9a3f3"/><path d="m39 62 65-8-3 88-65-14Z" fill="url(#d4-shop-bag)" stroke="#f2d6ff"/><path d="m104 54 23 18-26 6" fill="#e5b0ff"/><path d="M54 74V47c0-28 37-28 37-4v26" fill="none" stroke="#422169" stroke-width="7" stroke-linecap="round"/><path d="M53 72V45c0-27 36-27 36-3v25" fill="none" stroke="#f2d5ff" stroke-width="5" stroke-linecap="round"/><rect x="51" y="86" width="38" height="30" rx="9" fill="#fff" opacity=".9"/><path d="m58 101 9 8 15-17" fill="none" stroke="#9b43d6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g fill="#ffdda8"><path d="m26 37 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m137 112 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g><circle cx="118" cy="18" r="4" fill="#f8c7ff"/><circle cx="24" cy="108" r="3" fill="#caa0ff"/></svg></div><div class="field" id="shopping-site-label">Shopping app / website · Tap to select</div><input type="hidden" id="shopping-site"><label class="field" for="shopping-search">Search apps / stores</label><input class="input shopping-search" type="search" id="shopping-search" placeholder="Search Amazon, Meesho, Zepto…" autocomplete="off"><p class="shopping-selection" role="status" aria-live="polite">Tap an app below</p><div class="shopping-store-grid" role="group" aria-labelledby="shopping-site-label"></div><div id="shopping-other-box" hidden><label class="field" for="shopping-other">Website / store name</label><input class="input" id="shopping-other" maxlength="80" placeholder="Enter website or store name" autocomplete="off"></div>';
  form.querySelector('.category-choices').after(box);
  const site=box.querySelector('#shopping-site'),other=box.querySelector('#shopping-other');
  const search=box.querySelector('#shopping-search'),grid=box.querySelector('.shopping-store-grid');
  const choices=[...stores,'__other__'];
  const labelFor=name=>name==='__other__'?'Other website / Instagram store':name;
  function paintStores(){
   const query=search.value.trim().toLocaleLowerCase('en');
   const matches=choices.filter(name=>name==='__other__'||labelFor(name).toLocaleLowerCase('en').includes(query));
   grid.innerHTML=(matches.length===1&&query?'<p class="shopping-no-results">No matching app. Use Other to add your store.</p>':'')+matches.map(name=>'<button type="button" class="shopping-store" style="--shop-hue:'+hueFor(name)+'" data-shopping-store="'+tidy(name)+'" aria-pressed="'+(name===site.value)+'"><span class="shopping-bag" aria-hidden="true"><i>'+tidy(markFor(name))+'</i></span><b>'+tidy(labelFor(name))+'</b><small>'+(name===site.value?'Selected':'Tap to select')+'</small></button>').join('');
   grid.scrollTop=0;
  }
  search.addEventListener('input',paintStores);
  grid.addEventListener('click',event=>{
   const button=event.target.closest('[data-shopping-store]');
   if(!button)return;
   site.value=button.dataset.shoppingStore;
   grid.querySelectorAll('[data-shopping-store]').forEach(item=>{const selected=item.dataset.shoppingStore===site.value;item.setAttribute('aria-pressed',String(selected));item.querySelector('small').textContent=selected?'Selected':'Tap to select'});
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
