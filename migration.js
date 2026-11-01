'use strict';
/**
 * D4 DIG UP: one-time account migration from the verified native APK backend.
 * A backup must be exported after the account holder verifies their OTP in
 * the separate owner-hosted Apps Script migration bridge.
 *
 * Local-only import: DOES NOT write to the original Google Sheet or provide
 * live account login. Never replaces nonempty local data or mixes two users.
 */
(function () {
  const MAX_FILE_BYTES=5*1024*1024;
  const money=n=>Math.round(Number(n)*100)/100;
  const nativeFormat='d4-dig-up-native-backup';
  // The account owner must first deploy migration-bridge/ as a separate
  // Google Apps Script web app and set this official URL in a GitHub update.
  // No real URL exists in this repository yet.
  const MIGRATION_BRIDGE_URL='';
  window.startNativeMigration=function () {
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(MIGRATION_BRIDGE_URL)){
      alert('Verified Gmail OTP migration bridge has not been deployed yet. The app owner must activate it first. Do NOT share your OTP. If you already have a verified Android account JSON backup, use Import verified Android backup.');
      return;
    }
    window.open(MIGRATION_BRIDGE_URL,'_blank','noopener,noreferrer');
  };

  const stamp=v=> {
    const s=String(v||'').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s+'T12:00:00';
    return s || new Date().toISOString();
  };
  const safeNumber=(v,label)=>{
    const n=Number(v);
    if(!Number.isFinite(n) || Math.abs(n)>100000000000)throw Error('Invalid '+label);
    return money(n);
  };
  const linkedCurrent=()=>[data.banks,data.entries,data.plans,data.loans]
    .some(arr=>Array.isArray(arr)&&arr.length>0);

  // Never run this blindly: two accounts may share a bank display name.
  function prepareNativeImport(snapshot) {
    if(!snapshot || snapshot.format!==nativeFormat)
      throw Error('Choose the verified D4 Android account JSON backup, not an empty Web backup or a CSV.');
    const account=snapshot.user;
    if(!account || typeof account!=='object' || !String(account.email||'').includes('@'))
      throw Error('Account identity missing from backup.');
    const email=String(account.email).trim().toLowerCase();
    const banks=Array.isArray(snapshot.banks)?snapshot.banks:null;
    const transactions=Array.isArray(snapshot.transactions)?snapshot.transactions:null;
    const plans=Array.isArray(snapshot.plans)?snapshot.plans:null;
    const loans=Array.isArray(snapshot.loans)?snapshot.loans:null;
    if(!banks||!transactions||!plans||!loans)
      throw Error('Incomplete backup. Banks, transactions, plans and loans are required.');
    if(!banks.length && !transactions.length && !plans.length && !loans.length)
      throw Error('The source account backup is empty. No changes were made.');
    if(banks.length>100||transactions.length>5000||plans.length>1000||loans.length>500)
      throw Error('Backup exceeds safe migration limits.');
    const mapBank=new Map();
    const balanceMap=new Map();
    const outputBanks=banks.map((b,index)=>{
      if(!b||typeof b!=='object')throw Error('Invalid bank row');
      const name=String(b.name||'').trim();
      const slot=String(b.slot??index+1).trim();
      if(!name||name.length>120)throw Error('Bank name missing');
      if(mapBank.has(name))throw Error('Repeated bank name "'+name+'". Migration needs account-slot matching; no data changed.');
      const id='native-bank-'+slot.replace(/[^a-zA-Z0-9_-]/g,'')+'-'+index;
      const balance=safeNumber(b.opening??b.openingBalance??0,'opening balance');
      const result={id,name,nick:'Imported account '+slot,balance};
      mapBank.set(name,result);
      balanceMap.set(name,balance);
      return result;
    });
    const entries=transactions.map((t,index)=>{
      if(!t||typeof t!=='object')throw Error('Invalid transaction row');
      const type=String(t.type||'').toLowerCase();
      if(!['income','expense','transfer'].includes(type))throw Error('Unknown transaction type');
      const amount=safeNumber(t.amount,'transaction amount');
      if(amount<0)throw Error('Negative transaction amount');
      const bank=String(t.bank||'').trim();
      const fromBank=String(t.fromBank||'').trim();
      const toBank=String(t.toBank||'').trim();
      if(type!=='transfer'&&!mapBank.has(bank))
        throw Error('Transaction uses unrecognized bank: '+bank);
      if(type==='transfer'&&(!mapBank.has(fromBank)||!mapBank.has(toBank)))
        throw Error('Transfer banks are missing from account snapshot.');
      if(type==='income')balanceMap.set(bank,money(balanceMap.get(bank)+amount));
      if(type==='expense')balanceMap.set(bank,money(balanceMap.get(bank)-amount));
      if(type==='transfer'){
        balanceMap.set(fromBank,money(balanceMap.get(fromBank)-amount));
        balanceMap.set(toBank,money(balanceMap.get(toBank)+amount));
      }
      const date=String(t.date||'');
      if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw Error('Invalid transaction date');
      return {
        id:'native-entry-'+String(t.id||index),
        bankId:type==='transfer'?mapBank.get(fromBank).id:mapBank.get(bank).id,
        type:type[0].toUpperCase()+type.slice(1),
        amount,category:String(t.category||'Other').slice(0,80),
        note:String(t.note||'').slice(0,500),
        created:stamp(date||t.created),
        date,
        bank,fromBank,toBank,
        sourceId:String(t.id||''),
        payment:String(t.app||t.paymentApp||'').slice(0,80)
      };
    });
    outputBanks.forEach(bank=>bank.balance=balanceMap.get(bank.name));
    const outputPlans=plans.map((p,index)=>{
      if(!p||typeof p!=='object')throw Error('Invalid plan row');
      return {...p,
        id:'native-plan-'+String(p.id??index),
        name:String(p.name||'Plan').slice(0,100),
        target:safeNumber(p.target||0,'plan target'),
        saved:safeNumber(p.saved||0,'plan savings'),
        actualSpent:safeNumber(p.actualSpent||0,'plan spending'),
        dueDate:String(p.targetDate||p.dueDate||'').slice(0,10)};
    });
    const outputLoans=loans.map((l,index)=>{
      if(!l||typeof l!=='object')throw Error('Invalid loan row');
      if(!Array.isArray(l.payments) && l.payments!==undefined)
        throw Error('Invalid loan payment history');
      const payments=(l.payments||[]).map((p,i)=>({
        ...p,id:'native-payment-'+String(p.id??i),
        amount:safeNumber(p.amount,'loan payment')
      }));
      return {...l,
        id:'native-loan-'+String(l.id??index),
        name:String(l.name||'Loan').slice(0,100),
        principal:safeNumber(l.principal||0,'loan principal'),
        annualRate:safeNumber(l.annualRate||0,'loan interest'),
        payments
      };
    });
    return {
      account:{id:String(account.id||''),email,name:String(account.name||'').slice(0,90)},
      banks:outputBanks,entries,plans:outputPlans,loans:outputLoans,
      source:'verified-native-otp-migration',
      exportedAt:String(snapshot.exportedAt||'')
    };
  }
  async function importNativeAccount(input) {
    const file=input?.files?.[0];
    if(!file)return;
    try {
      if(file.size>MAX_FILE_BYTES)throw Error('Backup file too large');
      const snapshot=JSON.parse(await file.text());
      const imported=prepareNativeImport(snapshot);
      if(linkedCurrent()){
        throw Error('Brave already has records. Export a local backup first, then use a separate empty browser profile/device for this account. Nothing was overwritten.');
      }
      const {account}=imported;
      if(!confirm('Import verified source account backup for '+account.name+' ('+account.email+')?\n'+
        imported.banks.length+' banks, '+imported.entries.length+' transactions, '+
        imported.plans.length+' plans, '+imported.loans.length+' loans.\n\n'+
        'This is a ONE-TIME local copy, NOT automatic Google Sheets sync. Continue?'))return;
      const next={
        banks:imported.banks,
        entries:imported.entries,
        plans:imported.plans,
        loans:imported.loans,
        source:imported.source,
        exportedAt:imported.exportedAt,
        linkedName:imported.account.name,
        linkedEmail:imported.account.email
      };
      // localStorage.setItem must succeed BEFORE updating in-memory state.
      const previous=localStorage.getItem(KEY);
      try {localStorage.setItem(KEY,JSON.stringify(next));}
      catch(error){
        if(previous!==null){try{localStorage.setItem(KEY,previous)}catch(_){/* no-op */}}
        throw Error('Could not save imported data. No existing app data was intentionally replaced.');
      }
      data=next;
      tab='home';
      render();
      alert('Imported '+imported.entries.length+' transactions and '+imported.banks.length+
        ' banks to this Brave browser. This does NOT sync back to the Android app.');
    }catch(error){
      alert('Account import blocked: '+(error?.message||error));
    }finally{input.value='';}
  }
  window.importNativeAccount=importNativeAccount;
})();