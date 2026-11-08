/* D4 Trip — Reference UI v36. Presentation and existing delegated actions only.
   All monetary figures come from current trip records; no Firebase writes. */
(function(){
  'use strict';
  const previous = {
    bottomNav:bottomNav, tripOverview:tripOverview, collectionsPage:collectionsPage, home:home,
    tripMembers:tripMembers, expensesPage:expensesPage, entryPage:entryPage,
    tripPage:tripPage, adminPage:adminPage
  };
  let quickPanel = '';
  const html = value => esc(value == null ? '' : String(value));
  const travelCover = '<span class="ref-sun" aria-hidden="true"></span><span class="ref-palm" aria-hidden="true">🌴</span>';
  function iconButton(icon,label,action,attr=''){
    return '<button type="button" class="ref-action" data-action="'+action+'" '+attr+'>'+
      '<span class="ref-action-ico" aria-hidden="true">'+icon+'</span><strong>'+html(label)+'</strong></button>';
  }
  function memberRole(t,name){
    if(isMain() && String(name)===String(profile)) return 'Main Admin';
    return Array.isArray(t.admins)&&t.admins.includes(name) ? 'Admin':'Member';
  }
  function roleBadge(role){
    return '<span class="ref-role '+(role==='Main Admin'?'owner':role==='Admin'?'admin':'member')+'">'+
      (role==='Main Admin'?'👑 ':role==='Admin'?'🛡️ ':'')+role+'</span>';
  }
  function tripHero(t){
    const c=collectionTotals(t);
    const days=datesInTrip(t).length;
    return '<section class="ref-trip-hero" aria-label="Trip overview">'+travelCover+
      '<div class="ref-hero-brand">✦ D4 Trip <span>YOUR ADVENTURE</span></div>'+
      '<h2>'+html(t.name)+'</h2><p>📍 '+html(t.destination)+' · '+html(shortDate(t.start))+' — '+html(shortDate(t.end))+'</p>'+
      '<div class="ref-hero-stats">'+
      '<div><span>👥</span><b>'+t.members.length+'</b><small>Members</small></div>'+
      '<div><span>✅</span><b>'+money(c.paid)+'</b><small>Received</small></div>'+
      '<div><span>⏳</span><b>'+money(c.pending)+'</b><small>Pending</small></div></div>'+
      '<div class="ref-hero-actions">'+
      iconButton('🗓️','Day Plan','open-tab','data-ctx="plan"')+
      iconButton('👥','Members','open-tab','data-ctx="members"')+
      iconButton('💳','Payments','nav','data-view="collections"')+
      iconButton('🧾','Expenses','nav','data-view="expenses"')+'</div>'+
      '<div class="ref-progress-label"><span>Trip payments</span><strong>'+c.progress+'%</strong></div>'+
      '<div class="ref-progress-track" role="progressbar" aria-label="Trip contributions" aria-valuenow="'+c.progress+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+c.progress+'%"></span></div>'+
      '<p class="ref-hero-foot">'+money(c.paid)+' of '+money(c.target)+' collected · '+days+' trip days</p></section>';
  }
  function memberAmountPanel(t){
    const c=collectionTotals(t),canEdit=isTripAdmin(t);
    const entry=row=>'<article class="ref-balance-person">'+
      '<span class="ref-balance-initial" aria-hidden="true">'+html(String(row.member).slice(0,1).toUpperCase())+'</span>'+
      '<div class="ref-balance-details"><b>'+html(row.member)+'</b><small class="ref-balance-status">'+html(row.status)+'</small>'+
      '<div><span>Paid <strong>'+money(row.paid)+'</strong></span><span>Due <strong>'+money(row.pending)+'</strong></span></div></div>'+
      (canEdit?'<button type="button" class="ref-edit-paid" data-action="collection-member-total" data-member="'+html(row.member)+'" aria-label="Edit paid amount for '+html(row.member)+'">✎ Edit</button>':'')+'</article>';
    const first=c.rows.slice(0,4).map(entry).join('');
    const rest=c.rows.slice(4).map(entry).join('');
    return '<section class="ref-home-balances" aria-label="Live member payment balances">'+
      '<div class="ref-section-title"><h3>👥 Member Amounts</h3><button type="button" data-action="nav" data-view="collections">Payments ›</button></div>'+
      '<div class="ref-home-balances-total"><span>Received <b>'+money(c.paid)+'</b></span><span>Remaining <b>'+money(c.pending)+'</b></span></div>'+
      (first||'<p class="ref-empty">No members in this trip yet.</p>')+
      (rest?'<details class="ref-all-balances"><summary>Show all '+c.rows.length+' members <span>⌄</span></summary>'+rest+'</details>':'')+
      '</section>';
  }
  home=function(){
    const t=current(),legacy=previous.home();
    return t?memberAmountPanel(t)+legacy:legacy;
  };
  tripOverview=function(t){
    if(!t)return previous.tripOverview(t);
    return tripHero(t)+memberAmountPanel(t)+
      '<details class="ref-expand-tools"><summary>✨ More Trip Tools &amp; Admin Options <span>⌄</span></summary>'+
      '<div class="ref-tool-body">'+previous.tripOverview(t)+'</div></details>';
  };
  collectionsPage=function(){
    const t=current();
    if(!t)return previous.collectionsPage();
    const c=collectionTotals(t),canEdit=isTripAdmin(t);
    const recent=(t.collection?.payments||[]).slice(-6).reverse();
    const history=recent.map(item=>'<div class="ref-receipt"><span class="ref-receipt-avatar">'+html(String(item.member||'?').slice(0,1).toUpperCase())+'</span>'+
      '<div><strong>'+html(item.member)+'</strong><small>'+(item.adjustment?'Balance correction · ':'')+html(item.date||'')+' · '+html(item.method||'Manual')+'</small></div>'+
      '<b>'+money(item.amount)+'</b>'+
      (canEdit&&!item.adjustment?'<button type="button" class="ref-edit-receipt" data-action="collection-edit-payment" data-id="'+html(item.id)+'" aria-label="Edit payment for '+html(item.member)+'">✎ Edit</button>':'')+
      '</div>').join('');
    return '<section class="ref-finance-cover"><span class="ref-overline">✦ TRIP COLLECTIONS</span><h2>Payments</h2>'+
      '<p>'+html(t.name)+' · '+t.members.length+' members</p>'+
      '<div class="ref-finance-grid"><div class="ref-ring" style="--pct:'+c.progress+'"><span><strong>'+c.progress+'%</strong><small>Collected</small></span></div>'+
      '<div class="ref-finance-values"><div><small>Total target</small><b>'+money(c.target)+'</b></div>'+
      '<div><small>Received</small><b class="ref-good">'+money(c.paid)+'</b></div>'+
      '<div><small>Remaining</small><b class="ref-due">'+money(c.pending)+'</b></div></div></div>'+
      '<div class="ref-status-grid"><span>✅ Paid <b>'+c.full+'</b></span><span>◐ Partial <b>'+c.partial+'</b></span><span>⏳ Pending <b>'+c.unpaid+'</b></span></div>'+
      '<div class="ref-finance-buttons"><button class="ref-primary" data-action="collection-members">👥 View Member Payments</button>'+
      (canEdit?'<button class="ref-secondary" data-action="collection-quick-add" data-id="'+html(t.id)+'">＋ Add Payment</button>':'<span class="ref-readonly">🔒 View only</span>')+'</div></section>'+
      memberAmountPanel(t)+
      '<section class="ref-card ref-recent"><div class="ref-section-title"><h3>Recent Payments</h3><button data-action="collection-members">View all ›</button></div>'+
      (history||'<p class="ref-empty">No payments recorded yet.</p>')+'</section>'+
      '<section class="ref-original-finance" aria-label="Complete payment details">'+previous.collectionsPage()+'</section>';
  };
  tripMembers=function(t){
    if(!t)return previous.tripMembers(t);
    const members=(t.members||[]).map(name=>{
      const role=memberRole(t,name);
      return '<article class="ref-person" data-ref-person="'+html(String(name).toLocaleLowerCase())+'">'+
        '<span class="ref-person-avatar" aria-hidden="true">'+html(String(name).slice(0,1).toUpperCase())+'</span>'+
        '<div><strong>'+html(name)+'</strong>'+roleBadge(role)+'</div>'+
        '<span class="ref-person-arrow" aria-hidden="true">›</span></article>';
    }).join('');
    const editors=(t.admins||[]).length;
    return '<section class="ref-members-head"><span class="ref-overline">✦ YOUR PEOPLE</span><h2>Members <em>('+t.members.length+')</em></h2>'+
      '<p>Everyone in your trip, together.</p>'+
      '<div class="ref-member-counts"><span>👥 All '+t.members.length+'</span><span>🛡️ Admins '+editors+'</span></div>'+
      '<label class="ref-member-search">⌕ <input type="search" id="ref-member-search" placeholder="Search member..." aria-label="Search members"></label></section>'+
      '<section class="ref-person-list" id="ref-person-list">'+(members||'<div class="ref-empty">No members yet.</div>')+'</section>'+
      '<details class="ref-expand-tools"><summary>👥 Member Management &amp; Cloud Roster <span>⌄</span></summary>'+
      '<div class="ref-tool-body">'+previous.tripMembers(t)+'</div></details>';
  };
  expensesPage=function(){
    const t=current();
    if(!t)return previous.expensesPage();
    const c=calculations(t);
    const icons={stay:'🛏️',hotel:'🛏️',travel:'🚕',transport:'🚕',food:'🍴',drink:'☕',activity:'🎭',sightseeing:'🏖️',other:'🧾'};
    const rows=Object.entries(c.categories||{}).sort((a,b)=>b[1]-a[1]);
    const cards=rows.map(([name,amount])=>{
      const key=String(name).toLowerCase();
      const emoji=Object.entries(icons).find(([k])=>key.includes(k))?.[1]||'🧾';
      return '<div class="ref-expense-row"><span class="ref-expense-icon">'+emoji+'</span><strong>'+html(name)+'</strong><b>'+money(amount)+'</b></div>';
    }).join('');
    return '<section class="ref-expense-cover"><span class="ref-overline">✦ TRIP EXPENSES</span><h2>Expenses</h2><p>'+html(t.name)+'</p>'+
      '<div class="ref-expense-sum"><span>💼</span><div><small>Total spent</small><strong>'+money(c.total)+'</strong></div></div></section>'+
      '<section class="ref-card"><div class="ref-section-title"><h3>Spending Categories</h3><span>'+rows.length+' categories</span></div>'+
      (cards||'<p class="ref-empty">No expenses recorded yet.</p>')+'</section>'+
      (isTripAdmin(t)?'<button class="ref-primary ref-wide" data-action="quick-expense">＋ Add Expense</button>':'<p class="ref-readonly">🔒 Members can view expenses.</p>')+
      '<section class="ref-existing-expenses">'+previous.expensesPage()+'</section>';
  };
  adminPage=function(){
    if(!isMain())return previous.adminPage();
    return '<section class="ref-admin-hero"><span class="ref-crown">♛</span><span class="ref-overline">D4 TRIP · CONTROL CENTRE</span>'+
      '<h2>Main Admin</h2><p>Manage trips and permissions securely.</p></section>'+
      '<div class="ref-admin-shortcuts">'+
      iconButton('👥','Members','open-tab','data-ctx="members"')+
      iconButton('💳','Payments','nav','data-view="collections"')+
      iconButton('🗓️','Trip Plan','open-tab','data-ctx="plan"')+
      iconButton('⚙️','Settings','nav','data-view="profile"')+'</div>'+previous.adminPage();
  };
  tripPage=function(){
    const t=current();
    if(!t)return previous.tripPage();
    if(tripTab!=='plan')return previous.tripPage();
    return '<div class="ref-plan-cover"><span class="ref-overline">✦ DAY BY DAY</span><h2>Day Plan</h2>'+
      '<p>'+html(t.name)+' · '+html(shortDate(t.start))+' — '+html(shortDate(t.end))+'</p></div>'+
      previous.tripPage();
  };
  entryPage=function(){
    return '<div class="ref-entry-heading"><span>✦ D4 TRIP</span><strong>Plan · Track · Share · Enjoy</strong></div>'+
      previous.entryPage();
  };
  const navPaths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h3m-3 4h3"/>',
    chat:'<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    more:'<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  const navSvg=key=>'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+navPaths[key]+'</svg>';
  function mobileItem(icon,label,action,attr,active){
    return '<button type="button" class="ref-nav-item'+(active?' active':'')+'" data-action="'+action+'" '+attr+' aria-label="'+label+'"'+
      (active?' aria-current="page"':'')+'><span class="ref-nav-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>';
  }
  bottomNav=function(){
    if(view==='entry'||!current())return previous.bottomNav();
    const t=current();
    const canEdit=isTripAdmin(t);
    const items=[
      mobileItem(navSvg('home'),'Home','open-tab','data-ctx="overview"',view==='trip'&&tripTab==='overview'),
      mobileItem(navSvg('calendar'),'Day Plan','open-tab','data-ctx="plan"',view==='trip'&&tripTab==='plan'),
      '<button type="button" class="ref-nav-plus" data-ref-action="toggle-plus" aria-label="'+(canEdit?'Add trip item':'Explore trip sections')+'" aria-expanded="'+(quickPanel==='plus')+'"><span>＋</span></button>',
      mobileItem(navSvg('chat'),'Chat','nav','data-view="chat"',view==='chat'),
      '<button type="button" class="ref-nav-item'+(quickPanel==='more'?' active':'')+'" data-ref-action="toggle-more" aria-label="More sections" aria-expanded="'+(quickPanel==='more')+'"><span class="ref-nav-icon">'+navSvg('more')+'</span><small>More</small></button>'
    ];
    let overlay='';
    if(quickPanel){
      const links=quickPanel==='plus'&&canEdit
        ?[
          ['💳','Record Payment','collection-quick-add','data-id="'+html(t.id)+'"'],
          ['🧾','Add Expense','quick-expense',''],
          ['🗓️','Add Activity','quick-plan',''],
          ['👥','Add Member','modal-add-member','']
        ]
        :[
          ['👥','Members','open-tab','data-ctx="members"'],
          ['💳','Payments','nav','data-view="collections"'],
          ['🧾','Expenses','nav','data-view="expenses"'],
          ['📊','Reports','nav','data-view="reports"'],
          ['📸','Memories','nav','data-view="memories"'],
          ['🔔','Alerts','nav','data-view="alerts"'],
          ['⚙️','Settings','nav','data-view="profile"'],
          ...(isMain()?[['👑','Main Admin','d4-admin-panel','']]:[])
        ];
      overlay='<div class="ref-nav-overlay" role="group" aria-label="'+(quickPanel==='plus'?'Quick actions':'More trip sections')+'">'+
        '<div class="ref-nav-overlay-title">'+(quickPanel==='plus'?(canEdit?'Quick Add':'Explore'):'More Sections')+
        '<button type="button" data-ref-action="close-panel" aria-label="Close menu">✕</button></div>'+
        links.map(([emoji,label,action,attr])=>'<button class="ref-menu-link" type="button" data-action="'+action+'" '+attr+'><span>'+emoji+'</span>'+label+'<b>›</b></button>').join('')+
        '</div>';
    }
    return '<nav class="bottom-nav ref-bottom-nav" aria-label="D4 Trip navigation">'+overlay+items.join('')+'</nav>';
  };
  document.addEventListener('click',function(event){
    const el=event.target.closest('[data-ref-action]');
    if(el){
      event.preventDefault();event.stopImmediatePropagation();
      if(el.dataset.refAction==='toggle-plus')quickPanel=quickPanel==='plus'?'':'plus';
      else if(el.dataset.refAction==='toggle-more')quickPanel=quickPanel==='more'?'':'more';
      else quickPanel='';
      render();
    } else if(event.target.closest('.ref-menu-link')){
      quickPanel='';
    }
  },true);
  document.addEventListener('input',function(event){
    if(event.target.id!=='ref-member-search')return;
    const q=event.target.value.trim().toLocaleLowerCase();
    document.querySelectorAll('[data-ref-person]').forEach(el=>{
      el.hidden=!el.dataset.refPerson.includes(q);
    });
  });
  render();
})();
