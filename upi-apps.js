'use strict';
const upiApps = (() => {
 const embedded = {"Google Pay":"data:image/svg+xml,%3Csvg%20fill%3D%22currentColor%22%20width%3D%22512px%22%20height%3D%22204px%22%20viewBox%3D%220%200%20512%20204%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20preserveAspectRatio%3D%22xMidYMid%22%3E%0A%20%20%20%20%3Ctitle%3EGoogle%20Pay%3C%2Ftitle%3E%0A%20%20%20%20%3Cg%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M362.926585%2C55.0572275%20C377.002187%2C55.0572275%20387.878788%2C58.8960279%20396.196189%2C66.5736286%20C404.51359%2C74.2512294%20408.35239%2C84.4880304%20408.35239%2C97.2840316%20L408.35239%2C158.704838%20L390.437988%2C158.704838%20L390.437988%2C144.629236%20L389.798188%2C144.629236%20C382.120587%2C156.145637%20371.243986%2C161.903838%20358.447985%2C161.903838%20C347.571384%2C161.903838%20337.974383%2C158.704838%20330.296782%2C152.306837%20C323.258982%2C145.908836%20318.780381%2C136.951636%20318.780381%2C127.354635%20C318.780381%2C117.117834%20322.619182%2C108.800433%20330.296782%2C102.402432%20C337.974383%2C96.0044315%20348.850984%2C93.4452313%20361.646985%2C93.4452313%20C373.163386%2C93.4452313%20382.120587%2C95.3646315%20389.158388%2C99.8432319%20L389.158388%2C95.3646315%20C389.158388%2C89.3931642%20386.92904%2C83.421697%20382.470345%2C79.5309543%20L381.480787%2C78.7298298%20C376.362387%2C74.2512294%20369.964386%2C71.6920291%20362.926585%2C71.6920291%20C352.049984%2C71.6920291%20343.732584%2C76.1706296%20337.974383%2C85.1278305%20L321.339581%2C74.8910295%20C331.576382%2C61.4552281%20345.012184%2C55.0572275%20362.926585%2C55.0572275%20Z%20M272.714777%2C11.5508233%20C284.195633%2C11.5508233%20295.105804%2C15.5456243%20303.828346%2C22.9962452%20L305.34458%2C24.3468245%20C314.301781%2C32.0244253%20318.780381%2C43.5408264%20318.780381%2C55.6970276%20C318.780381%2C67.8532288%20314.301781%2C78.7298298%20305.34458%2C87.0472306%20C296.387379%2C95.3646315%20285.510778%2C99.8432319%20272.714777%2C99.8432319%20L242.004374%2C99.2034318%20L242.004374%2C158.704838%20L222.810372%2C158.704838%20L222.810372%2C11.5508233%20L272.714777%2C11.5508233%20Z%20M365.485786%2C108.800433%20C357.808185%2C108.800433%20351.410184%2C110.719833%20346.291784%2C114.558633%20C341.173383%2C117.757634%20338.614183%2C122.236234%20338.614183%2C127.994435%20C338.614183%2C133.112835%20341.173383%2C137.591436%20345.012184%2C140.150636%20C349.490784%2C143.349636%20354.609185%2C145.269036%20359.727585%2C145.269036%20C366.893346%2C145.269036%20374.059107%2C142.482352%20379.664324%2C137.429163%20L380.840987%2C136.311835%20C387.238988%2C130.553635%20390.437988%2C123.515834%20390.437988%2C115.838233%20C384.679788%2C111.359633%20376.362387%2C108.800433%20365.485786%2C108.800433%20Z%20M273.994377%2C29.465225%20L242.004374%2C29.465225%20L242.004374%2C80.64923%20L273.994377%2C80.64923%20C281.032177%2C80.64923%20288.069978%2C78.0900298%20292.548579%2C72.9716293%20C302.78538%2C63.3746283%20302.78538%2C47.3796268%20293.188379%2C37.7826258%20L292.548579%2C37.1428258%20C287.430178%2C32.0244253%20281.032177%2C28.825425%20273.994377%2C29.465225%20Z%20M512%2C58.2562278%20L448.659794%2C203.490842%20L429.465792%2C203.490842%20L453.138394%2C152.946637%20L411.55139%2C58.8960279%20L432.024992%2C58.8960279%20L462.095595%2C131.193435%20L462.735395%2C131.193435%20L492.166198%2C58.8960279%20L512%2C58.8960279%20L512%2C58.2562278%20Z%22%20fill%3D%22%235F6368%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%20%20%3Cg%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M165.868166%2C86.4074306%20C165.868166%2C80.64923%20165.228366%2C74.8910295%20164.588566%2C69.1328289%20L84.6135583%2C69.1328289%20L84.6135583%2C101.762632%20L130.039363%2C101.762632%20C128.119963%2C111.999433%20122.361762%2C121.596434%20113.404561%2C127.354635%20L113.404561%2C148.468037%20L140.915964%2C148.468037%20C156.910965%2C133.752635%20165.868166%2C111.999433%20165.868166%2C86.4074306%20Z%22%20fill%3D%22%234285F4%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M84.6135583%2C168.941639%20C107.646361%2C168.941639%20126.840362%2C161.264038%20140.915964%2C148.468037%20L113.404561%2C127.354635%20C105.72696%2C132.473035%2096.1299594%2C135.672035%2084.6135583%2C135.672035%20C62.8603561%2C135.672035%2043.6663543%2C120.956634%2037.2683536%2C100.483032%20L9.11715089%2C100.483032%20L9.11715089%2C122.236234%20C23.8325523%2C151.027237%2052.6235551%2C168.941639%2084.6135583%2C168.941639%20Z%22%20fill%3D%22%2334A853%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M37.2683536%2C100.483032%20C33.4295533%2C90.246231%2033.4295533%2C78.7298298%2037.2683536%2C67.8532288%20L37.2683536%2C46.1000266%20L9.11715089%2C46.1000266%20C-3.0390503%2C69.772629%20-3.0390503%2C97.9238317%209.11715089%2C122.236234%20L37.2683536%2C100.483032%20Z%22%20fill%3D%22%23FBBC04%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M84.6135583%2C33.3040254%20C96.7697595%2C33.3040254%20108.286161%2C37.7826258%20117.243361%2C46.1000266%20L117.243361%2C46.1000266%20L141.555764%2C21.7876243%20C126.200562%2C7.71202289%20105.72696%2C-0.60537792%2085.2533583%2C0.0344221425%20C53.2633552%2C0.0344221425%2023.8325523%2C17.9488239%209.75695095%2C46.7398267%20L37.9081537%2C68.4930288%20C43.6663543%2C48.0194268%2062.8603561%2C33.3040254%2084.6135583%2C33.3040254%20Z%22%20fill%3D%22%23EA4335%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A","Paytm":"data:image/svg+xml,%3Csvg%20fill%3D%22%23063872%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EPaytm%3C%2Ftitle%3E%3Cpath%20d%3D%22M15.85%208.167a.204.204%200%200%200-.04.004c-.68.19-.543%201.148-1.781%201.23h-.12a.23.23%200%200%200-.052.005h-.001a.24.24%200%200%200-.184.235v1.09c0%20.134.106.241.237.241h.645v4.623c0%20.132.104.238.233.238h1.058a.236.236%200%200%200%20.233-.238v-4.623h.6c.13%200%20.236-.107.236-.241v-1.09a.239.239%200%200%200-.236-.24h-.612V8.386a.218.218%200%200%200-.216-.22zm4.225%201.17c-.398%200-.762.15-1.042.395v-.124a.238.238%200%200%200-.234-.224h-1.07a.24.24%200%200%200-.236.242v5.92a.24.24%200%200%200%20.236.242h1.07c.12%200%20.217-.091.233-.209v-4.25a.393.393%200%200%201%20.371-.408h.196a.41.41%200%200%201%20.226.09.405.405%200%200%201%20.145.319v4.074l.004.155a.24.24%200%200%200%20.237.241h1.07a.239.239%200%200%200%20.235-.23l-.001-4.246c0-.14.062-.266.174-.34a.419.419%200%200%201%20.196-.068h.198c.23.02.37.2.37.408.005%201.396.004%202.8.004%204.224a.24.24%200%200%200%20.237.241h1.07c.13%200%20.236-.108.236-.241v-4.543c0-.31-.034-.442-.08-.577a1.601%201.601%200%200%200-1.51-1.09h-.015a1.58%201.58%200%200%200-1.152.5c-.291-.308-.7-.5-1.153-.5zM.232%209.4A.234.234%200%200%200%200%209.636v5.924c0%20.132.096.238.216.241h1.09c.13%200%20.237-.107.237-.24l.004-1.658H2.57c.857%200%201.453-.605%201.453-1.481v-1.538c0-.877-.596-1.484-1.453-1.484H.232zm9.032%200a.239.239%200%200%200-.237.241v2.47c0%20.94.657%201.608%201.579%201.608h.675s.016%200%20.037.004a.253.253%200%200%201%20.222.253c0%20.13-.096.235-.219.251l-.018.004-.303.006H9.739a.239.239%200%200%200-.236.24v1.09a.24.24%200%200%200%20.236.242h1.75c.92%200%201.577-.669%201.577-1.608v-4.56a.239.239%200%200%200-.236-.24h-1.07a.239.239%200%200%200-.236.24c-.005.787%200%201.525%200%202.255a.253.253%200%200%201-.25.25h-.449a.253.253%200%200%201-.25-.255c.005-.754-.005-1.5-.005-2.25a.239.239%200%200%200-.236-.24zm-4.004.006a.232.232%200%200%200-.238.226v1.023c0%20.132.113.24.252.24h1.413c.112.017.2.1.213.23v.14c-.013.124-.1.214-.207.224h-.7c-.93%200-1.594.63-1.594%201.515v1.269c0%20.88.57%201.506%201.495%201.506h1.94c.348%200%20.63-.27.63-.6v-4.136c0-1.004-.508-1.637-1.72-1.637zm-3.713%201.572h.678c.139%200%20.25.115.25.256v.836a.253.253%200%200%201-.25.256h-.1c-.192.002-.386%200-.578%200zm4.67%201.977h.445c.139%200%20.252.108.252.24v.932a.23.23%200%200%201-.014.076.25.25%200%200%201-.238.164h-.445a.247.247%200%200%201-.252-.24v-.933c0-.132.113-.239.252-.239Z%22%2F%3E%3C%2Fsvg%3E","PhonePe":"data:image/svg+xml,%3Csvg%20fill%3D%22%235f259f%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EPhonePe%3C%2Ftitle%3E%3Cpath%20d%3D%22M10.206%209.941h2.949v4.692c-.402.201-.938.268-1.34.268-1.072%200-1.609-.536-1.609-1.743V9.941zm13.47%204.816c-1.523%206.449-7.985%2010.442-14.433%208.919C2.794%2022.154-1.199%2015.691.324%209.243%201.847%202.794%208.309-1.199%2014.757.324c6.449%201.523%2010.442%207.985%208.919%2014.433zm-6.231-5.888a.887.887%200%200%200-.871-.871h-1.609l-3.686-4.222c-.335-.402-.871-.536-1.407-.402l-1.274.401c-.201.067-.268.335-.134.469l4.021%203.82H6.386c-.201%200-.335.134-.335.335v.67c0%20.469.402.871.871.871h.938v3.217c0%202.413%201.273%203.82%203.418%203.82.67%200%201.206-.067%201.877-.335v2.145c0%20.603.469%201.072%201.072%201.072h.938a.432.432%200%200%200%20.402-.402V9.874h1.542c.201%200%20.335-.134.335-.335v-.67z%22%2F%3E%3C%2Fsvg%3E","WhatsApp Pay":"data:image/svg+xml,%3Csvg%20fill%3D%22%23128c7e%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EWhatsApp%3C%2Ftitle%3E%3Cpath%20d%3D%22M17.472%2014.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94%201.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198%200-.52.074-.792.372-.272.297-1.04%201.016-1.04%202.479%200%201.462%201.065%202.875%201.213%203.074.149.198%202.096%203.2%205.077%204.487.709.306%201.262.489%201.694.625.712.227%201.36.195%201.871.118.571-.085%201.758-.719%202.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421%207.403h-.004a9.87%209.87%200%2001-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86%209.86%200%2001-1.51-5.26c.001-5.45%204.436-9.884%209.888-9.884%202.64%200%205.122%201.03%206.988%202.898a9.825%209.825%200%20012.893%206.994c-.003%205.45-4.437%209.884-9.885%209.884m8.413-18.297A11.815%2011.815%200%200012.05%200C5.495%200%20.16%205.335.157%2011.892c0%202.096.547%204.142%201.588%205.945L.057%2024l6.305-1.654a11.882%2011.882%200%20005.683%201.448h.005c6.554%200%2011.89-5.335%2011.893-11.893a11.821%2011.821%200%2000-3.48-8.413Z%22%2F%3E%3C%2Fsvg%3E"};
 const catalog = `Aditya Birla Capital|adityabirlacapital.com|abcd
Airtel Thanks|airtel.in
Amazon Pay|pay.amazon.in|amazonpay amzn
AU 0101|au|aupay
Axis Mobile|axis|open by axis
Bajaj Finserv|bajajfinserv.in
BharatPe|bharatpe.com
BHIM|bhimupi.org.in
BHIM Bandhan UPI|bandhan
BHIM DLB UPI|dhanlaxmi
BHIM KBL UPI|karnataka
BHIM PNB|pnb
BHIM SBI Pay|sbi|sbipay
BHIM SpicePay|spicemoney.com
BHIM UCO UPI|uco
bob World UPI|baroda|baroda pay
Canara ai1|canara
CashBook|cashbook.in
Cheq|cheq.one
Citrus Wallet|payu.in
CRED|cred.club
Curie Money|curie.money
DBS digibank|dbs.com
Dhani|dhani.com
DhanSmart|dhanlaxmi
DigiKhata|paypointindia.com
EbixCash UPI|ebixcash.com
FamApp|famapp.in|fampay trio
Fave|myfave.com
Federal Bank Lotza|federalbank.co.in
Fi Money|fi.money
FinoPay|fino
Flipkart UPI|flipkart.com
Freecharge|freecharge.in
Freo|freo.money
GenWise|genwise.club
Google Pay|pay.google.com|gpay tez
Groww Pay|groww.in
HSBC Simply Pay|hsbc.co.in
ICICI iMobile Pay|icici
ICICI Pockets|icici
IDBI GO Mobile+|idbibank.in
IDBI PayWiz|idbibank.in
IDFC FIRST Bank|idfc|first upi
INDmoney|indmoney.com
IndOASIS|indian|indian bank
IndusInd INDIE|indusind|induspay
Jar|myjar.app|changejar
JioFinance|jiofinance.in|jiopay
Jupiter Money|jupiter.money
Kiwi|gokiwi.in
Kotak 811|kotak
KreditBee|kreditbee.in
Kredit.Pe|kredit.pe
MobiKwik|mobikwik.com
Moneyview|moneyview.in
MufinPay|mufinpay.com
Navi|navi.com
Niyo Global|goniyo.com
NYE|rapipay.com
OmniCard|omnicard.in
OneCard|getonecard.app
OxyMoney|oxymoney.com
Paul Pay|paulmerchants.net
Paytm|paytm.com|patym pay tm
Payworld|payworldindia.com
PayZapp|hdfc|hdfc payzapp
PhonePe|phonepe.com|phone pay phone pe
POP UPI|popclub.co.in|popclub
QuikWallet|livquik.com
Rio Money|rio.money
SalarySe|salaryse.com
Samsung Wallet|samsung.com|samsung pay
Shriram One|shriramfinance.in
slice|slice.bank.in
super.money|super.money|supermoney
T Wallet|twallet.telangana.gov.in
TA One|transactionanalysts.com
Tata Neu|tataneu.com
TimePay|timepayonline.com
ToPay|mobilepe.co.in
True Balance|truebalance.io
Twid Pay|twidpay.com
UltraCash|ultracash.in
Unimoni India|unimoni.in
WhatsApp Pay|whatsapp.com|wa pay
YES Pay Lite|yes
YONO SBI|sbi
GoodScore|goodscore.app
Hero FinCorp|herofincorp.com
JUMPP|jumpp.finance
LXME UPI|lxme.in
Multipl|multipl.xyz
Novio|novio.co.in
Rediff|rediff.com
Refyne|refyne.co.in
Saathi|paynearby.in|pay nearby
Scapia|scapia.cards
Snapmint|snapmint.com
Stashfin|stashfin.com
ZET|zetapp.in`.split('\n').map(line => {
  const [name, domain, aliases = ''] = line.split('|');
  const localBanks = {"hdfc":"ico","axis":"ico","icici":"ico","sbi":"ico","indian":"png","canara":"png","kotak":"ico","idfc":"ico","pnb":"ico","baroda":"png","union":"png","boi":"png","iob":"png","uco":"png","maharashtra":"png","punjabsind":"png","indusind":"ico","yes":"png","rbl":"png","bandhan":"png","dcb":"ico","cityunion":"svg","tmb":"png","southindian":"png","karnataka":"svg","csb":"png","jk":"png","nainital":"png","dhanlaxmi":"png","au":"png","equitas":"png","ujjivan":"ico","utkarsh":"png","suryoday":"png","esaf":"png","jana":"jpg","shivalik":"png","capital":"png","airtel":"png","ippb":"png","fino":"svg","jio":"ico"};
  const icon = embedded[name] || (localBanks[domain] ? './assets/banks/' + domain + '.' + localBanks[domain] : 'https://www.google.com/s2/favicons?sz=64&domain=' + domain);
  return {name, aliases, icon};
 }).sort((a,b)=>a.name.localeCompare(b.name,'en'));
 const normalize = text => String(text).toLowerCase().replace(/[^a-z0-9]/g,'');
 function matches(query){
  const term=normalize(query);
  return catalog.filter(app=>normalize(app.name+' '+app.aliases).includes(term));
 }
 function symbol(name){
  const app=catalog.find(item=>item.name===name);
  const initial=String(name).trim().slice(0,2).toUpperCase();
  return '<span class="upi-symbol" aria-hidden="true">'+tidy(initial)+(app?'<img alt="" loading="lazy" referrerpolicy="no-referrer" src="'+tidy(app.icon)+'" onerror="this.remove()">':'')+'</span>';
 }
 function mount(anchor, initial=''){
  let value=String(initial||'');
  const picker=document.createElement('div');
  picker.className='upi-picker';
  picker.innerHTML='<details><summary class="field"></summary><label class="field">Search UPI apps<input class="input" type="search" maxlength="80" placeholder="Amazon Pay, GPay, Paytm…"></label><div class="upi-options"></div></details>';
  anchor.before(picker);
  const details=picker.querySelector('details'), summary=picker.querySelector('summary'), search=picker.querySelector('input'), list=picker.querySelector('.upi-options');
  const showSelection=()=>{summary.innerHTML='UPI app · '+(value?symbol(value)+' '+tidy(value):'Select app')};
  function refresh(){
   const query=search.value.trim();
   const names=matches(query).map(app=>app.name);
   if(query && !names.some(name=>normalize(name)===normalize(query)))names.push(query);
   list.replaceChildren();
   for(const name of ['',...names]){
    const button=document.createElement('button');
    button.type='button';button.setAttribute('aria-pressed',String(name===value));
    button.innerHTML=name?symbol(name)+tidy(name):'None';
    button.onclick=()=>{value=name;showSelection();details.open=false;search.value='';summary.focus()};
    list.append(button);
   }
  }
  details.addEventListener('toggle',()=>{if(details.open)refresh()});
  search.oninput=refresh;
  search.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();list.querySelectorAll('button')[1]?.click()}};
  showSelection();
  return ()=>value;
 }
 return {mount,symbol,matches};
})();
