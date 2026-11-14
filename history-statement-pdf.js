'use strict';
/* Offline, device-only PDF statements. No transaction details leave the browser. */
(function(){
  const PAGE_W=595.28, PAGE_H=841.89, SCALE=2;
  const margin=38, right=PAGE_W-margin;
  const navy='#221431', purple='#873ac0', muted='#736b7d', green='#087b54', red='#be354c';
  const money=(n)=>'Rs. '+(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const clean=(value)=>String(value==null?'':value).replace(/\s+/g,' ').trim();
  const short=(ctx,text,max)=>{
    let result=clean(text);
    if(ctx.measureText(result).width<=max)return result;
    while(result.length&&ctx.measureText(result+'…').width>max)result=result.slice(0,-1);
    return result+'…';
  };
  function text(ctx,value,x,y,size=10,color=navy,weight='400',max){
    ctx.fillStyle=color;
    ctx.font=weight+' '+size+'px system-ui,-apple-system,sans-serif';
    ctx.textBaseline='alphabetic';
    ctx.fillText(max?short(ctx,value,max):clean(value),x,y);
  }
  function rule(ctx,y){
    ctx.fillStyle='#e9e2ed';
    ctx.fillRect(margin,y,PAGE_W-margin*2,1);
  }
  function pdfDate(value){
    return value instanceof Date && Number.isFinite(value.getTime())
      ?value.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
      :'No date';
  }
  function newCanvas(){
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(PAGE_W*SCALE);
    canvas.height=Math.ceil(PAGE_H*SCALE);
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('Your browser cannot prepare a PDF canvas.');
    ctx.scale(SCALE,SCALE);
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,PAGE_W,PAGE_H);
    return {canvas,ctx};
  }
  function header(ctx,page,period,bank,stamp){
    ctx.fillStyle=navy;ctx.fillRect(0,0,PAGE_W,85);
    ctx.fillStyle=purple;ctx.fillRect(0,83,PAGE_W,3);
    ctx.beginPath();ctx.arc(margin+19,41,19,0,Math.PI*2);ctx.fillStyle='#ad66d7';ctx.fill();
    text(ctx,'D4',margin+7,46,15,'#fff','800');
    text(ctx,'D4 DIG UP',margin+50,36,19,'#fff','800');
    text(ctx,'TRANSACTION STATEMENT',margin+50,57,9,'#e7c9f8','700');
    text(ctx,pdfDate(stamp),right-120,37,10,'#fff','600',120);
    text(ctx,'Page '+page,right-95,56,9,'#ead9f5','400',95);
    text(ctx,'Period: '+period,margin,105,10,navy,'700',PAGE_W-margin*2);
    text(ctx,'Bank: '+bank,margin,121,9,muted,'400',PAGE_W-margin*2);
  }
  function totals(ctx,summary){
    const y=139, gap=9, w=(PAGE_W-margin*2-gap*2)/3;
    const tiles=[
      ['TOTAL INCOME',money(summary.income),green],
      ['TOTAL EXPENSE',money(summary.expense),red],
      ['NET MOVEMENT',money(summary.income-summary.expense),navy]
    ];
    for(let i=0;i<tiles.length;i++){
      const x=margin+i*(w+gap);
      ctx.fillStyle='#f5f0f8';ctx.fillRect(x,y,w,54);
      ctx.fillStyle=tiles[i][2];ctx.fillRect(x,y,3,54);
      text(ctx,tiles[i][0],x+10,y+18,8,muted,'700',w-17);
      text(ctx,tiles[i][1],x+10,y+39,11,tiles[i][2],'700',w-17);
    }
    text(ctx,summary.count+' transactions  •  '+summary.transfers+' transfers',margin,211,9,muted,'400');
  }
  function tableHeader(ctx,y){
    ctx.fillStyle='#f1e7f5';ctx.fillRect(margin,y,PAGE_W-margin*2,27);
    text(ctx,'DATE',margin+8,y+18,8,navy,'700');
    text(ctx,'TRANSACTION DETAILS',margin+106,y+18,8,navy,'700');
    text(ctx,'DEBIT',right-135,y+18,8,navy,'700');
    text(ctx,'CREDIT',right-70,y+18,8,navy,'700');
  }
  function drawRow(ctx,item,y,number){
    const e=item.entry||{},type=clean(e.type)||'Other';
    const amount=Number(e.amount)||0;
    if(number%2===1){ctx.fillStyle='#faf7fc';ctx.fillRect(margin,y,PAGE_W-margin*2,57);}
    ctx.fillStyle='#e9e2ed';ctx.fillRect(margin,y+57,PAGE_W-margin*2,0.6);
    text(ctx,pdfDate(item.date),margin+8,y+17,9,navy,'600',91);
    const category=clean(e.category)||type;
    const counterparty=clean(e.personName||e.loveName);
    const categoryLine=counterparty?category+' • '+counterparty:category;
    text(ctx,categoryLine,margin+106,y+16,10,navy,'700',174);
    const banks=item.bank||clean(e.fromBank||e.bank)||'Unassigned';
    const pay=clean(e.payment||e.paymentApp);
    text(ctx,[type,banks,pay].filter(Boolean).join(' | '),margin+106,y+31,8,muted,'400',174);
    if(e.note)text(ctx,clean(e.note),margin+106,y+46,8,muted,'400',174);
    if(type==='Expense'||type==='Transfer'){
      text(ctx,money(amount),right-135,y+20,9,red,'700',67);
    }
    if(type==='Income'){
      text(ctx,money(amount),right-70,y+20,9,green,'700',66);
    }
    if(type==='Transfer')text(ctx,'Transfer',right-70,y+37,8,muted,'400',66);
  }
  function footer(ctx,page,total){
    rule(ctx,799);
    text(ctx,'Personal finance record • Generated on this device',margin,817,8,muted,'400',420);
    text(ctx,page+' / '+total,right-29,817,8,muted,'600');
  }
  function imageBytes(dataURL){
    const encoded=dataURL.slice(dataURL.indexOf(',')+1),raw=atob(encoded);
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return bytes;
  }
  function buildPdf(jpegs){
    const total=jpegs.length,encoder=new TextEncoder(),chunks=[],offsets=[],count=2+total*3;
    let length=0;
    const add=(data)=>{const bytes=typeof data==='string'?encoder.encode(data):data;chunks.push(bytes);length+=bytes.length;};
    const obj=(id,body)=>{offsets[id]=length;add(id+' 0 obj\n');add(body);add('\nendobj\n');};
    add('%PDF-1.4\n% D4DIGUP\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    const ids=jpegs.map((_,i)=>5+i*3);
    obj(2,'<< /Type /Pages /Count '+total+' /Kids [ '+ids.map(id=>id+' 0 R').join(' ')+' ] >>');
    jpegs.forEach((jpg,i)=>{
      const img=3+i*3,content=img+1,page=img+2;
      offsets[img]=length;
      add(img+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+Math.ceil(PAGE_W*SCALE)+' /Height '+Math.ceil(PAGE_H*SCALE)+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');
      add(jpg);add('\nendstream\nendobj\n');
      const stream='q\n'+PAGE_W+' 0 0 '+PAGE_H+' 0 0 cm\n/Im0 Do\nQ\n';
      obj(content,'<< /Length '+encoder.encode(stream).length+' >>\nstream\n'+stream+'endstream');
      obj(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PAGE_W+' '+PAGE_H+'] /Resources << /XObject << /Im0 '+img+' 0 R >> >> /Contents '+content+' 0 R >>');
    });
    const xref=length;
    add('xref\n0 '+(count+1)+'\n0000000000 65535 f \n');
    for(let i=1;i<=count;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size '+(count+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
    return new Blob(chunks,{type:'application/pdf'});
  }
  function download(blob,filename){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  window.downloadHistoryStatement=function(options){
    const rows=options&&options.rows;
    if(!Array.isArray(rows)||rows.length===0){alert('No transactions match this filter.');return;}
    const period=clean(options.period)||'All dates';
    const bank=clean(options.bank)||'All banks';
    const summary={count:rows.length,income:0,expense:0,transfers:0};
    for(const {entry:e} of rows){
      const amt=Number(e.amount);
      if(!Number.isFinite(amt)||amt<0)continue;
      if(e.type==='Income')summary.income+=amt;
      else if(e.type==='Expense')summary.expense+=amt;
      else if(e.type==='Transfer')summary.transfers++;
    }
    const firstPageCapacity=9,nextPageCapacity=11,allPages=[];
    let index=0;
    while(index<rows.length){
      const capacity=allPages.length?nextPageCapacity:firstPageCapacity;
      allPages.push(rows.slice(index,index+capacity));
      index+=capacity;
    }
    const jpegs=[];
    const stamp=new Date();
    allPages.forEach((pageRows,pageIndex)=>{
      const {canvas,ctx}=newCanvas();
      header(ctx,pageIndex+1,period,bank,stamp);
      if(pageIndex===0)totals(ctx,summary);
      const y=pageIndex===0?226:139;
      tableHeader(ctx,y);
      pageRows.forEach((item,i)=>drawRow(ctx,item,y+27+i*57,i));
      footer(ctx,pageIndex+1,allPages.length);
      jpegs.push(imageBytes(canvas.toDataURL('image/jpeg',0.88)));
      canvas.width=0;canvas.height=0;
    });
    const filename='D4_DIG_UP_Statement_'+stamp.toISOString().slice(0,10)+'.pdf';
    download(buildPdf(jpegs),filename);
  };
})();
