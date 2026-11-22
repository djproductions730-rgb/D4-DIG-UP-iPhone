/* D4 Trip shared-group beta controller.
 * The production app remains in device / UID-private mode until an explicit
 * server-reviewed rollout flag is turned on and the trusted backend exists.
 * This controller never upgrades local demo names to security credentials.
 */
(function (root) {
  'use strict';
  var FLAG = root.D4_TRIP_SHARED_ROLLOUT === true;
  var storagePrefix = 'd4_trip_shared_refs_v1_';
  var state = { enabled:FLAG, busy:false, error:'', message:'', selected:null, details:null };
  var listeners = [];
  var adapter = null;
  var currentOperation = 0;

  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function auth() {
    var cloud = root.D4TripCloud;
    var actual = cloud && cloud.auth && cloud.auth.currentUser;
    if (!actual || !cloud.user || actual.uid !== cloud.user.uid || !actual.emailVerified)
      return null;
    return actual;
  }
  function render() {
    var local = root.D4TripLocal;
    if (local && typeof local.render === 'function' &&
        typeof local.view === 'function' && local.view() === 'profile')
      local.render();
  }
  function refs(uid) {
    if (!uid) return [];
    try {
      var value = JSON.parse(root.localStorage.getItem(storagePrefix + uid) || '[]');
      if (!Array.isArray(value)) return [];
      return value.filter(function(id) {
        return typeof id === 'string' && /^[a-zA-Z0-9_-]{5,128}$/.test(id);
      }).slice(0,40);
    } catch (_) { return []; }
  }
  function remember(uid,id) {
    var ids = refs(uid);
    if (!ids.includes(id)) ids.push(id);
    try {root.localStorage.setItem(storagePrefix+uid,JSON.stringify(ids.slice(-40)));}catch(_){}
  }
  function resetSession() {
    currentOperation++;
    state.selected = null; state.details = null; state.busy = false;
    state.error = ''; state.message = '';
    listeners.forEach(function(stop){try {stop();} catch (_) {}});
    listeners = [];
    render();
  }
  function setAdapter(value) {
    if (!FLAG) return;
    adapter = value;
    state.message = 'Secure group beta adapter ready. Production verification is still required.';
    render();
  }
  function form(name,inner,button) {
    return '<form class="d4-shared-form" data-d4-shared-form="'+name+
      '" style="display:grid;gap:10px;margin-top:12px">'+inner+
      '<button class="btn small mint" type="submit">'+button+'</button></form>';
  }
  function field(name,title,kind,more) {
    return '<label class="field"><span>'+escapeHtml(title)+'</span>'+
      '<input name="'+name+'" class="input" type="'+(kind||'text')+'" '+(more||'')+
      ' required></label>';
  }
  function panel() {
    var user=auth();
    var status=!FLAG?'Integration preview · not live':
      !adapter?'Connecting secure adapter':!user?'Verified Firebase sign-in required':
      'Verified account · beta ready';
    var rows=[
      '<section class="card" id="d4-shared-panel" style="margin-bottom:16px">',
      '<div class="space-between"><div><h3>🛡️ Secure Groups <span class="pill">Milestone 05</span></h3>',
      '<p class="muted" style="font-size:12px">'+escapeHtml(status)+'</p></div>',
      '<span style="font-size:28px">🔐</span></div>',
      '<div class="row" style="margin-top:9px;gap:6px">',
      '<span class="pill">👑 Main Admin</span>',
      '<span class="pill">🛡️ Trip Admin</span>',
      '<span class="pill">👤 Member</span></div>',
      '<p class="tiny" style="margin-top:12px">Separate account permissions, one-time invites, audit-safe payments and private rooms. Local demo profiles do not grant cloud permissions.</p>'
    ];
    if (!FLAG) {
      rows.push('<div class="notice" role="status">Development preview only. Real multi-account sharing is OFF until callable Functions, App Check, Firestore membership rules and two-account testing are deployed and verified.</div>');
      rows.push('<div class="row" style="margin-top:10px"><span class="pill">✓ Security draft tested</span><span class="pill">⌛ Live deployment pending</span></div>');
    } else if (!adapter) {
      rows.push('<div class="notice">Secure server connection unavailable. Do not enter trip information yet.</div>');
    } else if (!user) {
      rows.push('<div class="notice">Sign in and verify your Firebase email in the account section above to access shared groups.</div>');
    } else {
      rows.push(form('join',
        field('invite','One-time invitation code','text','minlength="24" maxlength="128" autocomplete="off"')+
        field('displayName','Your name in this group','text','minlength="2" maxlength="70" autocomplete="name"'),
        'Join Secure Trip'));
      rows.push(form('create',
        field('name','New trip name','text','minlength="2" maxlength="70"')+
        field('destination','Destination','text','maxlength="100"')+
        field('targetAmount','Per-person target (₹)','number','min="0" max="99999999" step="0.01" value="0"'),
        'Create Trip (Main Admin only)'));
      var ids=refs(user.uid);
      rows.push('<div style="margin-top:12px"><b>My secure trip references</b><div class="row" style="margin-top:7px">'+
        (ids.length?ids.map(function(id){
          return '<button type="button" class="btn small ghost" data-d4-shared-open="'+escapeHtml(id)+'">🗺️ '+escapeHtml(id)+'</button>';
        }).join(''):'<span class="tiny">No shared trips linked yet</span>')+'</div></div>');
      if(state.details) {
        rows.push('<div class="notice" style="margin-top:10px"><b>'+escapeHtml(state.details.name||'Trip')+
          '</b> · '+escapeHtml(state.details.destination||'')+
          '<p>Loaded from authenticated Firestore. This separate preview does not modify offline trips.</p></div>');
      }
    }
    if(state.busy)rows.push('<p class="tiny" role="status">Checking secure server response…</p>');
    if(state.error) rows.push('<p class="notice" role="alert">⚠️ '+escapeHtml(state.error)+'</p>');
    if(state.message) rows.push('<p class="notice" role="status">'+escapeHtml(state.message)+'</p>');
    rows.push('</section>');
    return rows.join('');
  }
  function basicValidation(kind,data) {
    if(kind==='join'){
      if(!/^[a-zA-Z0-9_-]{24,128}$/.test(data.code))throw Error('Invite code invalid');
      if(data.displayName.trim().length<2||data.displayName.length>70)throw Error('Enter your name');
    } else if(kind==='create') {
      if(data.name.trim().length<2||data.name.length>70)throw Error('Invalid trip name');
      if(!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(data.targetAmount))
        throw Error('Invalid target amount');
    } else throw Error('Unknown action');
  }
  async function submit(kind,data) {
    if(!FLAG || !adapter)throw Error('Shared groups are not live');
    var user = auth();
    if(!user)throw Error('Verified Firebase account required');
    if(state.busy)throw Error('Request already processing');
    basicValidation(kind,data);
    var op=++currentOperation, uid=user.uid;
    state.busy=true;state.error='';state.message='';render();
    try{
      var result=kind==='join'
        ?await adapter.call('redeemInvite',{code:data.code,displayName:data.displayName.trim()})
        :await adapter.call('createTrip',{name:data.name.trim(),destination:String(data.destination||'').trim(),targetAmount:String(data.targetAmount)});
      if(currentOperation!==op || auth()?.uid!==uid)throw Error('Account changed; response ignored');
      if(!result || !/^[a-zA-Z0-9_-]{5,128}$/.test(result.tripId))throw Error('Server returned an invalid trip reference');
      remember(uid,result.tripId);
      state.message=kind==='join'?'Joined secure trip successfully':'Secure trip created successfully';
      return result;
    } catch(e) {
      if(currentOperation===op && auth()?.uid===uid)state.error=String(e?.message||e).slice(0,220);
      throw e;
    } finally {
      if(currentOperation===op) {state.busy=false;render();}
    }
  }
  async function open(id){
    if(!FLAG||!adapter)throw Error('Secure beta is disabled');
    var user=auth(),uid=user?.uid;
    if(!uid||!refs(uid).includes(id))throw Error('No saved trip reference for this account');
    var op=++currentOperation;
    state.error='';state.details=null;state.busy=true;render();
    try {
      var detail=await adapter.getTrip(id);
      if(currentOperation!==op||auth()?.uid!==uid)throw Error('Account changed; response ignored');
      if(!detail||typeof detail.name!=='string')throw Error('Trip unavailable');
      state.selected=id;state.details=detail;state.message='Secure trip loaded';
    }catch(e){
      if(currentOperation===op && auth()?.uid===uid)state.error=String(e?.message||e).slice(0,220);
      throw e;
    } finally {
      if(currentOperation===op){state.busy=false;render();}
    }
  }
  if (root.document && root.document.addEventListener) {
    root.document.addEventListener('submit',function(event){
      var formNode=event.target.closest && event.target.closest('[data-d4-shared-form]');
      if(!formNode)return;
      event.preventDefault();
      if(!FLAG || state.busy)return;
      var values=Object.fromEntries(new FormData(formNode).entries());
      var kind=formNode.dataset.d4SharedForm;
      if(kind==='join'){values={code:values.invite,displayName:values.displayName};}
      submit(kind,values).catch(function(){});
    });
    root.document.addEventListener('click',function(event){
      var control=event.target.closest && event.target.closest('[data-d4-shared-open]');
      if(control){event.preventDefault();open(control.dataset.d4SharedOpen).catch(function(){});}
    });
  }
  root.D4TripShared={
    panel:panel,
    submit:submit,
    open:open,
    setAdapter:setAdapter,
    resetSession:resetSession,
    status:state,
    get enabled(){return FLAG;}
  };
})(window);
