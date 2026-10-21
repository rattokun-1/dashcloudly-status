import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export async function probe(service, fetcher=fetch, timeout=10000) {
  const started=Date.now();
  try {
    const res=await fetcher(service.url,{redirect:'follow',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'Dashcloudly-Status/1.0','Cache-Control':'no-cache'}});
    await res.body?.cancel();
    return {status:res.ok?'up':'down',httpStatus:res.status,latencyMs:Date.now()-started};
  } catch {return {status:'down',httpStatus:null,latencyMs:null};}
}

export async function collect(config,previous={},fetcher=fetch,timeout=10000) {
  const checkedAt=new Date().toISOString();
  const services=await Promise.all(config.services.map(async service=>{
    let result=await probe(service,fetcher,timeout);
    if(result.status==='down')result=await probe(service,fetcher,timeout);
    return {...service,...result,status:service.maintenance?'maintenance':result.status};
  }));
  const events=[...(previous.events||[])];
  for(const service of services){
    const before=previous.services?.find(row=>row.id===service.id);
    if(before&&before.status!==service.status)events.unshift({id:service.id,name:service.name,from:before.status,to:service.status,at:checkedAt});
  }
  return {checkedAt,notice:config.notice,mainStatus:config.mainStatus,services,events:events.slice(0,100)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url),'utf8'));
  let previous={};try{previous=JSON.parse(await readFile(new URL('../public/status.json',import.meta.url),'utf8'));}catch{}
  const data=await collect(config,previous);
  await writeFile(new URL('../public/status.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
  console.log(data.services.map(s=>`${s.id}: ${s.status} (${s.httpStatus??'no response'})`).join('\n'));
}
