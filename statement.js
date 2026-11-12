'use strict';
(() => {
  const day = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
  const displayDate = date => date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const ink = '#211c32', purple = '#553188', muted = '#635d70';
  let start, end, library;
  window.statementPanel = bank => {
    const now = new Date();
    start ??= day(new Date(now.getFullYear(),now.getMonth(),1));
    end ??= day(now);
    return `<section class="d4-statement"><h3>Transaction statement</h3><p>PDF · ${tidy(bank || 'All banks')} · Both dates included</p>
      <div class="statement-grid"><label>Start date<input type="date" name="statement-start" value="${start}" required></label><label>End date<input type="date" name="statement-end" value="${end}" required></label></div>
      <div class="statement-grid"><button type="button" data-statement="preview">Preview PDF</button><button type="button" data-statement="download">Download PDF</button></div><output aria-live="polite"></output></section>`;
  };
  function script(file) {
    return new Promise((resolve,reject)=>{
      const tag=document.createElement('script');
      tag.src='./assets/pdfmake/'+file;
      tag.onload=resolve;
      tag.onerror=()=>{tag.remove();reject(new Error('PDF tools could not load. Try again.'));};
      document.head.append(tag);
    });
  }
  function definition(rows,banks,start,end) {
    const lookup = new Map(banks.map(b=>[String(b.id),b.name]));
    const body=[['Date','Transaction','Bank','Amount'].map(text=>({text,bold:true,color:'white',fillColor:purple,margin:[0,4]}))];
    const totals={Income:0,Expense:0,Transfer:0};
    for (const {entry:e,date} of rows) {
      const amount=Number(e.amount);
      if(!Number.isFinite(amount)) throw new Error('A transaction in this range has an invalid amount.');
      if(Object.hasOwn(totals,e.type)) totals[e.type]+=Math.round(amount*100);
      let bank=lookup.get(String(e.bankId))||e.fromBank||e.bank||'Unassigned';
      if(e.type==='Transfer') bank+=' to '+(lookup.get(String(e.toBankId))||e.toBank||'Unassigned');
      body.push([displayDate(date),{stack:[{text:e.category||e.type,bold:true},{text:[e.type,e.payment||e.paymentApp,e.note].filter(Boolean).join(' · '),fontSize:9,color:muted}]},bank,{text:(e.type==='Expense'?'−':e.type==='Income'?'+':'')+fmt(amount),alignment:'right',bold:true,color:e.type==='Income'?'#16704c':e.type==='Expense'?'#9c3353':ink}]);
    }
    return {pageSize:'A4',pageMargins:[36,42,36,44],defaultStyle:{fontSize:10,color:ink},
      footer:(page,pages)=>({text:page+' / '+pages,alignment:'right',color:muted,margin:[0,8,36,0]}),
      content:[{text:'D4 DIG UP',color:purple,bold:true,characterSpacing:2},{text:'Transaction statement',fontSize:26,bold:true,margin:[0,6,0,4]},
        {text:displayDate(new Date(start+'T12:00:00'))+' – '+displayDate(new Date(end+'T12:00:00'))+'   ·   '+rows.length+' transactions',color:muted},
        {columns:Object.entries(totals).map(([label,cents])=>({stack:[{text:label,color:muted},{text:fmt(cents/100),bold:true,fontSize:14}]})),margin:[0,18,0,18]},
        {table:{headerRows:1,widths:[69,'*',88,84],body},layout:{vLineWidth:()=>0,hLineWidth:()=>0.5,hLineColor:()=>'#e0dbe6',paddingTop:()=>7,paddingBottom:()=>7,fillColor:i=>i>0 && i%2===0?'#f7f5fa':null}}]};
  }
  document.addEventListener('input',({target})=>{
    if(target.name==='statement-start') start=target.value;
    if(target.name==='statement-end') end=target.value;
  });
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-statement]');
    if(!button)return;
    const panel=button.closest('section'), status=panel.querySelector('output');
    start=panel.querySelector('[name=statement-start]').value;
    end=panel.querySelector('[name=statement-end]').value;
    if(!start||!end||start>end){status.textContent='Choose a start date on or before the end date.';return;}
    const rows=window.statementRows().filter(({date})=>date && day(date)>=start && day(date)<=end);
    if(!rows.length){status.textContent='No transactions in this date range.';return;}
    const preview=button.dataset.statement==='preview';
    const tab=preview?window.open('','_blank'):null;
    try {
      if(preview && !tab)throw new Error('Allow pop-ups to preview your statement.');
      const doc=definition(rows,data.banks,start,end);
      const filename='D4-Statement-'+start+'-to-'+end+'.pdf';
      status.textContent='Preparing PDF…';
      library??=script('pdfmake.min.js').then(()=>script('vfs_fonts.js')).catch(error=>{library=null;throw error;});
      await library;
      const pdf=window.pdfMake.createPdf(doc);
      if(preview)pdf.open({},tab);else pdf.download(filename);
      status.textContent='';
    }catch(error){tab?.close();status.textContent=error.message;}
  });
})();
