function renderMonthlyDashboard(data, previousData = null) {
  const monthKeys = (data.months && data.months.length ? data.months : ['2026-06', '2026-07', '2026-08']).slice().sort();
  const monthLabel = key => `${Number(key.slice(5))}月`;
  const indexOfMonth = key => monthKeys.indexOf(key);
  const valueAt = (row, type, key) => {
    const monthly = row[`${type}_monthly`];
    if (monthly && monthly[key] != null) return Number(monthly[key]) || 0;
    return Number((row[type] || [])[indexOfMonth(key)]) || 0;
  };
  const hlAt = (row, type, key) => Number((row[`${type}_monthly`] || {})[key]) || 0;
  const through = key => monthKeys.filter(month => month <= key);
  const ytd = (row, type, key) => through(key).reduce((sum, month) => sum + valueAt(row, type, month), 0);
  const hlYtd = (row, type, key) => through(key).reduce((sum, month) => sum + hlAt(row, type, month), 0);
  const includedDealers = data.dealers.filter(row => M3_ORDER.includes(row.m3));
  const monthSelect = document.getElementById('monthSelect');
  const m3Filter = document.getElementById('m3Filter'), sortBy = document.getElementById('sortBy'), sortDir = document.getElementById('sortDir');
  const monthStwLabel = document.getElementById('monthStwLabel'), monthStrLabel = document.getElementById('monthStrLabel');
  const monthStw = document.getElementById('monthStw'), monthStr = document.getElementById('monthStr');
  const monthStwHl = document.getElementById('monthStwHl'), monthStrHl = document.getElementById('monthStrHl');
  const kpiStw = document.getElementById('kpiStw'), kpiStr = document.getElementById('kpiStr'), kpiStwHl = document.getElementById('kpiStwHl'), kpiStrHl = document.getElementById('kpiStrHl');
  const kpiRate = document.getElementById('kpiRate'), kpiHl = document.getElementById('kpiHl');
  const stwDelta = document.getElementById('stwDelta'), strDelta = document.getElementById('strDelta'), rateDelta = document.getElementById('rateDelta');
  const stwMonthHead = document.getElementById('stwMonthHead'), strMonthHead = document.getElementById('strMonthHead'), rowCount = document.getElementById('rowCount'), dealerBody = document.getElementById('dealerBody');
  monthSelect.innerHTML = monthKeys.map(key => `<option value="${key}">${monthLabel(key)}</option>`).join('');
  monthSelect.value = monthKeys[monthKeys.length - 1];
  M3_ORDER.forEach(value => m3Filter.add(new Option(value, value)));

  const shortDate = iso => { const d = new Date(`${iso}T00:00:00`); return `${d.getMonth() + 1}/${d.getDate()}`; };
  document.getElementById('salesPeriod').textContent = `STW截至 ${shortDate(data.period.stw_max)} · STR周期：${shortDate(data.period.str_min)}–${shortDate(data.period.str_max)}`;

  const showDelta = (id, current, previous, ratePoint = false) => {
    const el = document.getElementById(id);
    if (previous == null || !isFinite(previous) || previous === 0) { el.hidden = true; return; }
    const diff = current - previous;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    el.className = `kpi-delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}`;
    el.textContent = `${arrow} ${diff >= 0 ? '+' : ''}${ratePoint ? `${(diff * 100).toFixed(1)}pp` : fmt(diff)} · 较上周`;
    el.hidden = false;
  };

  function renderTrend() {
    const monthlyStw = monthKeys.map(key => includedDealers.reduce((sum, row) => sum + valueAt(row, 'stw', key), 0));
    const monthlyStr = monthKeys.map(key => includedDealers.reduce((sum, row) => sum + valueAt(row, 'str', key), 0));
    const width = Math.max(1000, monthKeys.length * 230 + 150), left = 90, right = width - 60, bottom = 220;
    const max = Math.max(...monthlyStw, ...monthlyStr, 1) * 1.12;
    const step = (right - left) / monthKeys.length, barWidth = Math.min(64, step * .32), y = value => bottom - value / max * 165;
    const svg = document.getElementById('monthlyTrend');
    svg.setAttribute('viewBox', `0 0 ${width} 280`);
    svg.setAttribute('aria-label', `${monthLabel(monthKeys[0])}至${monthLabel(monthKeys.at(-1))}STW和STR趋势图`);
    svg.innerHTML = [0, .25, .5, .75, 1].map(p => `<line class="trend-grid" x1="${left}" y1="${bottom-p*165}" x2="${right}" y2="${bottom-p*165}"/><text class="trend-axis" x="${left-12}" y="${bottom+4-p*165}" text-anchor="end">${fmt(max*p)}</text>`).join('') +
      `<text class="trend-axis" x="20" y="22">单位：箱</text>` + monthKeys.map((key, i) => {
        const x = left + step * (i + .5), a = monthlyStw[i], b = monthlyStr[i];
        return `<rect class="trend-bar-stw" x="${x-barWidth-5}" y="${y(a)}" width="${barWidth}" height="${bottom-y(a)}" rx="5"/><text class="trend-value-stw" x="${x-barWidth/2-5}" y="${y(a)-8}" text-anchor="middle">${fmt(a)}</text><rect class="trend-bar-str" x="${x+5}" y="${y(b)}" width="${barWidth}" height="${bottom-y(b)}" rx="5"/><text class="trend-value-str" x="${x+barWidth/2+5}" y="${y(b)-8}" text-anchor="middle">${fmt(b)}</text><text class="trend-axis" x="${x}" y="255" text-anchor="middle">${monthLabel(key)}</text>`;
      }).join('');
  }

  function renderSelectedMonth() {
    const selected = monthSelect.value;
    const label = monthLabel(selected);
    const active = includedDealers.filter(row => ytd(row, 'stw', selected) || ytd(row, 'str', selected));
    const totals = active.reduce((out, row) => {
      out.monthStw += valueAt(row, 'stw', selected); out.monthStr += valueAt(row, 'str', selected);
      out.stw += ytd(row, 'stw', selected); out.str += ytd(row, 'str', selected);
      out.snow += hlYtd(row, 'snow_hl', selected); out.ih += hlYtd(row, 'ih_hl', selected); return out;
    }, {monthStw:0, monthStr:0, stw:0, str:0, snow:0, ih:0});
    const rate = totals.ih ? totals.snow / totals.ih : null;
    monthStwLabel.textContent = `${label} STW`; monthStrLabel.textContent = `${label} STR`;
    monthStw.textContent = `${fmt(totals.monthStw)} 箱`; monthStr.textContent = `${fmt(totals.monthStr)} 箱`;
    monthStwHl.textContent = `折合 ${fmtHl(totals.monthStw * .06)} HL`; monthStrHl.textContent = `折合 ${fmtHl(totals.monthStr * .06)} HL`;
    kpiStw.textContent = `${fmt(totals.stw)} 箱`; kpiStr.textContent = `${fmt(totals.str)} 箱`;
    kpiStwHl.textContent = `折合 ${fmtHl(totals.stw * .06)} HL`; kpiStrHl.textContent = `折合 ${fmtHl(totals.str * .06)} HL`;
    kpiRate.textContent = pct(rate); kpiHl.textContent = `${fmt(totals.snow)} HL / ${fmt(totals.ih)} HL`;
    [stwDelta, strDelta, rateDelta].forEach(el => el.hidden = true);
    if (selected === monthKeys.at(-1) && previousData) {
      const p = previousData.dealers.filter(row => M3_ORDER.includes(row.m3)).reduce((out,row)=>(out.stw+=Number(row.stw_ytd)||0,out.str+=Number(row.str_ytd)||0,out.snow+=Number(row.snow_hl)||0,out.ih+=Number(row.ih_hl)||0,out),{stw:0,str:0,snow:0,ih:0});
      showDelta('stwDelta', totals.stw, p.stw); showDelta('strDelta', totals.str, p.str); showDelta('rateDelta', rate, p.ih ? p.snow/p.ih : null, true);
    }

    const regions = M3_ORDER.map(m3 => {
      const rows = active.filter(row => row.m3 === m3);
      const stw = rows.reduce((sum,row)=>sum+valueAt(row,'stw',selected),0), str = rows.reduce((sum,row)=>sum+valueAt(row,'str',selected),0);
      const snow = rows.reduce((sum,row)=>sum+hlYtd(row,'snow_hl',selected),0), ih = rows.reduce((sum,row)=>sum+hlYtd(row,'ih_hl',selected),0);
      return {m3,stw,str,rate:ih?snow/ih:null};
    });
    const regionMax = Math.max(...regions.flatMap(row => [row.stw,row.str]),1);
    document.getElementById('regions').innerHTML = `<div class="chart-legend"><span><i class="dot stw"></i>${label} STW</span><span><i class="dot str"></i>${label} STR</span><span>单位：箱</span></div>` + regions.map(row => `<div class="chart-row"><div class="chart-name">${row.m3}</div><div class="bar-pair"><div class="bar-line"><span>STW</span><div class="bar-track"><div class="bar-fill stw" style="width:${row.stw/regionMax*100}%"></div></div><span class="bar-value">${fmt(row.stw)}</span></div><div class="bar-line"><span>STR</span><div class="bar-track"><div class="bar-fill str" style="width:${row.str/regionMax*100}%"></div></div><span class="bar-value">${fmt(row.str)}</span></div></div><div class="rate-box"><span>YTD渗透率</span><strong>${pct(row.rate)}</strong></div></div>`).join('');
    stwMonthHead.textContent=`${label} STW`; strMonthHead.textContent=`${label} STR`;
    renderDealers(active, selected);
  }

  function renderDealers(active, selected) {
    const rows = active.filter(row => !m3Filter.value || row.m3 === m3Filter.value).slice();
    const baseSort = (a,b) => M3_ORDER.indexOf(a.m3)-M3_ORDER.indexOf(b.m3) || m2Rank(a.m2)-m2Rank(b.m2) || a.dealer.localeCompare(b.dealer,'zh-CN');
    const metric = (row,key) => key==='stwMonth'?valueAt(row,'stw',selected):key==='strMonth'?valueAt(row,'str',selected):key==='stwYtd'?ytd(row,'stw',selected):key==='strYtd'?ytd(row,'str',selected):key==='rate'?(hlYtd(row,'ih_hl',selected)?hlYtd(row,'snow_hl',selected)/hlYtd(row,'ih_hl',selected):-1):0;
    if(sortBy.value==='m3') rows.sort(baseSort); else {const dir=sortDir.value==='asc'?1:-1;rows.sort((a,b)=>dir*(metric(a,sortBy.value)-metric(b,sortBy.value))||baseSort(a,b));}
    rowCount.textContent=`共 ${rows.length} 家经销商`;
    dealerBody.innerHTML=rows.map(row=>{const ih=hlYtd(row,'ih_hl',selected),rate=ih?hlYtd(row,'snow_hl',selected)/ih:null;return `<tr><td>${row.m3}</td><td>${displayM2(row.m2)}</td><td>${row.dealer}</td><td>${fmt(valueAt(row,'stw',selected))}</td><td>${fmt(ytd(row,'stw',selected))}</td><td>${fmt(valueAt(row,'str',selected))}</td><td>${fmt(ytd(row,'str',selected))}</td><td class="rate-cell"><span class="rate-value">${pct(rate)}</span><div class="rate-track"><div class="rate-fill" style="width:${Math.min((rate||0)*100,100)}%"></div></div></td></tr>`}).join('')||'<tr><td colspan="8">暂无数据</td></tr>';
  }

  monthSelect.addEventListener('change', renderSelectedMonth);
  m3Filter.addEventListener('change', renderSelectedMonth);
  sortBy.addEventListener('change', renderSelectedMonth);
  sortDir.addEventListener('change', renderSelectedMonth);
  renderTrend(); renderSelectedMonth();
}
