async function exportDashboardImage(target, filename, title, button) {
  if (typeof html2canvas === 'undefined') {
    alert('图片导出组件加载失败，请检查网络后重试。');
    return;
  }
  const source = typeof target === 'string' ? document.querySelector(target) : target;
  if (!source) return;
  const oldText = button && button.textContent;
  if (button) { button.disabled = true; button.textContent = '正在生成…'; }
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:-9999;background:#f5f7fb;padding:24px;pointer-events:none;';
  const frame = document.createElement('div');
  frame.style.cssText = 'background:#f5f7fb;padding:0;margin:0;';
  if (title) {
    const heading = document.createElement('div');
    heading.textContent = title;
    heading.style.cssText = 'font-size:24px;font-weight:700;color:#172033;margin:0 0 14px;';
    frame.appendChild(heading);
  }
  const clone = source.cloneNode(true);
  clone.querySelectorAll('.export-btn,.logout-btn').forEach(x => x.remove());
  [clone, ...clone.querySelectorAll('*')].forEach(x => {
    const size = parseFloat(getComputedStyle(x).fontSize);
    if (Number.isFinite(size) && size > 0) x.style.fontSize = Math.round(size * 1.1 * 10) / 10 + 'px';
  });
  clone.querySelectorAll('.table-wrap,[style*="overflow:auto"]').forEach(x => {
    x.style.maxHeight = 'none'; x.style.height = 'auto'; x.style.overflow = 'visible';
  });
  clone.querySelectorAll('th,td').forEach(x => {
    x.style.position = 'static'; x.style.left = 'auto'; x.style.top = 'auto';
  });
  clone.style.maxWidth = 'none';
  clone.style.width = Math.max(source.scrollWidth, source.offsetWidth) + 'px';
  frame.appendChild(clone); host.appendChild(frame); document.body.appendChild(host);
  try {
    const width = Math.ceil(frame.scrollWidth), height = Math.ceil(frame.scrollHeight);
    const scale = Math.min(2, Math.max(1, Math.sqrt(15000000 / Math.max(width * height, 1))));
    const canvas = await html2canvas(frame, {
      backgroundColor: '#f5f7fb', scale, useCORS: true, logging: false,
      width, height, windowWidth: width, windowHeight: height
    });
    const link = document.createElement('a');
    link.download = filename; link.href = canvas.toDataURL('image/png'); link.click();
  } catch (error) {
    alert('图片生成失败：' + error.message);
  } finally {
    host.remove();
    if (button) { button.disabled = false; button.textContent = oldText; }
  }
}

const exportDate = () => new Date().toISOString().slice(0, 10);
document.getElementById('exportDealerBtn')?.addEventListener('click', event =>
  exportDashboardImage('#dealerExportArea', '雪白听_经销商明细_' + exportDate() + '.png', '雪白听销量追踪｜经销商明细', event.currentTarget));
document.getElementById('exportSalesPageBtn')?.addEventListener('click', event =>
  exportDashboardImage('.wrap', '雪白听_销量追踪_' + exportDate() + '.png', '', event.currentTarget));
document.getElementById('exportM2Btn')?.addEventListener('click', event =>
  exportDashboardImage('#m2ExportArea', '雪白听_M2铺货明细_' + exportDate() + '.png', '雪白听铺货追踪｜M2明细', event.currentTarget));
document.getElementById('exportDistributionPageBtn')?.addEventListener('click', event =>
  exportDashboardImage('.wrap', '雪白听_铺货追踪_' + exportDate() + '.png', '', event.currentTarget));
