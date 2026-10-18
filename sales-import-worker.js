importScripts('xlsx.full.min.js','sales-import-core.js');
self.onmessage=e=>{try{const ranges=SalesImportCore.inferRanges(e.data.files,e.data.ranges,XLSX);self.postMessage({ok:true,result:SalesImportCore.prepare(e.data.files,e.data.config,ranges,XLSX)});}catch(error){self.postMessage({ok:false,error:error.message});}};
