(()=>{
 let epoch=0;
 async function refresh(){const current=++epoch;const button=document.getElementById('salesAdmin');if(button)button.remove();const {data,error}=await client.auth.getUser();if(error||!data.user)return;const result=await client.rpc('sales_import_is_admin');if(current!==epoch||result.error||result.data!==true)return;const a=document.createElement('a');a.id='salesAdmin';a.className='logout';a.href='admin.html?v=20261018-single-upload';a.style.textDecoration='none';a.textContent='上传销量底表';document.querySelector('.actions').prepend(a);}
 client.auth.onAuthStateChange(()=>{setTimeout(refresh,0);});refresh();
})();
