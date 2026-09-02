async function loadMonthlyDistribution() {
  const filter=document.getElementById('filter'),sort=document.getElementById('sort'),sortDir=document.getElementById('sortDir'),tbody=document.getElementById('tbody');
  const currentMonthTitle=document.getElementById('currentMonthTitle'),monthTableHead=document.getElementById('monthTableHead'),totalDist=document.getElementById('totalDist'),totalFormula=document.getElementById('totalFormula'),cumRep=document.getElementById('cumRep'),cumRepNote=document.getElementById('cumRepNote'),totalDistDelta=document.getElementById('totalDistDelta'),cumRepDelta=document.getElementById('cumRepDelta'),k67=document.getElementById('k67'),k8=document.getElementById('k8'),submitCount=document.getElementById('submitCount'),refreshTime=document.getElementById('refreshTime'),statusByM3=document.getElementById('statusByM3'),m3grid=document.getElementById('m3grid');
  const m3Names=[...new Set(cfg.m2Rows.map(x=>x.m3))];
  const {data, error} = await client.from('xuebai_weekly').select('*').order('created_at', {ascending:false});
  if (error) { document.getElementById('refreshTime').textContent = `读取失败：${error.message}`; return; }
  const records = data || [], now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const recordMonth = row => row.report_month || `${new Date(recordTime(row)).getFullYear()}-${String(new Date(recordTime(row)).getMonth()+1).padStart(2,'0')}`;
  const monthLabel = key => `${Number(key.slice(5))}月`;
  const monthsBetween = (start, end) => { const out=[], d=new Date(`${start}-01T00:00:00`), stop=new Date(`${end}-01T00:00:00`); while(d<=stop){out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);d.setMonth(d.getMonth()+1)} return out; };
  const recordMonths = records.map(recordMonth).filter(key=>key>='2026-08');
  const lastMonth = [currentMonth, ...recordMonths].sort().at(-1);
  const months = monthsBetween('2026-08', lastMonth);
  const monthSelect = document.getElementById('monthSelect');
  monthSelect.innerHTML = months.map(key=>`<option value="${key}">${monthLabel(key)}</option>`).join('');
  monthSelect.value = currentMonth >= '2026-08' ? currentMonth : months.at(-1);

  const latestByMonth = cutoff => {
    const map={};
    records.filter(row=>!cutoff||new Date(recordTime(row))<=cutoff).sort((a,b)=>new Date(recordTime(b))-new Date(recordTime(a))).forEach(row=>{
      const key=`${recordMonth(row)}|${row.m2}`; if(!map[key]) map[key]=row;
    });
    return map;
  };
  const currentMap=latestByMonth(null), previousMap=latestByMonth(new Date(weekStartTime().getTime()-1));

  const makeRows=(selected,map) => cfg.m2Rows.map(base=>{
    const selectedRecord=map[`${selected}|${base.name}`];
    const monthRows=months.filter(month=>month<=selected).map(month=>map[`${month}|${base.name}`]).filter(Boolean);
    const august=map[`2026-08|${base.name}`];
    const monthDist=selectedRecord?Number(selectedRecord.distribution_8||0):(selected==='2026-08'?Number(base.dist8Initial||0):0);
    const monthRep=selectedRecord?Number(selectedRecord.repurchase_8||0):(selected==='2026-08'?Number(base.rep8Initial||0):0);
    const additions=months.filter(month=>month<=selected).reduce((sum,month)=>{const row=map[`${month}|${base.name}`];return sum+(row?Number(row.distribution_8||0):(month==='2026-08'?Number(base.dist8Initial||0):0))},0);
    const additionRep=months.filter(month=>month<=selected).reduce((sum,month)=>{const row=map[`${month}|${base.name}`];return sum+(row?Number(row.repurchase_8||0):(month==='2026-08'?Number(base.rep8Initial||0):0))},0);
    const latestRep67=monthRows.sort((a,b)=>new Date(recordTime(b))-new Date(recordTime(a)))[0];
    const rep67=latestRep67?Number(latestRep67.repurchase_67||0):Number(base.rep67Initial||0);
    const target=selected==='2026-08'?Number(base.target8||0):0;
    const latestAny=Object.entries(map).filter(([key])=>key.endsWith(`|${base.name}`)).map(([,row])=>row).sort((a,b)=>new Date(recordTime(b))-new Date(recordTime(a)))[0];
    const submittedAt=latestAny?recordTime(latestAny):null;
    return {...base,rep67,monthDist,monthRep,target,totalDist:Number(base.base67||0)+additions,totalRep:rep67+additionRep,submitted:!!latestAny&&isThisWeek(submittedAt),created_at:submittedAt};
  });

  const deltaHtml=(current,previous,ratePoint=false)=>{if(previous==null||!isFinite(previous)||previous===0)return '';const diff=current-previous,arrow=diff>0?'↑':diff<0?'↓':'→',amount=ratePoint?`${diff>=0?'+':''}${(diff*100).toFixed(1)}pp`:`${diff>=0?'+':''}${fmt(diff)}`;return `<div class="kpi-delta ${diff>0?'up':diff<0?'down':'flat'}">${arrow} ${amount} · 较上周</div>`};

  function renderMonthly() {
    const selected=monthSelect.value,label=monthLabel(selected),rows=makeRows(selected,currentMap),previousRows=makeRows(selected,previousMap);
    window.monthlyDistributionRows=rows;
    currentMonthTitle.textContent=`${label}｜新增铺货 & 复购`; monthTableHead.textContent=`${label}｜新增铺货 & 复购`;
    const base=rows.reduce((s,x)=>s+Number(x.base67||0),0),rep67=rows.reduce((s,x)=>s+x.rep67,0),monthDist=rows.reduce((s,x)=>s+x.monthDist,0),monthRep=rows.reduce((s,x)=>s+x.monthRep,0),total=rows.reduce((s,x)=>s+x.totalDist,0),totalRep=rows.reduce((s,x)=>s+x.totalRep,0);
    const previousMonthDist=previousRows.reduce((s,x)=>s+x.monthDist,0),previousTotal=previousRows.reduce((s,x)=>s+x.totalDist,0),previousTotalRep=previousRows.reduce((s,x)=>s+x.totalRep,0);
    totalDist.textContent=fmt(total); totalFormula.textContent=`6–7月基盘 ${fmt(base)} ｜ 8月起累计新增 ${fmt(total-base)}`;
    cumRep.textContent=pct(totalRep,total); cumRepNote.textContent=`累计复购 ${fmt(totalRep)} 家`;
    totalDistDelta.innerHTML=deltaHtml(total,previousTotal);totalDistDelta.hidden=!totalDistDelta.innerHTML;
    cumRepDelta.innerHTML=deltaHtml(totalRep/total,previousTotalRep/previousTotal,true);cumRepDelta.hidden=!cumRepDelta.innerHTML;
    k67.innerHTML=[['已铺货',fmt(base),'售点'],['已复购',fmt(rep67),'售点'],['复购率',pct(rep67,base),'6–7月基盘']].map(x=>`<div class="kpi"><div class="lab">${x[0]}</div><div class="val">${x[1]}</div><div class="note">${x[2]}</div></div>`).join('');
    k8.innerHTML=[['新增铺货',fmt(monthDist),'售点',deltaHtml(monthDist,previousMonthDist)],['新增售点复购',fmt(monthRep),'售点',''],['复购率',pct(monthRep,monthDist),`${label}新增售点`,'']].map(x=>`<div class="kpi"><div class="lab">${x[0]}</div><div class="val">${x[1]}</div><div class="note">${x[2]}</div>${x[3]||''}</div>`).join('');
    const done=rows.filter(x=>x.submitted).length;submitCount.textContent=`苏东 TTL：${done}/${rows.length} 已更新`;refreshTime.textContent=`页面刷新时间：${new Date().toLocaleString('zh-CN',{hour12:false})}`;
    statusByM3.innerHTML=m3Names.map(m3=>{const xs=rows.filter(x=>x.m3===m3),d=xs.filter(x=>x.submitted).length;return `<div class="m3" style="padding:14px"><div class="m3head" style="margin-bottom:8px">${m3}<span style="float:right;font-size:13px;color:#6d7788">${d}/${xs.length} 已更新</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">${xs.map(x=>`<span style="font-size:12px;padding:4px 7px;border-radius:8px;background:${x.submitted?'#eef8f1':'#fff1f1'}"><span>${x.name}</span> <b class="${x.submitted?'today':'stale'}">${x.submitted?'已更新':'待更新'}</b> <span class="timechip">${x.created_at?shortTime(x.created_at):'暂无更新'}</span></span>`).join('')}</div></div>`}).join('');
    m3grid.innerHTML=m3Names.map(m3=>{const xs=rows.filter(x=>x.m3===m3),b=xs.reduce((s,x)=>s+Number(x.base67||0),0),r=xs.reduce((s,x)=>s+x.rep67,0),d=xs.reduce((s,x)=>s+x.monthDist,0),rp=xs.reduce((s,x)=>s+x.monthRep,0),ttl=xs.reduce((s,x)=>s+x.totalDist,0);return `<div class="m3"><div class="m3head">${m3}<span style="float:right;color:#6d7788;font-size:12px">累计 ${fmt(ttl)}</span></div><div class="split"><div class="block"><div class="tag">6–7月基盘</div><div class="row"><span>铺货</span><b>${fmt(b)}</b></div><div class="row"><span>复购</span><b>${fmt(r)}</b></div><div class="row"><span>复购率</span><b>${pct(r,b)}</b></div></div><div class="block"><div class="tag">${label}</div><div class="row"><span>新增铺货</span><b>${fmt(d)}</b></div><div class="row"><span>复购</span><b>${fmt(rp)}</b></div><div class="row"><span>复购率</span><b>${pct(rp,d)}</b></div></div></div></div>`}).join('');
    renderMonthlyTable(rows,label);
  }

  function renderMonthlyTable(source,label){let rows=(filter.value==='ALL'?source:source.filter(x=>x.m3===filter.value)).slice(),metric=(x,key)=>key==='total'?x.totalDist:key==='p8'?x.monthDist:key==='r67'?(x.base67?x.rep67/x.base67:0):key==='r8'?(x.monthDist?x.monthRep/x.monthDist:0):0;if(sort.value!=='default'){const dir=sortDir.value==='desc'?-1:1;rows.sort((a,b)=>dir*(metric(a,sort.value)-metric(b,sort.value)))}tbody.innerHTML=rows.map(x=>`<tr><td>${x.m3} / ${x.name}</td><td class="td67">${fmt(x.base67)}</td><td class="td67">${fmt(x.rep67)}</td><td class="td67">${pct(x.rep67,x.base67)}</td><td class="td8">${x.target?fmt(x.target):'—'}</td><td class="td8">${fmt(x.monthDist)}</td><td class="td8">${x.target?pct(x.monthDist,x.target):'—'}</td><td class="td8">${fmt(x.monthRep)}</td><td class="td8">${pct(x.monthRep,x.monthDist)}</td><td class="totaltd">${fmt(x.totalDist)}</td></tr>`).join('');}
  monthSelect.addEventListener('change',renderMonthly);filter.addEventListener('change',renderMonthly);sort.addEventListener('change',renderMonthly);sortDir.addEventListener('change',renderMonthly);renderMonthly();
}
