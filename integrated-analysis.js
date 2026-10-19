(function(root){
'use strict';
const TYPES={expansion:{label:'优先扩铺',color:'#bd5057',bg:'#fff0ef',action:'拓展有效售点；同步保持已铺售点补货。'},leader:{label:'标杆巩固',color:'#27815b',bg:'#edf8f1',action:'保持供货与复购，复制有效陈列和铺货打法。'},foundation:{label:'原因诊断',color:'#758193',bg:'#f1f3f5',action:'核查提报、库存、渠道适配与执行原因，再制定动作。'},activation:{label:'优先激活',color:'#a07812',bg:'#fff8df',action:'推动已铺售点陈列、促销和复购，避免只扩不活。'},pending:{label:'待补数据 / 核对',color:'#758193',bg:'#f1f3f5',action:'补齐或核对铺货及复购数据后，再判断机会。'}};
const canonical=n=>['刘洲','李海伟','邵毅/李海伟','刘洲&李海伟'].includes(n)?'刘洲&李海伟':n;
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b),n=a.length;return n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null};
function classify(rows){
 const valid=rows.filter(r=>r.complete),md=median(valid.map(r=>r.total)),mr=median(valid.map(r=>r.rate));
 return {md,mr,eligible:valid.length,rows:rows.map(r=>({...r,type:!r.complete?'pending':r.total>=md?(r.rate>=mr?'leader':'activation'):(r.rate>=mr?'expansion':'foundation')}))};
}
function buildRows(api,which,month){
 const {distributionRows,monthly,salesData,sum}=api,d=salesData(which),groups=new Map();
 for(const r of distributionRows(which,month)){
  const name=canonical(r.name),key=r.m3+'|'+name;
  const fresh=month<'2026-10'?r.rep!=null:(which==='classic'?monthly(r.name,month,true)?.classic_repurchase:monthly(r.name,month)?.cumulative_repurchase)!=null;
  const g=groups.get(key)||{key,name,m3:r.m3,parts:[]};g.parts.push({...r,fresh});groups.set(key,g);
 }
 const index=d?.months.findIndex(m=>Number(m.match(/\d+/)?.[0])===Number(month.slice(5))),hasMonth=index>=0&&d.period.str_max?.slice(0,7)>=month;
 return [...groups.values()].map(g=>{
  const paired=g.parts.every(r=>r.total!=null&&r.rep!=null&&r.fresh&&!r.provisional),known=k=>g.parts.every(r=>r[k]!=null)?sum(g.parts.map(r=>r[k])):null;
  const total=known('total'),rep=known('rep'),added=known('new'),rate=paired&&total>0?rep/total:null;
  const bad=g.parts.some(r=>r.total<0||r.rep<0||r.rep>r.total),complete=paired&&total>0&&!bad;
  const ds=(d?.dealers||[]).filter(r=>r.m3===g.m3&&canonical(r.m2)===g.name),str=hasMonth?sum(ds.map(r=>Number(r.str?.[index]||0))):null;
  const ytdIndices=(d?.months||[]).map((label,i)=>({i,month:'2026-'+String(Number(label.match(/\d+/)?.[0])).padStart(2,'0')})).filter(r=>r.month<=month);
  const ytdStr=ds.length&&ytdIndices.length?sum(ds.map(r=>sum(ytdIndices.map(({i})=>Number(r.str?.[i]||0))))):null;
  const ytdTo=d?.period.str_max?.slice(0,7)<=month?d.period.str_max:month+'月末';
  const reasons=[];if(g.parts.some(r=>r.total==null||r.provisional))reasons.push('铺货未完整提报');if(g.parts.some(r=>!r.fresh||r.rep==null))reasons.push('本期复购待补，已知累计数仅供参考');if(total===0)reasons.push('累计铺货为0，暂不判断复购率');if(bad)reasons.push('复购超过铺货或出现负售点数，请核对');
  return {...g,total,rep,new:added,rate:bad?null:rate,str,ytdStr,ytdTo,complete,reason:reasons.join('；'),salesMapped:ds.length>0};
 });
}
function svgChart(rows,md,mr,fmt,pct,esc){
 const valid=rows.filter(r=>r.complete),colors=TYPES;if(!valid.length)return '<text x="560" y="250" text-anchor="middle" fill="#758193" font-size="20">暂无完整提报，补齐铺货及复购后显示四象限</text>';
 const left=105,right=1000,top=70,bottom=405,maxX=Math.max(1,md||0,...valid.map(r=>r.total))*1.16,maxY=Math.min(1,Math.max(.1,mr||0,...valid.map(r=>r.rate))*1.2);
 const x=v=>left+v/maxX*(right-left),y=v=>bottom-v/maxY*(bottom-top),mx=x(md),my=y(mr),maxStr=Math.max(1,...valid.map(r=>Math.max(0,r.ytdStr||0)));
 const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
 let html=rect(left,top,mx-left,my-top,colors.expansion.bg)+rect(mx,top,right-mx,my-top,colors.leader.bg)+rect(left,my,mx-left,bottom-my,colors.foundation.bg)+rect(mx,my,right-mx,bottom-my,colors.activation.bg);
 for(let i=0;i<=4;i++){const vx=maxX*i/4,vy=maxY*i/4;html+=`<line x1="${x(vx)}" y1="${top}" x2="${x(vx)}" y2="${bottom}" stroke="#ffffff" stroke-opacity=".85"/><line x1="${left}" y1="${y(vy)}" x2="${right}" y2="${y(vy)}" stroke="#ffffff" stroke-opacity=".85"/><text x="${x(vx)}" y="433" text-anchor="middle" fill="#7a8495" font-size="13">${fmt(vx)}</text><text x="92" y="${y(vy)+4}" text-anchor="end" fill="#7a8495" font-size="13">${pct(vy)}</text>`;}
 html+=`<path d="M${left} ${top}V${bottom}H${right}" fill="none" stroke="#c2c9d3"/><path d="M${mx} ${top}V${bottom}M${left} ${my}H${right}" stroke="#a3acba" stroke-width="1" stroke-dasharray="4 6"/><text x="${left}" y="31" font-size="13" fill="#7a8495">铺货中位数 ${fmt(md)} 家 · 复购率中位数 ${pct(mr)}</text><text x="550" y="480" text-anchor="middle" font-size="16" fill="#637084">累计铺货售点（家）</text><text transform="translate(33 240) rotate(-90)" text-anchor="middle" font-size="16" fill="#637084">售点复购率</text><text x="${right}" y="31" text-anchor="end" font-size="13" fill="#7a8495">气泡大小 = YTD STR（箱）</text>`;
 [['expansion',left+15,top+23],['leader',right-95,top+23],['foundation',left+15,bottom-14],['activation',right-95,bottom-14]].forEach(([t,x,y])=>{html+=`<text x="${x}" y="${y}" fill="${colors[t].color}" font-size="15" font-weight="600" opacity=".8">${colors[t].label}</text>`});
 const points=valid.map(r=>({r,cx:x(r.total),cy:y(r.rate),radius:r.ytdStr>0?Math.max(5,28*Math.sqrt(r.ytdStr/maxStr)):6})),boxes=[],labels=[];
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 points.slice().sort((a,b)=>b.radius-a.radius).forEach(({r,cx,cy,radius})=>{
  const color=colors[r.type].color,fill=r.ytdStr!=null&&r.ytdStr>=0?color:'white';
  html+=`<circle class="analysis-dot" data-point="${esc(r.key)}" data-ytd-str="${r.ytdStr==null?'':r.ytdStr}" tabindex="0" role="button" aria-label="查看${esc(r.name)}：铺货${fmt(r.total)}家，复购率${pct(r.rate)}，YTD STR ${fmt(r.ytdStr)}箱" cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" fill-opacity=".42" stroke="${color}" stroke-opacity=".85" stroke-width="1.5" ${r.ytdStr==null?'stroke-dasharray="3 3"':''}><title>${esc(r.m3)} · ${esc(r.name)}\n累计铺货 ${fmt(r.total)}家 / 复购 ${fmt(r.rep)}家 / 复购率 ${pct(r.rate)}\nYTD STR ${fmt(r.ytdStr)}箱（截至${esc(r.ytdTo)}）\n${colors[r.type].label}</title></circle>`;
  const w=[...r.name].reduce((s,c)=>s+(c.charCodeAt(0)>255?12:6.5),0)+8,h=18;
  const candidates=[[cx+radius+7,cy-9],[cx-radius-w-7,cy-9],[cx-w/2,cy-radius-24],[cx-w/2,cy+radius+7],[cx+radius+7,cy-30],[cx-radius-w-7,cy+13],[cx+radius+9,cy+20],[cx-radius-w-9,cy-35]];
  const ranked=candidates.map(([px,py],i)=>{const b={x:Math.max(left+4,Math.min(right-w-4,px)),y:Math.max(top+30,Math.min(bottom-h-30,py)),w,h};const hits=boxes.reduce((s,a)=>s+overlap(b,a),0)+points.reduce((s,p)=>s+overlap(b,{x:p.cx-p.radius,y:p.cy-p.radius,w:2*p.radius,h:2*p.radius})*.6,0);return {...b,score:hits*100+i}}).sort((a,b)=>a.score-b.score);
  const b=ranked[0];boxes.push(b);
  labels.push(`<path d="M${cx} ${cy}L${Math.max(b.x,Math.min(b.x+b.w,cx))} ${Math.max(b.y,Math.min(b.y+b.h,cy))}" stroke="${color}" stroke-opacity=".26" fill="none"/><text x="${b.x+4}" y="${b.y+13}" font-size="12" fill="#536075" stroke="#fff" stroke-width="3" stroke-opacity=".9" paint-order="stroke" pointer-events="none">${esc(r.name)}</text>`);
 });return html+labels.join('');
}
function setup(api){
 const {$,M3,names,fmt,pct,esc,date,sum,aggregate,salesData,regionRows,regionLabel,getProduct,setProduct,setRender}=api;
 let focused='',current=[],comparison;
 const options=()=>{const selected=$('analysisMonth').value,which=getProduct(),start=which==='snow'?'2026-07':'2026-09',end=date().slice(0,7),months=[];for(let n=Number(start.slice(5));n<=Number(end.slice(5));n++){const m='2026-'+String(n).padStart(2,'0');months.push(m)}$('analysisMonth').innerHTML=months.map(m=>`<option value="${m}">${m==='2026-07'?'6–7月（合并）':Number(m.slice(5))+'月'}</option>`).join('');$('analysisMonth').value=months.includes(selected)?selected:months.at(-1)};
 const table=()=>{
  const kind=$('opportunityFilter').value,key=$('analysisSort').value,dir=$('analysisDir').value==='asc'?1:-1,rank={expansion:4,activation:3,foundation:2,leader:1,pending:0};
  let rows=current.filter(r=>(!kind||r.type===kind)&&(!focused||r.key===focused));
  const value=r=>key==='opportunity'?rank[r.type]:r[key],order=(a,b)=>M3.indexOf(a.m3)-M3.indexOf(b.m3)||names.findIndex(n=>canonical(n.name)===a.name)-names.findIndex(n=>canonical(n.name)===b.name);
  rows.sort(key==='default'?order:(a,b)=>value(a)==null?(value(b)==null?order(a,b):1):value(b)==null?-1:dir*(value(a)-value(b))||order(a,b));
  const maxNew=Math.max(1,...rows.map(r=>r.new||0)),maxStr=Math.max(1,...rows.map(r=>Math.abs(r.str||0)));
  const bar=(v,max,color)=>v==null?'—':`<span class="cell-value">${fmt(v)}</span><div class="cell-bar"><div class="cell-fill" style="width:${Math.min(100,Math.abs(v)/max*100)}%;background:${v<0?'#b65353':color}"></div></div>`;
  $('analysisRows').innerHTML=rows.map(r=>`<tr class="${focused?'analysis-selected':''}"><td>${esc(r.m3)}</td><td>${esc(r.name)}</td><td>${bar(r.new,maxNew,'var(--accent)')}</td><td>${fmt(r.total)}</td><td>${fmt(r.rep)}</td><td>${r.rate==null?'—':pct(r.rate)+`<div class="cell-bar"><div class="cell-fill rep" style="width:${Math.min(100,r.rate*100)}%"></div></div>`}</td><td>${bar(r.str,maxStr,'#27815b')}</td><td><span class="tag" style="color:${TYPES[r.type].color};background:${TYPES[r.type].bg}">${TYPES[r.type].label}</span></td><td>${esc(r.reason||TYPES[r.type].action)}${r.str<0?'；负STR可能存在免费酒盘库偏差。':''}</td></tr>`).join('')||'<tr><td colspan="9">当前筛选下暂无M2</td></tr>';
  $('analysisCount').textContent=`显示 ${rows.length}/${current.length} 个M2`;$('clearPoint').hidden=!focused;
 };
 const focus=key=>{focused=key;$('opportunityFilter').value='';table();$('detailExportArea').scrollIntoView?.({behavior:'smooth',block:'start'})};
 const render=()=>{
  options();const which=getProduct(),label=which==='snow'?'雪白听':'经典听',month=$('analysisMonth').value,d=salesData(which);focused='';document.body.dataset.product=which;$('product').value=which;
  $('pageTitle').textContent=label+'综合分析';$('period').textContent=regionLabel()+' · '+Number(month.slice(5))+'月铺货最新已知数 · STR截至 '+(d?.period.str_max||'暂无数据');
  const all=buildRows(api,which,month);comparison=classify(all);current=regionRows(comparison.rows);
  const eligible=current.filter(r=>r.complete),dist=aggregate(current,'total'),rep=aggregate(current,'rep'),paired=sum(eligible.map(r=>r.total)),rate=paired?sum(eligible.map(r=>r.rep))/paired:null;
  $('analysisDist').textContent=fmt(dist);$('analysisRep').textContent=fmt(rep);$('analysisRate').textContent=pct(rate);
  const sales=regionRows(d?.dealers.filter(r=>M3.includes(r.m3))||[]),index=d?.months.findIndex(m=>Number(m.match(/\d+/)?.[0])===Number(month.slice(5))),available=index>=0&&d.period.str_max?.slice(0,7)>=month;
  const str=available&&sales.length?sum(sales.map(r=>Number(r.str?.[index]||0))):null;
  $('analysisStrTitle').textContent=Number(month.slice(5))+'月 STR'+(d?.period.str_max?.slice(0,7)===month?'（MTD）':'');$('analysisStr').textContent=fmt(str);$('analysisStrNote').textContent=str==null?'暂无所选月份区域销量数据':'单位：箱 · '+fmt(str*.06)+' HL';
  $('analysisCoverage').textContent=`当前范围完整提报 ${eligible.length}/${current.length} 个M2；其余待补或核对，不按0分类。分界线固定采用苏东同产品当月完整提报 ${comparison.eligible} 个M2的中位数，切换区域不改变标准。累计铺货及复购卡片为最新已知数；复购率仅按完整提报配对口径加权计算。`;
  $('quadrant').innerHTML=svgChart(current,comparison.md,comparison.mr,fmt,pct,esc);
  $('quadrant').querySelectorAll('[data-point]').forEach(el=>{el.addEventListener('click',()=>focus(el.dataset.point));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focus(el.dataset.point)}})});
  for(const type of ['expansion','leader','foundation','activation']){const xs=current.filter(r=>r.type===type);$(type+'Count').textContent=xs.length+' 个M2';$(type).innerHTML=xs.map(r=>`<button type="button" class="chip analysis-chip" data-point="${esc(r.key)}">${esc(r.name)}</button>`).join('')||'暂无';$(type).querySelectorAll('[data-point]').forEach(el=>el.addEventListener('click',()=>focus(el.dataset.point)))}
  table();
 };
 ['opportunityFilter','analysisSort','analysisDir'].forEach(id=>$(id).onchange=()=>{focused='';table()});$('clearPoint').onclick=()=>{focused='';table()};$('analysisMonth').onchange=render;$('product').onchange=()=>{setProduct($('product').value);render()};setRender(render);render();
}
const api={setup,buildRows,classify,median,svgChart};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NP_ANALYSIS=api;
})(typeof window!=='undefined'?window:globalThis);
