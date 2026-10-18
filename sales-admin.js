(async()=>{
'use strict';const $=id=>document.getElementById(id),client=supabase.createClient('https://hjuemoaxwotvgvppuits.supabase.co','sb_publishable_kLCQcltuyPsjoM5udpUu4A_8iw1R-oD');let context,prepared,busy=false;
const fmt=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
function clear(){prepared=null;$('review').hidden=true;$('approve').checked=false;$('commit').disabled=true;}
function lock(value){busy=value;$('preview').disabled=value;document.querySelectorAll('input').forEach(e=>e.disabled=value);$('commit').disabled=value||!prepared||!$('approve').checked;}
function error(e){$('message').textContent=e?.message||String(e);}
async function load(){const {data,error:e}=await client.rpc('sales_import_context');if(e)throw Error('管理员核验失败：'+e.message);context=data;}
async function parse(files,config,ranges){return new Promise((resolve,reject)=>{const worker=new Worker('sales-import-worker.js?v=20261014-admin-upload'),timeout=setTimeout(()=>{worker.terminate();reject(Error('文件解析超过90秒，请缩小底表后重试。'));},90000);worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(Error('解析组件加载失败，请刷新或检查网络。'));};worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();e.data.ok?resolve(e.data.result):reject(Error(e.data.error));};worker.postMessage({files,config,ranges},Object.values(files).flat().map(f=>f.buffer));});}
try{
 const {data:{user},error:e}=await client.auth.getUser();if(e||!user)throw Error('请先返回看板登录管理员账号。');await load();$('locked').hidden=true;$('app').hidden=false;
 for(const kind of ['stw','str']){const end=context.payload.period[kind+'_max'];$(kind+'From').value=kind==='str'?'2026-08-01':end.slice(0,7)+'-01';$(kind+'To').value=end;}
}catch(e){$('locked').textContent=e.message;return;}
for(const kind of ['stw','str'])$(kind+'To').readOnly=true;
document.querySelectorAll('input:not(#approve)').forEach(e=>e.addEventListener('change',()=>{if(!busy)clear();if(e.id.endsWith('Files'))$(e.id.slice(0,3)+'To').value='';}));
$('approve').addEventListener('change',()=>{$('commit').disabled=!prepared||!$('approve').checked||busy;});
$('preview').addEventListener('click',async()=>{
 clear();if(!$('coverage').checked){error(Error('请先确认底表完整覆盖所选期间。'));return;}lock(true);$('message').textContent='正在解析底表…';
 try{
  await load();const files={},ranges={};
  for(const kind of ['stw','str']){
   const from=$(kind+'From').value,to=$(kind+'To').value;
   if(!/^2026-(08|09|10|11|12)-01$/.test(from))throw Error(kind.toUpperCase()+'请选择8月或之后的月初覆盖。');
   ranges[kind]={from,to};files[kind]=[];
   const selected=[...$(kind+'Files').files];if(!selected.length||selected.length>6)throw Error('每类请选择1–6份.xlsx底表');
   for(const f of selected){if(f.size>40*1024*1024)throw Error('单文件不得超过40MB');files[kind].push({name:f.name,buffer:await f.arrayBuffer()});}
  }
  const parsed=await parse(files,context.config,ranges),{data,error:e}=await client.rpc('sales_import_run',{p_batch:parsed.batch,p_expected:context.revision,p_commit:false});if(e)throw e;
  prepared={batch:parsed.batch,revision:context.revision};for(const kind of ['stw','str'])$(kind+'To').value=parsed.batch[kind].to;$('dates').textContent='STW截止 '+data.summary.stw_to+'；STR截止 '+data.summary.str_to+'。';$('totals').replaceChildren();
  for(const p of data.summary.products){const tr=document.createElement('tr');for(const v of [p.product==='snow'?'雪白听':'经典听',fmt(p.stw),fmt(p.str),fmt(p.stw_mtd),fmt(p.str_mtd),fmt(p.negative_cases)]){const td=document.createElement('td');td.textContent=v;tr.appendChild(td);}$('totals').appendChild(tr);}
  const notes=[...parsed.warnings,'负STR按底表原值计入，可能存在免费酒盘库偏差。','响水已确认9/13转户记录按既定规则剔除。'];$('warnings').textContent=notes.join('\n');$('warnings').style.whiteSpace='pre-wrap';
  $('sourceDetails').textContent=parsed.batch.files.map(f=>f.kind.toUpperCase()+'：'+f.name+' / '+f.sheet+'，读取 '+f.rows+' 行，纳入 '+f.used+' 行').join('\n')+'\n转户排除：雪白 '+parsed.batch.transfer.snow+' 箱；经典 '+parsed.batch.transfer.classic+' 箱';$('review').hidden=false;$('message').textContent='预览完成，尚未写入。';
 }catch(e){clear();error(e);}finally{lock(false);}
});
$('commit').addEventListener('click',async()=>{
 if(!prepared||!$('approve').checked||busy)return;lock(true);$('message').textContent='正在保存…';
 try{const {data,error:e}=await client.rpc('sales_import_run',{p_batch:prepared.batch,p_expected:prepared.revision,p_commit:true});if(e)throw e;if(!data.committed)throw Error('服务器未确认写入，请重新读取后核对。');clear();$('message').textContent='更新成功，已保留上一版备份。返回看板刷新即可。';await load();}
 catch(e){clear();error(Error('未确认更新成功：'+e.message+'。请重新预览核对，不要直接重复提交。'));}finally{lock(false);}
});
client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){clear();$('app').hidden=true;$('locked').hidden=false;$('locked').textContent='登录已退出，请返回看板重新登录。';}});
})();
