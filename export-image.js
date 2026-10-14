async function exportDashboardImage(target, filename, title, button) {
  if (typeof html2canvas === 'undefined') { alert('图片导出组件加载失败，请检查网络后重试。'); return; }
  const source = typeof target === 'string' ? document.querySelector(target) : target;
  if (!source) { alert('未找到要导出的内容，请刷新后重试。'); return; }
  const oldText = button && button.textContent;
  if (button) { button.disabled = true; button.textContent = '正在生成…'; }
  let host;
  try {
    const sourceWidth = Math.ceil(Math.max(source.scrollWidth || 0, source.offsetWidth || 0, source.getBoundingClientRect().width || 0, parseFloat(source.style.width) || 0));
    if (!(sourceWidth > 0)) throw new Error('导出内容尚未完成布局，请稍后重试。');
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;z-index:-9999;background:#f5f7fb;padding:24px;pointer-events:none;';
    host.style.width = sourceWidth + 48 + 'px';
    const frame = document.createElement('div');
    frame.style.cssText = 'display:block;position:static;background:#f5f7fb;padding:0;margin:0;';
    frame.style.width = sourceWidth + 'px';
    if (title) {
      const heading = document.createElement('div'); heading.textContent = title;
      heading.style.cssText = 'font-size:24px;font-weight:700;color:#172033;margin:0 0 14px;'; frame.appendChild(heading);
    }
    const clone = source.cloneNode(true);
    clone.querySelectorAll('.export-btn,.logout-btn').forEach(x => x.remove());
    // Temporary off-screen export sources must participate in the clone's normal flow.
    Object.assign(clone.style, { position:'static', inset:'auto', left:'auto', right:'auto', top:'auto', bottom:'auto', transform:'none', display:'block', width:sourceWidth+'px', maxWidth:'none', minWidth:'0', height:'auto', maxHeight:'none', overflow:'visible', margin:'0' });
    clone.querySelectorAll('.table-wrap,[style*="overflow:auto"]').forEach(x => { x.style.maxHeight='none'; x.style.height='auto'; x.style.overflow='visible'; });
    clone.querySelectorAll('th,td').forEach(x => { x.style.position='static'; x.style.left='auto'; x.style.top='auto'; x.style.bottom='auto'; });
    frame.appendChild(clone); host.appendChild(frame); document.body.appendChild(host);
    // Read every original size first so inherited text is not enlarged repeatedly.
    const textSizes=[clone, ...clone.querySelectorAll('*')].map(x=>({x,size:parseFloat(getComputedStyle(x).fontSize)}));
    textSizes.forEach(({x,size})=>{if(Number.isFinite(size)&&size>0)x.style.fontSize=Math.round(size*1.1*10)/10+'px'});
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]);
    const rect=frame.getBoundingClientRect(),width=Math.ceil(Math.max(frame.scrollWidth,rect.width)),height=Math.ceil(Math.max(frame.scrollHeight,rect.height));
    if (!(width > 0 && height > 0)) throw new Error('图片布局尺寸为空，未下载文件。请刷新看板后重试。');
    const scale=Math.min(2,8192/width,8192/height,Math.sqrt(8000000/(width*height)));
    const canvas=await html2canvas(frame,{backgroundColor:'#f5f7fb',scale,useCORS:true,logging:false,width,height,windowWidth:width+48,windowHeight:height+48});
    if (!(canvas.width > 0 && canvas.height > 0)) throw new Error('生成的图片尺寸为空，未下载文件。');
    const blob=await new Promise((resolve,reject)=>{canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG生成失败，未下载文件。')),'image/png')});
    if (blob.size <= 8) throw new Error('生成的PNG为空，未下载文件。');
    const signature=new Uint8Array(await blob.slice(0,8).arrayBuffer());
    if (![137,80,78,71,13,10,26,10].every((v,i)=>signature[i]===v)) throw new Error('生成的文件不是有效PNG，未下载文件。');
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.download=filename;link.href=url;
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    return {width:canvas.width,height:canvas.height,bytes:blob.size};
  } catch (error) { alert('图片生成失败：' + error.message); }
  finally { host?.remove(); if (button) { button.disabled=false; button.textContent=oldText; } }
}
const exportDate = () => new Date().toISOString().slice(0, 10);
document.getElementById('exportDealerBtn')?.addEventListener('click', event => exportDashboardImage('#dealerExportArea','雪白听_经销商明细_'+exportDate()+'.png','雪白听销量追踪｜经销商明细',event.currentTarget));
document.getElementById('exportSalesPageBtn')?.addEventListener('click', event => exportDashboardImage('.wrap','雪白听_销量追踪_'+exportDate()+'.png','',event.currentTarget));
document.getElementById('exportM2Btn')?.addEventListener('click', event => exportDashboardImage('#m2ExportArea','雪白听_M2铺货明细_'+exportDate()+'.png','雪白听铺货追踪｜M2明细',event.currentTarget));
document.getElementById('exportDistributionPageBtn')?.addEventListener('click', event => exportDashboardImage('.wrap','雪白听_铺货追踪_'+exportDate()+'.png','',event.currentTarget));
