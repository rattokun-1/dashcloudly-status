// Fixed destinations only. Never forward visitor cookies, credentials or query strings.
export const PRIMARY='https://status.dashcloudly.com';
export const BACKUP='https://rattokun-1.github.io/dashcloudly-status/';
const headers={'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function reachable(url,fetcher=fetch,timeout=4000){
  const origin=new URL(url).origin;let current=url;const signal=AbortSignal.timeout(timeout);
  try{
    for(let i=0;i<4;i++){
      const res=await fetcher(current,{method:'GET',redirect:'manual',signal,headers:{'User-Agent':'Dashcloudly-Status-Gateway/1.0','Cache-Control':'no-cache'}});
      await res.body?.cancel();
      if(res.ok)return true;
      if(res.status>=300&&res.status<400&&res.headers.get('Location')){
        const next=new URL(res.headers.get('Location'),current);if(next.origin!==origin)return false;current=next.href;
      }else return false;
    }
  }catch{}
  return false;
}
export async function handle(request,fetcher=fetch){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
  const input=new URL(request.url);
  if(input.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});
  if(input.pathname==='/favicon.ico')return new Response(null,{status:204,headers});
  let destination=BACKUP;
  // The explicit backup hostname/path never bounces back to the main page.
  const backupOnly=input.hostname==='status-backup.dashcloudly.com'||input.pathname==='/backup';
  if(!backupOnly&&await reachable(PRIMARY+'/ja',fetcher)){
    const target=new URL(PRIMARY);target.pathname=/^\/(ja|en)(\/incident\/\d+)?\/?$/.test(input.pathname)?input.pathname:'/ja';destination=target.href;
  }
  return new Response(null,{status:302,headers:{...headers,Location:destination}});
}
export default {fetch:request=>handle(request)};
