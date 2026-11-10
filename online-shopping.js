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
 const openBeforeShopping=openTransaction;
 openTransaction=function(initialType='Expense'){
  openBeforeShopping(initialType);
  const form=document.getElementById('txform');
  if(!form)return;
  const category=form.querySelector('#txcat'),type=form.querySelector('#txtype');
  const box=document.createElement('div');
  box.className='shopping-site-box';
  box.innerHTML='<label class="field" for="shopping-site">Shopping app / website</label><select class="input" id="shopping-site" required><option value="">Choose an app / website</option>'+Object.entries(groups).map(([label,names])=>'<optgroup label="'+tidy(label)+'">'+names.map(name=>'<option value="'+tidy(name)+'">'+tidy(name)+'</option>').join('')+'</optgroup>').join('')+'<option value="__other__">Other website / Instagram store</option></select><div id="shopping-other-box" hidden><label class="field" for="shopping-other">Website / store name</label><input class="input" id="shopping-other" maxlength="80" placeholder="Enter website or store name" autocomplete="off"></div>';
  form.querySelector('.category-choices').after(box);
  const site=box.querySelector('#shopping-site'),other=box.querySelector('#shopping-other');
  function refresh(){
   const expense=type.value==='Expense';
   if(!expense&&category.value===categoryName)pickTransactionCategory('Food');
   const enabled=expense&&category.value===categoryName;
   box.hidden=!enabled;
   site.disabled=!enabled;
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
   if(!name){form.querySelector('#category-save-error').textContent='Choose a shopping website or enter its name.';return;}
   const note=form.querySelector('#txnote'),original=note.value;
   // Reuse the existing expense save flow; the merchant stays in history and backups.
   note.value=(name+(original.trim()?' · '+original.trim():'')).slice(0,500);
   try{return submit.call(this,event)}finally{note.value=original}
  };
 };
})();
