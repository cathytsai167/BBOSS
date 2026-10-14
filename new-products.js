(()=>{
const $=id=>document.getElementById(id),M3=['丁点','孟祥杰','肖锡龙','杨军','李小东'];
const names=window.NP_NAMES;
const client=supabase.createClient('https://hjuemoaxwotvgvppuits.supabase.co','sb_publishable_kLCQcltuyPsjoM5udpUu4A_8iw1R-oD');
const fmt=n=>n==null?'—':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1});
const pct=n=>n==null?'—':(n*100).toFixed(1)+'%';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monthsTo=end=>{let list=[];for(let m='2026-10';m<=end;){list.push(m);let[y,n]=m.split('-').map(Number);if(++n>12){n=1;y++}m=`${y}-${String(n).padStart(2,'0')}`}return list};
function cycleStart(now=new Date()){const d=new Date(now.getTime()+8*3600000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+2)%7);d.setUTCHours(12,0,0,0);if(+d>+now+8*3600000)d.setUTCDate(d.getUTCDate()-7);return +d-8*3600000}
let state=null,product='snow',region='',rerender=null;
const regionRows=rows=>rows.filter(r=>!region||r.m3===region);
const regionLabel=()=>region||'苏东 TTL';
function applySelection(selection){
 if(!selection||!['snow','classic'].includes(selection.product)||!['',...M3].includes(selection.region))return;
 product=selection.product;region=selection.region;document.body.dataset.product=product;
 if($('product'))$('product').value=product;
 ['m3Filter','filter','m2Filter'].forEach(id=>{if($(id))$(id).value=''});
 rerender?.();
}
window.addEventListener?.('message',e=>{if(e.source===window.parent&&e.data?.type==='np-selection'&&(e.origin===window.location?.origin||e.origin==='null'))applySelection(e.data.selection)});
if(window.parent&&window.parent!==window){document.body.dataset.embedded='true';window.parent.postMessage({type:'np-ready'},window.location.origin==='null'?'*':window.location.origin)}
const sum=xs=>xs.reduce((a,x)=>a+x,0);
const aggregate=(rows,key)=>{const valid=rows.filter(r=>r[key]!=null);return valid.length?sum(valid.map(r=>r[key])):null};
const latest=(test)=>state.weekly.find(test);
const monthly=(name,month,classic=false)=>latest(r=>r.report_kind==='monthly'&&r.report_month?.slice(0,7)===month&&(classic?r.classic_m2===name:r.m2===name));
function distributionRows(which,month){
 if(which==='classic'){
  const groups=new Map();names.forEach(b=>{const ref=state.refs.find(r=>r.m2===b.name);const name=ref?.classic_m2||b.name;if(!groups.has(name))groups.set(name,{name,m3:b.m3,base:ref?.classic_base9??null})});
  return [...groups.values()].map(b=>{
   const last=latest(r=>r.classic_m2===b.name&&r.classic_base9!=null),base=last?.classic_base9??b.base;
   if(month==='2026-09')return {...b,total:base,rep:null,new:base,baseline:base,updated:false,current:false,as_of:'2026-09-30',provisional:base==null,source:'9月底铺货；复购未收集'};
   const reports=monthsTo(month).map(m=>monthly(b.name,m,true)),current=reports.at(-1);
   const complete=base!=null&&reports.every(r=>r?.classic_new!=null);
   const total=base==null?null:base+sum(reports.map(r=>r?.classic_new??0));
   const known=reports.filter(r=>r?.classic_repurchase!=null).at(-1);
   return {...b,baseline:base,total,rep:current?.classic_repurchase??known?.classic_repurchase??null,new:current?.classic_new??null,current:current?.classic_new!=null,updated:month===date().slice(0,7)&&current?.classic_new!=null&&new Date(current.created_at)>=cycleStart(),as_of:known?.report_date??'2026-09-30',provisional:!complete,source:complete?'已提报':'含历史已知数，缺报待补'};
  });
 }
 return names.map(b=>{
  const ref=state.refs.find(r=>r.m2===b.name),base=latest(r=>r.m2===b.name&&r.report_kind==='baseline'&&r.report_month?.slice(0,7)==='2026-09');
  const old=latest(r=>r.m2===b.name&&!r.report_kind);
  const b67=ref?.base67??null,d8=old?.distribution_8??ref?.dist8_initial??null,r67=old?.repurchase_67??ref?.rep67_initial??null,r8=old?.repurchase_8??ref?.rep8_initial??null;
  const oldRep=old?.repurchase_68??(r67!=null&&r8!=null?r67+r8:null),d9=old?.distribution_9??null;
  const bd=base?.baseline_distribution??(b67!=null&&d8!=null&&d9!=null?b67+d8+d9:null),br=base?.cumulative_repurchase??oldRep;
  if(month<'2026-10'){
   const total=month==='2026-07'?b67:month==='2026-08'?(b67!=null&&d8!=null?b67+d8:null):bd;
   return {...b,total,rep:month==='2026-07'?r67:month==='2026-08'?oldRep:br,new:month==='2026-07'?b67:month==='2026-08'?d8:d9,baseline:bd,current:false,updated:false,as_of:base&&month==='2026-09'?'2026-09-30':old?.created_at?.slice(0,10),provisional:month==='2026-09'&&!base,source:month==='2026-09'?(base?'9月底已确认':'9月底待核对'):'历史最近记录'};
  }
  const reports=monthsTo(month).map(m=>monthly(b.name,m)),current=reports.at(-1),known=reports.filter(Boolean).at(-1);
  const total=bd==null?null:bd+sum(reports.map(r=>r?.monthly_distribution??0)),rep=current?.cumulative_repurchase??known?.cumulative_repurchase??br;
  const complete=!!base&&reports.every(r=>r?.monthly_distribution!=null);
  return {...b,baseline:bd,total,rep,new:current?.monthly_distribution??null,current:!!current,updated:month===date().slice(0,7)&&!!current&&new Date(current.created_at)>=cycleStart(),as_of:current?.report_date??known?.report_date??(base?'2026-09-30':old?.created_at?.slice(0,10)),provisional:!complete,source:complete?'已提报':'含历史已知数，缺报待补'};
 });
}
function distributionTotals(rows){
 const dist=aggregate(rows,'total'),rep=aggregate(rows,'rep'),both=rows.filter(r=>r.total!=null&&r.rep!=null);
 const rd=sum(both.map(r=>r.total)),rr=sum(both.map(r=>r.rep));
 return {dist,rep,added:aggregate(rows,'new'),rate:rd>0?rr/rd:null,coverage:both.length,provisional:rows.some(r=>r.provisional)};
}
function chart(series,labels){
 const all=series.flatMap(s=>s.values),min=Math.min(0,...all)*1.2,max=Math.max(1,...all)*1.15,scale=175/(max-min),y=v=>235-(v-min)*scale,baseline=y(0),width=830/Math.max(1,labels.length),bw=Math.min(52,width/(series.length+1));
 return [0,.25,.5,.75,1].map(p=>{const v=min+(max-min)*p;return `<line x1="100" y1="${y(v)}" x2="950" y2="${y(v)}" stroke="#e6eaf0"/><text x="86" y="${y(v)+5}" text-anchor="end" fill="#64748b" font-size="17">${fmt(v)}</text>`}).join('')+labels.map((label,i)=>series.map((s,j)=>{const v=s.values[i]??0,h=Math.abs(v)*scale,x=110+i*width+width/2+(j-series.length/2)*bw;return `<rect x="${x}" y="${v>=0?y(v):baseline}" width="${bw-7}" height="${h}" rx="4" fill="${s.color}"/><text x="${x+(bw-7)/2}" y="${v>=0?y(v)-9:y(v)+20}" text-anchor="middle" fill="${s.color}" font-size="17" font-weight="700">${fmt(v)}</text>`}).join('')+`<text x="${110+i*width+width/2}" y="285" text-anchor="middle" fill="#475569" font-size="19">${esc(label)}</text>`).join('');
}
function regionsChart(rows,key,color){const max=Math.max(1,...rows.flatMap(r=>[r.stw_ytd,r.str_ytd]));return M3.filter(m=>!region||m===region).map(m=>{const r=rows.find(r=>r.m3===m),v=r?.[key]??null;return `<div class="m3bar"><b>${m}</b><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,v||0)/max*100}%;background:${color}"></div></div><strong>${fmt(v)}</strong></div>`}).join('')}
const salesData=which=>which==='snow'?state.sales:state.sales.products?.classic;
function setupSales(){
 const render=()=>{
  document.body.dataset.product=product;
  const data=salesData(product),label=product==='snow'?'雪白听':'经典听';$('pageTitle').textContent=label+'销量追踪';
  if(!data){$('content').hidden=true;$('status').textContent='经典听销量数据尚未配置，请执行新品数据SQL。';return}
  if(product==='classic'&&!data.months.includes('8月')){$('content').hidden=true;$('status').textContent='经典听8月销量尚未补齐，请执行修正SQL后刷新数据。';return}
  $('content').hidden=false;$('status').textContent='';
  $('period').textContent=`STW截至 ${data.period.stw_max} · STR截至 ${data.period.str_max} · ${product==='snow'?'6月29日起提货':data.period.stw_min+'首提货；9月开始铺货统计'}`;
  $('period').textContent=regionLabel()+' · '+$('period').textContent;
  const rows=regionRows(data.dealers.filter(d=>M3.includes(d.m3)&&(d.stw.some(v=>v!==0)||d.str.some(v=>v!==0)))),stw=rows.length?sum(rows.map(d=>d.stw_ytd)):null,str=rows.length?sum(rows.map(d=>d.str_ytd)):null;
  $('stw').textContent=fmt(stw)+' 箱';$('str').textContent=fmt(str)+' 箱';$('stwHl').textContent=stw==null?'暂无区域销量数据':'折合 '+fmt(stw*.06)+' HL';$('strHl').textContent=str==null?'暂无区域销量数据':'折合 '+fmt(str*.06)+' HL';
  const denom=sum(rows.map(d=>d.ih_hl||0)),num=sum(rows.map(d=>d.snow_hl||0));
  $('rateTitle').textContent=product==='snow'?'雪白提货渗透率':'有STR的经销商';$('rate').textContent=product==='snow'?pct(denom?num/denom:null):fmt(rows.length?rows.filter(d=>d.str_ytd>0).length:null)+' 家';
  $('rateNote').textContent=product==='snow'?'雪白听STR(HL) / 大富豪IH主要SKU STR(HL)，均自6月29日起。主要SKU：超爽瓶/听、金麦芽听、金飘铃瓶、通州瓶、雪白瓶/听。':'经典听上市以来累计STR为正的经销商数量。1箱 = 6L = 0.06HL。';
  $('negative').textContent=region?'负数STR按原值计入，可能存在免费酒盘库偏差；全产品负数记录合计 '+fmt(data.audit?.negative_cases_snow_can_used??0)+' 箱。':`负数STR按原值计入：${fmt(data.audit?.negative_rows_snow_can_used??0)}条，合计 ${fmt(data.audit?.negative_cases_snow_can_used??0)}箱，可能存在免费酒盘库偏差。`;
  $('trend').innerHTML=rows.length?chart([{color:'#1f5fae',values:data.months.map((_,i)=>sum(rows.map(d=>d.stw[i]||0)))},{color:'#27815b',values:data.months.map((_,i)=>sum(rows.map(d=>d.str[i]||0)))}],data.months):'<text x="500" y="160" text-anchor="middle">暂无区域销量数据</text>';
  const rs=M3.map(m=>({m3:m,stw_ytd:sum(rows.filter(d=>d.m3===m).map(d=>d.stw_ytd)),str_ytd:sum(rows.filter(d=>d.m3===m).map(d=>d.str_ytd))})).filter(r=>rows.some(d=>d.m3===r.m3));
  $('stwRegions').innerHTML=regionsChart(rs,'stw_ytd','#1f5fae');$('strRegions').innerHTML=regionsChart(rs,'str_ytd','#27815b');
  $('dealerHead').innerHTML=`<tr><th rowspan="2">M3</th><th rowspan="2">M2</th><th rowspan="2">经销商</th><th class="stw-group" colspan="${data.months.length+1}">STW</th><th class="str-group" colspan="${data.months.length+1}">STR</th>${product==='snow'?'<th class="rate-head" rowspan="2">雪白提货渗透率</th>':''}</tr><tr>${['stw','str'].map(k=>data.months.map(m=>`<th class="${k}-month">${m}</th>`).join('')+`<th class="${k}-ytd">YTD</th>`).join('')}</tr>`;
  const sort=$('sortBy');const previous=sort.value;sort.innerHTML='<option value="default">M3 / M2默认顺序</option><option value="stw_ytd">YTD STW</option><option value="str_ytd">YTD STR</option>'+data.months.map((m,i)=>`<option value="stw:${i}">${m} STW</option><option value="str:${i}">${m} STR</option>`).join('')+(product==='snow'?'<option value="penetration">雪白提货渗透率</option>':'');if([...sort.options].some(o=>o.value===previous))sort.value=previous;
  const body=()=>{let xs=rows.filter(r=>!$('m3Filter').value||r.m3===$('m3Filter').value);const key=sort.value,dir=$('sortDir').value==='asc'?1:-1,rank=d=>names.findIndex(n=>n.name===d.m2),order=(a,b)=>M3.indexOf(a.m3)-M3.indexOf(b.m3)||rank(a)-rank(b)||a.dealer.localeCompare(b.dealer,'zh-CN');
   const value=d=>key.includes(':')?d[key.split(':')[0]][Number(key.split(':')[1])]:d[key];xs.sort(key==='default'?order:(a,b)=>value(a)==null?value(b)==null?order(a,b):1:value(b)==null?-1:dir*(value(a)-value(b))||order(a,b));
   $('dealerBody').innerHTML=xs.map(d=>`<tr><td>${esc(d.m3)}</td><td>${esc(d.m2)}</td><td>${esc(d.dealer)}</td>${['stw','str'].map(k=>d[k].map(v=>`<td class="${k}-month">${fmt(v)}</td>`).join('')+`<td class="${k}-ytd">${fmt(d[k+'_ytd'])}</td>`).join('')}${product==='snow'?`<td class="rate-cell">${pct(d.penetration)}<div class="rate-track"><div class="rate-fill" style="width:${Math.max(0,Math.min(100,(d.penetration||0)*100))}%"></div></div></td>`:''}</tr>`).join('')||`<tr><td colspan="${3+2*(data.months.length+1)+(product==='snow'?1:0)}">暂无区域销量数据</td></tr>`;
   const totalDen=sum(xs.map(d=>d.ih_hl||0));if($('dealerFoot'))$('dealerFoot').innerHTML=xs.length?`<tr><td>合计</td><td>${xs.length}家</td><td>当前筛选范围</td>${['stw','str'].map(k=>data.months.map((m,i)=>`<td class="${k}-month">${fmt(sum(xs.map(d=>d[k][i]||0)))}</td>`).join('')+`<td class="${k}-ytd">${fmt(sum(xs.map(d=>d[k+'_ytd'])))}</td>`).join('')}${product==='snow'?`<td class="rate-cell">${pct(totalDen?sum(xs.map(d=>d.snow_hl||0))/totalDen:null)}</td>`:''}</tr>`:'';
   $('rowCount').textContent=`共 ${xs.length} 家经销商`;
  };['sortBy','sortDir','m3Filter'].forEach(id=>$(id).onchange=body);body();
 };rerender=render;$('product').onchange=()=>{product=$('product').value;render()};render();
}
function setupDistribution(){
 const options=()=>{const old=$('month').value,ms=product==='snow'?[['2026-07','6–7月（合并）'],['2026-08','8月'],['2026-09','9月']]:[['2026-09','9月']];ms.push(...monthsTo(date().slice(0,7)).map(m=>[m,Number(m.slice(5))+'月']));$('month').innerHTML=ms.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');$('month').value=ms.some(([v])=>v===old)?old:date().slice(0,7)};
 const render=()=>{
  document.body.dataset.product=product;
  const month=$('month').value;$('pageTitle').textContent=(product==='snow'?'雪白听':'经典听')+'铺货追踪';$('period').textContent=regionLabel()+' · '+Number(month.slice(5))+'月铺货进度';
  let rows=regionRows(distributionRows(product,month)).filter(r=>!$('filter').value||r.m3===$('filter').value);const t=distributionTotals(rows);
  $('total').textContent=fmt(t.dist);$('repTotal').textContent=fmt(t.rep);$('repRate').textContent=pct(t.rate);$('newTotal').textContent=fmt(t.added);$('newLabel').textContent=month==='2026-07'?'6–7月铺货售点':Number(month.slice(5))+'月累计新增铺货';
  $('totalNote').textContent=t.provisional?'含历史已知数；未提报月份新增不按0确认。':'按所选月份累计，售点不跨产品去重。';
  $('repNote').textContent=product==='classic'&&month==='2026-09'?'9月底经典听复购未收集。':`复购率按铺货及复购都有数字的 ${t.coverage}/${rows.length} 个M2计算。`;
  $('coverage').textContent=`${rows.filter(r=>r.current).length}/${rows.length} 个M2本月已提报 · 每周五12:00切换待更新`;
  $('regions').style?.setProperty('--region-count',region?'1':'5');
  $('regions').innerHTML=M3.filter(m=>(!region||m===region)&&(!$('filter').value||m===$('filter').value)).map(m=>{const rs=rows.filter(r=>r.m3===m),s=distributionTotals(rs);return `<article class="card"><h3>${m}</h3><p>累计铺货 <b>${fmt(s.dist)}</b> 家</p><p>累计复购 <b>${fmt(s.rep)}</b> 家</p><p>区域售点复购率 <b>${pct(s.rate)}</b></p><div class="rate-track"><div class="rate-fill" style="background:#27815b;width:${Math.min(100,Math.max(0,(s.rate||0)*100))}%"></div></div><p>本期新增 <b>${fmt(s.added)}</b> 家</p></article>`}).join('');
  rows=rows.filter(r=>!$('m2Filter').value||r.m3===$('m2Filter').value);const key=$('sortBy').value,dir=$('sortDir').value==='asc'?1:-1,val=r=>key==='rate'?(r.total&&r.rep!=null?r.rep/r.total:null):r[key];rows.sort(key==='default'?(a,b)=>M3.indexOf(a.m3)-M3.indexOf(b.m3): (a,b)=>val(a)==null?val(b)==null?0:1:val(b)==null?-1:dir*(val(a)-val(b)));
  const maxDist=Math.max(1,...rows.map(r=>r.total||0)),maxRep=Math.max(1,...rows.map(r=>r.rep||0));
  const bar=(v,max,kind)=>v==null?'—':`<span class="cell-value">${fmt(v)}</span><div class="cell-bar"><div class="cell-fill ${kind}" style="width:${Math.max(0,Math.min(100,v/max*100))}%"></div></div>`;
  const rateBar=r=>r.total&&r.rep!=null?`<span class="cell-value">${pct(r.rep/r.total)}</span><div class="cell-bar rate-bar"><div class="cell-fill rep" style="width:${Math.max(0,Math.min(100,r.rep/r.total*100))}%"></div></div>`:'—';
  $('rows').innerHTML=rows.map(r=>`<tr><td><span class="m3-chip">${esc(r.m3)}</span></td><td>${esc(r.name)}</td><td>${fmt(r.baseline)}</td><td><span class="new-chip">${fmt(r.new)}</span></td><td class="dist-total">${bar(r.total,maxDist,'dist')}</td><td class="rep-total">${bar(r.rep,maxRep,'rep')}</td><td>${rateBar(r)}</td><td><span class="tag ${r.updated?'ok':''}">${month<'2026-10'?r.source:month===date().slice(0,7)?r.updated?'已更新':'待更新':r.current?'已提报':'未提报'}</span>${r.provisional?'<small>缺报待补</small>':''}</td><td>${r.as_of||'—'}</td></tr>`).join('')||'<tr><td colspan="9">暂无区域铺货数据</td></tr>';
  if($('distributionFoot')){const ft=distributionTotals(rows);$('distributionFoot').innerHTML=rows.length?`<tr><td>合计</td><td>${rows.length}个M2</td><td>${fmt(aggregate(rows,'baseline'))}</td><td>${fmt(ft.added)}</td><td class="dist-total">${fmt(ft.dist)}</td><td class="rep-total">${fmt(ft.rep)}</td><td>${pct(ft.rate)}</td><td colspan="2">复购率按有完整配对数字的M2加权计算</td></tr>`:''}
 };
 rerender=()=>{options();render()};$('product').onchange=()=>{product=$('product').value;options();render()};['month','filter','m2Filter','sortBy','sortDir'].forEach(id=>$(id).onchange=render);options();render();
}
function setupOverview(){
 const p=state.sales.portfolio;
 if(!p){$('status').textContent='瓶转听总览数据尚未配置，请执行新品数据SQL。';$('content').hidden=true;return}
 $('content').hidden=false;$('status').textContent='';$('period').textContent='STR截至 '+p.str_max+' · '+p.scope;
 $('month').innerHTML=p.months.map(m=>`<option value="${m.month}">${Number(m.month.slice(5))}月${m.month===p.str_max.slice(0,7)?'MTD':''}</option>`).join('');$('month').value=p.months.at(-1).month;
 const render=()=>{const month=$('month').value,m=p.months.find(r=>r.month===month);$('canRate').textContent=pct(m.total_hl?m.can_hl/m.total_hl:null);$('newRate').textContent=pct(m.total_hl?(m.snow_hl+m.classic_hl)/m.total_hl:null);$('canHl').textContent=fmt(m.can_hl)+' HL';
  $('productRows').innerHTML=['snow','classic'].map(which=>{const d=salesData(which),index=d?.months.findIndex(label=>Number(label.match(/\d+/)?.[0])===Number(month.slice(5))),dist=distributionTotals(distributionRows(which,month));return `<tr><td>${which==='snow'?'雪白听':'经典听'}</td><td>${which==='snow'?'6月29日起提货':'9月开始铺货'}</td><td>${d?fmt(sum(d.dealers.map(r=>r.stw_ytd))):'—'}</td><td>${d?fmt(sum(d.dealers.map(r=>r.str_ytd))):'—'}</td><td>${index>=0?fmt(sum(d.dealers.map(r=>r.str[index]||0))):'—'}</td><td>${fmt(dist.dist)}</td><td>${fmt(dist.rep)}</td><td>${pct(dist.rate)}</td></tr>`}).join('');
  $('trend').innerHTML=chart([{color:'#1f5fae',values:p.months.map(m=>m.snow_hl)},{color:'#b58a2e',values:p.months.map(m=>m.classic_hl)}],p.months.map(m=>Number(m.month.slice(5))+'月'+(m.month===p.str_max.slice(0,7)?'MTD':'')));
 };$('month').onchange=render;render();setupQuadrants();
}
function setupQuadrants(){
 const median=xs=>{const s=xs.slice().sort((a,b)=>a-b),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
 const render=()=>{const which=$('analysisProduct').value,month=date().slice(0,7),d=salesData(which),canonical=s=>{s=['刘洲','李海伟','邵毅/李海伟'].includes(s)?'刘洲&李海伟':s;return which==='classic'?s.replace(/^王震-.*/,'王震').replace(/^是焱彬-.*/,'是焱彬'):s};
  const grouped=new Map();distributionRows(which,month).forEach(r=>{const name=canonical(r.name),x=grouped.get(name)||{name,m3:r.m3,total:0,rep:0,complete:true};x.complete&&=!r.provisional&&r.total>0&&r.rep!=null;x.total+=r.total||0;x.rep+=r.rep||0;grouped.set(name,x)});
  let rows=[...grouped.values()].filter(r=>r.complete).map(r=>{const ds=(d?.dealers||[]).filter(s=>canonical(s.m2)===r.name),den=sum(ds.map(s=>s.ih_hl||0));return {...r,stw:sum(ds.map(s=>s.stw_ytd)),str:sum(ds.map(s=>s.str_ytd)),penetration:den?sum(ds.map(s=>s.snow_hl||0))/den:null}});
  rows=rows.map(r=>({...r,productivity:r.str/r.total}));$('analysisCoverage').textContent=`完整提报 ${rows.length}/${grouped.size} 个M2 · 累计STR / 累计铺货为粗略单店产出，不代表新铺售点真实单店动销。`;
  if(!d||!rows.length){$('quadrant').innerHTML='';$('analysisRows').innerHTML='<tr><td colspan="9">暂无完整提报，请补齐本月数据。</td></tr>';['expansion','leader','foundation','activation'].forEach(id=>$(id).textContent='待完整提报');return}
  const md=median(rows.map(r=>r.total)),mp=median(rows.map(r=>r.productivity));
  rows.forEach(r=>r.type=r.total>=md?(r.productivity>=mp?'leader':'activation'):(r.productivity>=mp?'expansion':'foundation'));
  const table=()=>{const labels={expansion:'优先扩铺',leader:'标杆巩固',foundation:'原因诊断',activation:'优先激活'},scores={activation:4,expansion:3,leader:2,foundation:1};
   let xs=rows.filter(r=>!$('analysisM3').value||r.m3===$('analysisM3').value),key=$('analysisSort').value,dir=$('analysisDir').value==='asc'?1:-1;
   const val=r=>key==='opportunity'?scores[r.type]:key==='repRate'?r.rep/r.total:r[key];xs.sort(key==='default'?(a,b)=>M3.indexOf(a.m3)-M3.indexOf(b.m3)||a.name.localeCompare(b.name,'zh-CN'):(a,b)=>dir*(val(a)-val(b)));
   $('analysisHead').innerHTML='<tr><th>M3</th><th>M2</th><th>累计铺货（家）</th><th>复购率</th><th>累计STW（箱）</th><th>累计STR（箱）</th><th>单店STR（箱）</th>'+(which==='snow'?'<th>雪白提货渗透率</th>':'')+'<th>机会判断</th></tr>';
   $('analysisRows').innerHTML=xs.map(r=>`<tr><td>${esc(r.m3)}</td><td>${esc(r.name)}</td><td>${fmt(r.total)}</td><td>${pct(r.rep/r.total)}</td><td>${fmt(r.stw)}</td><td>${fmt(r.str)}</td><td>${fmt(r.productivity)}</td>${which==='snow'?`<td>${pct(r.penetration)}</td>`:''}<td><span class="tag" style="color:${({activation:'#9d7417',expansion:'#b65353',leader:'#27815b',foundation:'#687586'})[r.type]}">${labels[r.type]}</span></td></tr>`).join('');
  };['analysisM3','analysisSort','analysisDir'].forEach(id=>$(id).onchange=table);table();
  ['expansion','leader','foundation','activation'].forEach(id=>$(id).innerHTML=rows.filter(r=>r.type===id).map(r=>`<span class="chip">${esc(r.name)}</span>`).join('')||'暂无');
  const maxX=Math.max(1,...rows.map(r=>r.total))*1.2,minY=Math.min(0,...rows.map(r=>r.productivity)),maxY=Math.max(1,...rows.map(r=>r.productivity))*1.2,x=v=>90+v/maxX*800,y=v=>330-(v-minY)/(maxY-minY)*280,mx=x(md),my=y(mp),colors={expansion:'#c65353',leader:'#27815b',foundation:'#94a3b8',activation:'#d49c23'};
  $('quadrant').innerHTML=`<rect x="90" y="50" width="${mx-90}" height="${my-50}" fill="#fff0ef"/><rect x="${mx}" y="50" width="${890-mx}" height="${my-50}" fill="#edf8f1"/><rect x="90" y="${my}" width="${mx-90}" height="${330-my}" fill="#f1f3f5"/><rect x="${mx}" y="${my}" width="${890-mx}" height="${330-my}" fill="#fff8df"/><path d="M90 50V330H890" fill="none" stroke="#64748b"/><path d="M${mx} 50V330M90 ${my}H890" stroke="#94a3b8" stroke-dasharray="5 5"/><text x="490" y="385" text-anchor="middle" font-size="20">累计铺货售点（家）</text><text transform="translate(24 190) rotate(-90)" text-anchor="middle" font-size="20">单店STR（箱）</text><text x="${mx+7}" y="43" font-size="16">铺货中位数 ${fmt(md)}</text><text x="93" y="${my-8}" font-size="16">单店STR中位数 ${fmt(mp)}</text>`+rows.map(r=>`<g><circle cx="${x(r.total)}" cy="${y(r.productivity)}" r="8" fill="${colors[r.type]}"><title>${esc(r.name)}：铺货${fmt(r.total)}家，单店STR ${fmt(r.productivity)}箱</title></circle><text x="${x(r.total)+11}" y="${y(r.productivity)+5}" font-size="17">${esc(r.name)}</text></g>`).join('');
 };$('analysisProduct').onchange=render;render();
}
async function load(){
 const session=await client.auth.getSession();if(!session.data.session){document.body.innerHTML='<main class="wrap"><h1>请先登录</h1><p>请从大富豪新品追踪首页登录。</p><a href="index.html" target="_top">返回首页</a></main>';return}
 $('status').textContent='正在读取最新数据…';
 const [s,r]=await Promise.all([client.from('sales_dashboard_data').select('id,payload').eq('id','current'),client.from('xuebai_distribution_reference').select('m2,base67,rep67_initial,dist8_initial,rep8_initial,classic_m2,classic_base9')]);
 if(s.error||r.error)throw s.error||r.error;
 const sales=s.data?.[0]?.payload;if(!sales)throw new Error('暂无销量数据');
 const weekly=[];for(let start=0;;start+=500){const q=await client.from('xuebai_weekly').select('*').order('created_at',{ascending:false}).range(start,start+499);if(q.error)throw q.error;weekly.push(...(q.data||[]));if(!q.data||q.data.length<500)break}
 state={sales,refs:r.data||[],weekly};$('status').textContent='';
 ['m3Filter','filter','m2Filter','analysisM3'].forEach(id=>{if($(id)&&$(id).options.length===1)M3.forEach(m=>$(id).add(new Option(m,m)))});
 if(document.body.dataset.page==='sales')setupSales();else if(document.body.dataset.page==='distribution')setupDistribution();else setupOverview();
 if(window.parent&&window.parent!==window)window.parent.postMessage({type:'np-ready'},window.location.origin==='null'?'*':window.location.origin);
}
$('refresh')?.addEventListener('click',()=>load().catch(e=>$('status').textContent='读取失败：'+e.message));
function exportImage(selector,button,title){const label=document.body.dataset.page==='overview'?'大富豪新品':product==='snow'?'雪白听':'经典听';if(typeof exportDashboardImage==='function')exportDashboardImage(selector,label+'_'+regionLabel()+'_'+title+'_'+date()+'.png',label+' · '+regionLabel()+' · '+title,button)}
$('exportDetail')?.addEventListener('click',e=>exportImage('#detailExportArea',e.currentTarget,document.body.dataset.page==='sales'?'经销商明细':document.body.dataset.page==='overview'?'M2联动明细':'M2铺货明细'));
$('exportPage')?.addEventListener('click',e=>exportImage('.wrap',e.currentTarget,'完整看板'));
function summaryHTML(){
 const d=salesData(product);if(!d||product==='classic'&&!d.months.includes('8月'))throw new Error('请先补齐当前产品销量数据，再导出。');
 const month=date().slice(0,7),sales=regionRows(d.dealers.filter(x=>M3.includes(x.m3))),dist=regionRows(distributionRows(product,month)),t=distributionTotals(dist),label=product==='snow'?'雪白听':'经典听';
 const stw=sales.length?sum(sales.map(x=>x.stw_ytd)):null,str=sales.length?sum(sales.map(x=>x.str_ytd)):null;
 const monthLabel=Number(month.slice(5))+'月',index=d.months.findIndex(m=>Number(m.match(/\d+/)?.[0])===Number(month.slice(5)));
 const monthlySales=(xs,k)=>xs.length&&index>=0&&d.period[k+'_max']?.slice(0,7)>=month?sum(xs.map(x=>x[k][index]||0)):null;
 const monthStw=monthlySales(sales,'stw'),monthStr=monthlySales(sales,'str');
 const ytdMetrics=[['YTD STW',fmt(stw)+' 箱',stw==null?'暂无销量数据':fmt(stw*.06)+' HL'],['YTD STR',fmt(str)+' 箱',str==null?'暂无销量数据':fmt(str*.06)+' HL'],['累计铺货',fmt(t.dist)+' 家',monthLabel+'最新已知累计'],['累计已复购',fmt(t.rep)+' 家','累计复购率 '+pct(t.rate)]];
 const monthMetrics=[[monthLabel+'MTD STW',fmt(monthStw)+' 箱',monthStw==null?'本月暂无底表':fmt(monthStw*.06)+' HL'],[monthLabel+'MTD STR',fmt(monthStr)+' 箱',monthStr==null?'本月暂无底表':fmt(monthStr*.06)+' HL'],[monthLabel+'新增铺货',fmt(t.added)+' 家','本月累计新增']];
 const canonical=n=>{n=['刘洲','李海伟','邵毅/李海伟'].includes(n)?'刘洲&李海伟':n;return product==='classic'?n.replace(/^王震-.*/,'王震').replace(/^是焱彬-.*/,'是焱彬'):n};
 const currentM2=new Set(names.map(x=>canonical(x.name)));
 const summarySales=sales.filter(x=>currentM2.has(canonical(x.m2))||x.stw.some(v=>Number(v||0)!==0)||x.str.some(v=>Number(v||0)!==0));
 const labels=[...new Set([...dist.map(x=>canonical(x.name)),...summarySales.map(x=>canonical(x.m2))])];
 const records=labels.map(name=>{const ss=sales.filter(x=>canonical(x.m2)===name),ds=dist.filter(x=>canonical(x.name)===name);return {name,m3:ds[0]?.m3||ss[0]?.m3||'',ss,ds,dt:distributionTotals(ds)}}).sort((a,b)=>M3.indexOf(a.m3)-M3.indexOf(b.m3)||names.findIndex(n=>canonical(n.name)===a.name)-names.findIndex(n=>canonical(n.name)===b.name));
 const displayName=name=>name==='王震'?'王震（泰州 / 泰兴）':name==='是焱彬'?'是焱彬（靖江 / 姜堰）':name==='刘洲&李海伟'?'刘洲 & 李海伟':name;
 const cells=(ss,dt)=>`<td class="stw-ytd">${fmt(ss.length?sum(ss.map(x=>x.stw_ytd)):null)}</td><td class="stw-current">${fmt(monthlySales(ss,'stw'))}</td><td class="str-ytd">${fmt(ss.length?sum(ss.map(x=>x.str_ytd)):null)}</td><td class="str-current">${fmt(monthlySales(ss,'str'))}</td><td class="dist-total">${fmt(dt.dist)}</td><td>${fmt(dt.added)}</td><td class="rep-total">${fmt(dt.rep)}</td><td>${pct(dt.rate)}</td>`;
 const table=records.map(r=>`<tr><td>${esc(r.m3)}</td><td>${esc(displayName(r.name))}</td>${cells(r.ss,r.dt)}</tr>`).join('')||'<tr><td colspan="10">暂无区域数据</td></tr>';
 const cards=metrics=>metrics.map(([name,value,note])=>`<div><span>${name}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
 return `<h1>${label} · ${esc(regionLabel())} 区域简报</h1><p class="summary-note">STW截至 ${esc(d.period.stw_max)} ｜ STR截至 ${esc(d.period.str_max)} ｜ ${monthLabel}铺货最新已知数</p><h2>YTD累计表现</h2><div class="summary-grid ytd-grid">${cards(ytdMetrics)}</div><h2>${monthLabel}表现</h2><div class="summary-grid">${cards(monthMetrics)}</div><h2>全部M2明细 · YTD + ${monthLabel}</h2><div class="summary-table"><table><thead><tr><th rowspan="2">M3</th><th rowspan="2">M2</th><th colspan="2" class="summary-stw-head">STW（箱）</th><th colspan="2" class="summary-str-head">STR（箱）</th><th colspan="4">铺货 / 复购</th></tr><tr><th class="stw-ytd">YTD</th><th class="stw-current">${monthLabel}MTD</th><th class="str-ytd">YTD</th><th class="str-current">${monthLabel}MTD</th><th>累计铺货</th><th>${monthLabel}新增</th><th>累计复购</th><th>复购率</th></tr></thead><tbody>${table}</tbody><tfoot><tr><td>合计</td><td>当前筛选范围</td>${cells(sales,t)}</tr></tfoot></table></div><p class="summary-note">YTD为本年上市以来累计；复购为累计数，非当月新增复购。${t.provisional?'铺货含历史已知数，缺报未按0确认。':''}复购率按有铺货和复购配对数字的 ${t.coverage}/${dist.length} 个M2加权计算。联合销量口径保留合并行，不拆分或重复计算。负数STR可能存在免费酒盘库偏差。— 表示暂无数据。</p>`;
}
async function exportSummary(button){
 if(!state){alert('数据仍在加载，请稍后再导出。');return}
 let host;try{const html=summaryHTML();host=document.createElement('section');host.className='summary-export';host.innerHTML=html;host.style.position='absolute';host.style.left='-20000px';host.style.top='0';document.body.appendChild(host);await exportDashboardImage(host,(product==='snow'?'雪白听':'经典听')+'_'+regionLabel()+'_区域一页纸_'+date()+'.png','',button)}catch(e){alert(e.message)}finally{host?.remove()}
}
$('exportSummary')?.addEventListener('click',e=>exportSummary(e.currentTarget));
window.addEventListener?.('message',async e=>{if(e.source===window.parent&&e.data?.type==='np-export-summary'&&(e.origin===window.location?.origin||e.origin==='null')){applySelection(e.data.selection);try{await exportSummary($('exportSummary'))}finally{window.parent.postMessage({type:'np-export-done'},window.location.origin==='null'?'*':window.location.origin)}}});
if(window.NP_SKIP_LOAD)window.NP_TEST={distributionRows,distributionTotals,cycleStart,chart,setupSales,setupDistribution,setupOverview,applySelection,summaryHTML,setState:s=>state=s};
if(!window.NP_SKIP_LOAD)load().catch(e=>$('status').textContent='读取失败：'+e.message);
})();
