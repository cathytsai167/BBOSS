/* Browser-local Excel import. No network calls and no hidden workbook instructions. */
(function(root){
'use strict';
const SNOW='雪白8度500ML2X6纸箱听装',CLASSIC='大富豪经典7度500ML2X6纸箱听装';
const M3=['丁点','孟祥杰','肖锡龙','杨军'];
const headers={stw:['发票日期','物料名称','付款方名称-NOW','交货数量','单位'],str:['Date','SKUName','PayerName','SoldToCode','动销箱数','动销']};
const cache=new WeakMap();
function date(v,X){
 let y,m,d;
 if(typeof v==='number'){const a=X.SSF.parse_date_code(v);if(a){y=a.y;m=a.m;d=a.d;}}
 else if(v instanceof Date){y=v.getFullYear();m=v.getMonth()+1;d=v.getDate();}
 else {const a=String(v||'').trim().match(/^(\d{4})[-\/]([0-9]{1,2})[-\/]([0-9]{1,2})(?:[ T].*)?$/);if(a){y=+a[1];m=+a[2];d=+a[3];}}
 if(!y||m<1||m>12||d<1||d>new Date(y,m,0).getDate())throw Error('发现无法识别的日期：'+String(v));
 return [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
function number(v,label){if(v==null||String(v).trim()==='')throw Error(label+'为空，不能按0处理');const n=typeof v==='number'?v:Number(String(v).replace(/,/g,''));if(!Number.isFinite(n)||Math.abs(n)>1e8)throw Error(label+'不是有效数字');return n;}
function sheetRows(buffer,kind,X){
 if(cache.get(buffer)?.[kind])return cache.get(buffer)[kind];
 const wb=X.read(buffer,{type:'array',cellDates:false});
 const matches=[];
 for(const name of wb.SheetNames){const sh=wb.Sheets[name], top=X.utils.sheet_to_json(sh,{header:1,range:0,raw:true,defval:null}).slice(0,12);for(let i=0;i<top.length;i++){const h=top[i].map(v=>String(v??'').trim());if(headers[kind].every(k=>h.includes(k))){if(headers[kind].some(k=>h.filter(v=>v===k).length!==1))throw Error(name+'必需字段重复');matches.push({sh,name,row:i});break;}}}
 if(matches.length!==1)throw Error((matches.length?'存在多个可用明细表，请只保留一张底表':'未找到'+kind.toUpperCase()+'必需字段：'+headers[kind].join('、')));
 const a=matches[0],rows=X.utils.sheet_to_json(a.sh,{range:a.row,raw:true,defval:null});
 if(rows.length>400000)throw Error('底表行数过多，请分期提供。');
 const result={sheet:a.name,rows};cache.set(buffer,{...(cache.get(buffer)||{}),[kind]:result});return result;
}
function inferRanges(files,ranges,X){
 const out=JSON.parse(JSON.stringify(ranges));
 for(const kind of ['stw','str']){if(!files[kind]?.length)continue;let last='';for(const f of files[kind]){const {rows}=sheetRows(f.buffer,kind,X);for(const r of rows){const sku=r[kind==='stw'?'物料名称':'SKUName'],v=r[kind==='stw'?'发票日期':'Date'];if(!sku&&(v==null||v===''))continue;const d=date(v,X);if(d>last)last=d;}}if(!last)throw Error(kind.toUpperCase()+'底表没有日期');out[kind].to=last;}
 return out;
}
function prepare(files,config,ranges,X){
 const aggregates={stw:new Map(),str:new Map()},limits={},warnings=[],unknown=new Set(),seen={stw:new Set(),str:new Set()};
 const transfers={snow:0,classic:0},sourceInfo=[];let duplicates=0;
 function owner(n){const name=config.aliases[String(n??'').trim()]||String(n??'').trim();return {name,meta:config.mapping[name]};}
 for(const kind of ['stw','str']){
  if(!files[kind]?.length)continue;let first='9999-99-99',last='',valid=0;
  for(const f of files[kind]){
   if(!/\.xlsx$/i.test(f.name))throw Error('第一版仅支持.xlsx底表');if(f.buffer.byteLength>40*1024*1024)throw Error('单个文件不能超过40MB');
   const {rows,sheet}=sheetRows(f.buffer,kind,X);let used=0;
   for(const r of rows){
    const sku=String(r[kind==='stw'?'物料名称':'SKUName']??'').trim(),dv=r[kind==='stw'?'发票日期':'Date'];
    if(!sku&&(dv==null||dv===''))continue;
    if(!sku)throw Error(f.name+'存在有日期但没有SKU的记录');
    const dt=date(dv,X);first=dt<first?dt:first;last=dt>last?dt:last;valid++;
    if(dt<ranges[kind].from||dt>ranges[kind].to)continue;
    const product=sku.includes(SNOW)?'snow':sku===CLASSIC?'classic':null;
    const denom=kind==='str'&&/大富豪超爽|大富豪金麦芽|大富豪金飘铃|大富豪通州|大富豪.*雪白/.test(sku);
    if(!product&&!denom)continue;
    const {name,meta}=owner(r[kind==='stw'?'付款方名称-NOW':'PayerName']);
    if(!meta){unknown.add(name||'（空经销商）');continue;}if(!M3.includes(meta.m3))continue;
    const signature=JSON.stringify(Object.keys(r).sort().map(k=>[k,r[k]]));
    if(seen[kind].has(signature)){duplicates++;continue;}seen[kind].add(signature);
    const cases=number(r[kind==='stw'?'交货数量':'动销箱数'],'箱数'),hl=kind==='str'?number(r['动销'],'HL'):0;
    if(kind==='stw'&&String(r['单位']).trim()!=='CRT')throw Error(name+'的STW单位不是CRT（箱）');
    if(product&&kind==='str'&&Math.abs(hl-cases*.06)>.001)throw Error(name+'的新品箱数与HL不一致，请检查单位或SKU');
    if(kind==='stw'&&r['百升']!=null&&Math.abs(number(r['百升'],'百升')-cases*.06)>.001)throw Error(name+'的STW箱数与百升不一致');
    const transfer=(config.transfer_rules||[]).find(t=>kind==='str'&&t.product===product&&t.date===dt&&Number(r.SoldToCode)===t.soldTo&&t.dealer===name);
    if(transfer){
     if(cases!==0&&cases!==transfer.cases)throw Error('已确认转户记录的数量变化，请人工核对');transfers[product]+=cases;continue;
    }
    const month=Number(dt.slice(5,7));used++;
    if(kind==='stw'){
     const k=JSON.stringify([name,month,product]),a=aggregates.stw.get(k)||{dealer:name,month,product,cases:0};a.cases+=cases;aggregates.stw.set(k,a);
    }else{
     const k=JSON.stringify([name,month]),a=aggregates.str.get(k)||{dealer:name,month,snow:0,classic:0,ih:0,snow_neg:0,classic_neg:0,snow_neg_rows:0,classic_neg_rows:0};
     if(product){a[product]+=cases;if(cases<0){a[product+'_neg']+=cases;a[product+'_neg_rows']++;}}if(denom)a.ih+=hl;aggregates.str.set(k,a);
    }
   }
   sourceInfo.push({kind,name:f.name,sheet,rows:rows.length,used});
  }
  if(!valid)throw Error(kind.toUpperCase()+'底表没有有效日期记录');
  if(last!==ranges[kind].to)throw Error(kind.toUpperCase()+'截止日必须与底表实际最新日期一致（'+last+'）');
  if(first.slice(0,7)>ranges[kind].from.slice(0,7))throw Error(kind.toUpperCase()+'底表缺少所选起始月份');
  limits[kind]={first,last};
 }
 if(unknown.size)throw Error('未识别经销商，未更新：'+[...unknown].join('、')+'。请先核对mapping。');
 if(duplicates)throw Error('发现'+duplicates+'条完全重复记录或文件重叠，未更新；请核对后重新上传。');
 for(const k of ['snow','classic'])if(transfers[k]!==0&&transfers[k]!==config.transfer_rules.find(t=>t.product===k)?.cases)throw Error('转户记录重复，未更新');
 const batch={files:sourceInfo,transfer:transfers,coverage_confirmed:true};
 for(const kind of ['stw','str'])if(files[kind]?.length)batch[kind]={...ranges[kind],rows:[...aggregates[kind].values()]};
 if(!batch.stw&&!batch.str)throw Error('请至少上传STW或STR底表');
 if(batch.stw)for(const p of ['snow','classic'])if(![...aggregates.stw.values()].some(r=>r.product===p&&r.cases!==0))warnings.push((p==='snow'?'雪白听':'经典听')+'：所选STW期间没有非零进货记录，确认后将覆盖为0。');
 for(const kind of ['stw','str'])if(!batch[kind])warnings.push(kind.toUpperCase()+'本次未上传，保留原有数据及截止日期。');
 return {batch,warnings,limits};
}
const api={prepare,date,sheetRows,inferRanges};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SalesImportCore=api;
})(typeof window!=='undefined'?window:typeof self!=='undefined'?self:{});
