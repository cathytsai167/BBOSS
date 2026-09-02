function initMonthlyAnalysis(currentSales, previousSales, weeklyData) {
  const months=(currentSales.months&&currentSales.months.length?currentSales.months:['2026-06','2026-07','2026-08']).filter(key=>key>='2026-08').slice().sort();
  const monthLabel=key=>`${Number(key.slice(5))}月`,recordTime=row=>row&&(row.updated_at||row.created_at),recordMonth=row=>row.report_month||'2026-08';
  const monthSelect=document.getElementById('analysisMonthSelect');
  monthSelect.innerHTML=months.map(key=>`<option value="${key}">${monthLabel(key)}</option>`).join('');monthSelect.value=months.at(-1);
  const valueAt=(row,type,key,data)=>{const map=row[`${type}_monthly`];if(map&&map[key]!=null)return Number(map[key])||0;const sourceMonths=data.months||['2026-06','2026-07','2026-08'];return Number((row[type]||[])[sourceMonths.indexOf(key)])||0};
  const hlYtd=(row,type,key,data)=>{const sourceMonths=(data.months||['2026-06','2026-07','2026-08']).filter(m=>m<=key),map=row[`${type}_monthly`];return map?sourceMonths.reduce((s,m)=>s+(Number(map[m])||0),0):Number(row[type])||0};
  const latestMap=cutoff=>{const map={};(weeklyData||[]).filter(row=>!cutoff||new Date(recordTime(row))<=cutoff).sort((a,b)=>new Date(recordTime(b))-new Date(recordTime(a))).forEach(row=>{const key=`${recordMonth(row)}|${row.m2}`;if(!map[key])map[key]=row});return map};
  const currentMap=latestMap(null);

  function build(data,selected,cutoff=null){
    const map=cutoff?latestMap(cutoff):currentMap,dist={};
    M2_BASE.forEach(base=>{const key=distKey(base.name),monthsToUse=['2026-08',...months.filter(m=>m>'2026-08'&&m<=selected)],monthRows=monthsToUse.map(m=>map[`${m}|${base.name}`]).filter(Boolean),latest=monthRows.sort((a,b)=>new Date(recordTime(b))-new Date(recordTime(a)))[0];const additions=monthsToUse.reduce((s,m)=>{const r=map[`${m}|${base.name}`];return s+(r?Number(r.distribution_8||0):(m==='2026-08'?Number(base.dist8Initial||0):0))},0),additionRep=monthsToUse.reduce((s,m)=>{const r=map[`${m}|${base.name}`];return s+(r?Number(r.repurchase_8||0):(m==='2026-08'?Number(base.rep8Initial||0):0))},0),x=dist[key]||(dist[key]={m3:base.m3,m2:key,distribution:0,repurchase:0});x.distribution+=Number(base.base67||0)+additions;x.repurchase+=(latest?Number(latest.repurchase_67||0):Number(base.rep67Initial||0))+additionRep});
    const sales={};
    data.dealers.filter(row=>M3_ORDER.includes(row.m3)).forEach(row=>{const key=salesKey(row.m2),x=sales[key]||(sales[key]={m3:row.m3,m2:key,stw:0,str:0,snow:0,ih:0});x.stw+=valueAt(row,'stw',selected,data);x.str+=valueAt(row,'str',selected,data);x.snow+=hlYtd(row,'snow_hl',selected,data);x.ih+=hlYtd(row,'ih_hl',selected,data)});
    return Object.values(dist).map(d=>{const s=sales[d.m2]||{};return {...d,stw:s.stw||0,str:s.str||0,penetration:s.ih?s.snow/s.ih:null,repurchaseRate:d.distribution?d.repurchase/d.distribution:0,productivity:d.distribution?(s.str||0)/d.distribution:0}});
  }

  function refresh(){const selected=monthSelect.value,label=monthLabel(selected);rows=build(currentSales,selected);previousRows=[];if(previousSales){const cutoff=new Date(previousSales.period.str_max+'T23:59:59');previousRows=build(previousSales,selected,cutoff)}document.getElementById('analysisStrLabel').textContent=`${label} STR`;document.getElementById('analysisProductivityLabel').textContent=`${label}单店 STR`;document.getElementById('analysisStwHead').textContent=`${label} STW`;document.getElementById('analysisStrHead').textContent=`${label} STR`;document.getElementById('analysisSingleHead').textContent=`${label}单店STR`;renderSummary();render()}
  monthSelect.addEventListener('change',refresh);refresh();
}
