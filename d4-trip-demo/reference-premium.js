/* D4 Trip — Reference UI v35. Presentation and existing delegated actions only.
   All monetary figures come from current trip records; no Firebase writes. */
(function(){
  'use strict';
  const previous = {
    bottomNav:bottomNav, tripOverview:tripOverview, collectionsPage:collectionsPage,
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
  tripOverview=function(t){
    if(!t)return previous.tripOverview(t);
    return tripHero(t)+
      '<details class="ref-expand-tools"><summary>✨ More Trip Tools &amp; Admin Options <span>⌄</span></summary>'+
      '<div class="ref-tool-body">'+previous.tripOverview(t)+'</div></details>';
  };
  collectionsPage=function(){
    const t=current();
    if(!t)return previous.collectionsPage();
    const c=collectionTotals(t),canEdit=isTripAdmin(t);
    const recent=(t.collection?.payments||[]).slice(-4).reverse();
    const history=recent.map(item=>'<div class="ref-receipt"><span class="ref-receipt-avatar">'+html(String(item.member||'?').slice(0,1).toUpperCase())+'</span>'+
      '<div><strong>'+html(item.member)+'</strong><small>'+html(item.date||'')+' · '+html(item.method||'Manual')+'</small></div>'+
      '<b>'+money(item.amount)+'</b></div>').join('');
    return '<section class="ref-finance-cover"><span class="ref-overline">✦ TRIP COLLECTIONS</span><h2>Payments</h2>'+
      '<p>'+html(t.name)+' · '+t.members.length+' members</p>'+
      '<div class="ref-finance-grid"><div class="ref-ring" style="--pct:'+c.progress+'"><span><strong>'+c.progress+'%</strong><small>Collected</small></span></div>'+
      '<div class="ref-finance-values"><div><small>Total target</small><b>'+money(c.target)+'</b></div>'+
      '<div><small>Received</small><b class="ref-good">'+money(c.paid)+'</b></div>'+
      '<div><small>Remaining</small><b class="ref-due">'+money(c.pending)+'</b></div></div></div>'+
      '<div class="ref-status-grid"><span>✅ Paid <b>'+c.full+'</b></span><span>◐ Partial <b>'+c.partial+'</b></span><span>⏳ Pending <b>'+c.unpaid+'</b></span></div>'+
      '<div class="ref-finance-buttons"><button class="ref-primary" data-action="collection-members">👥 View Member Payments</button>'+
      (canEdit?'<button class="ref-secondary" data-action="collection-quick-add" data-id="'+html(t.id)+'">＋ Add Payment</button>':'<span class="ref-readonly">🔒 View only</span>')+'</div></section>'+
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
  function mobileItem(icon,label,action,attr,active){
    return '<button type="button" class="ref-nav-item'+(active?' active':'')+'" data-action="'+action+'" '+attr+' aria-label="'+label+'"'+
      (active?' aria-current="page"':'')+'><span class="ref-nav-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>';
  }
  bottomNav=function(){
    if(view==='entry'||!current())return previous.bottomNav();
    const t=current();
    const canEdit=isTripAdmin(t);
    const items=[
      mobileItem('⌂','Home','open-tab','data-ctx="overview"',view==='trip'&&tripTab==='overview'),
      mobileItem('▣','Day Plan','open-tab','data-ctx="plan"',view==='trip'&&tripTab==='plan'),
      '<button type="button" class="ref-nav-plus" data-ref-action="toggle-plus" aria-label="'+(canEdit?'Add trip item':'Explore trip sections')+'" aria-expanded="'+(quickPanel==='plus')+'"><span>＋</span></button>',
      mobileItem('☏','Chat','nav','data-view="chat"',view==='chat'),
      '<button type="button" class="ref-nav-item'+(quickPanel==='more'?' active':'')+'" data-ref-action="toggle-more" aria-label="More sections" aria-expanded="'+(quickPanel==='more')+'"><span class="ref-nav-icon">☷</span><small>More</small></button>'
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
