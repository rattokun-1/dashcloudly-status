'use strict';
const labels={up:'接続正常',down:'接続異常',maintenance:'メンテナンス中',unknown:'未確認'};
const $=id=>document.getElementById(id);
function time(value){return new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST';}
function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'#';}catch{return '#';}}
function render(data){
  const age=Date.now()-Date.parse(data.checkedAt);const stale=!Number.isFinite(age)||age>20*60*1000||age< -60000;
  const rows=data.services||[];const down=rows.some(s=>s.status==='down');const maintenance=rows.some(s=>s.status==='maintenance');
  $('summary').textContent=stale?'監視結果が更新されていません':down?'接続異常を検知しています':maintenance?'一部サービスはメンテナンス中です':'監視対象への接続は正常です';
  $('indicator').className='dot '+(stale?'unknown':down?'down':maintenance?'maintenance':'up');
  $('updated').textContent='最終確認：'+(Number.isFinite(Date.parse(data.checkedAt))?time(data.checkedAt):'未確認');
  $('warning').hidden=!stale;$('warning').textContent='監視データが古いため、現在の稼働状況は未確認です。下記は最終確認時の情報です。';
  $('main-link').href=safeLink(data.mainStatus);$('notice').textContent=data.notice||'';
  $('services').replaceChildren(...rows.map(s=>{const el=document.createElement('article');el.className='service';const box=document.createElement('div');const name=document.createElement('strong');const a=document.createElement('a');a.href=safeLink(s.url);a.rel='noreferrer';a.textContent=s.name;name.append(a);const detail=document.createElement('small');detail.textContent=(stale?'最終確認時：':'')+(s.httpStatus?'HTTP '+s.httpStatus:'応答を取得できませんでした')+(s.latencyMs!=null?' / '+s.latencyMs+' ms':'');box.append(name,detail);const badge=document.createElement('span');badge.className='badge '+(stale?'unknown':s.status);badge.textContent=stale?'現在は未確認':labels[s.status]||'未確認';el.append(box,badge);return el;}));
  const events=(data.events||[]).slice(0,20).map(e=>{const li=document.createElement('li');li.textContent=e.name+'：'+(labels[e.to]||'未確認');const at=document.createElement('time');at.textContent=time(e.at);li.append(at);return li;});
  if(!events.length){const li=document.createElement('li');li.textContent='記録された状態変更はありません。';events.push(li);}$('events').replaceChildren(...events);
}
async function load(){
  $('refresh').disabled=true;
  try{const res=await fetch('status.json?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error();render(await res.json());}
  catch{$('summary').textContent='監視結果を取得できません';$('indicator').className='dot unknown';$('warning').hidden=false;$('warning').textContent='現在の稼働状況は未確認です。時間をおいて再度ご確認ください。';for(const badge of document.querySelectorAll('.badge')){badge.className='badge unknown';badge.textContent='現在は未確認';}}
  finally{$('refresh').disabled=false;}
}
$('refresh').addEventListener('click',load);load();setInterval(load,60000);
