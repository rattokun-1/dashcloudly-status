'use strict';
const labels={up:'接続正常',down:'接続異常',maintenance:'メンテナンス中',unknown:'未確認'};
const $=id=>document.getElementById(id);
function time(value){return new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST';}
function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'#';}catch{return '#';}}
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}
function serviceCard(s,stale,checkedAt){
  const el=node('article','service'),head=node('div','service-head'),title=node('div','service-title');
  const mark=node('span','service-mark '+(stale?'unknown':s.status),stale?'?':s.status==='up'?'✓':'!');mark.setAttribute('aria-hidden','true');
  const a=node('a',null,new URL(safeLink(s.url),location.href).hostname);a.href=safeLink(s.url);a.rel='noreferrer';a.title=s.name;title.append(mark,a);
  const badge=node('span','badge '+(stale?'unknown':s.status),stale?'現在は未確認':labels[s.status]||'未確認');head.append(title,badge);el.append(head);
  const strip=node('div','uptime-strip');strip.setAttribute('aria-label','過去90日間の接続監視結果');
  for(let i=89;i>=0;i--){const date=new Date(Date.parse(checkedAt)-i*86400000).toISOString().slice(0,10);const h=s.history?.[date];const bar=node('span','uptime-day');let desc='監視記録なし';
    if(h){const total=h.up+h.down;if(total){const ratio=h.up/total;bar.classList.add(ratio===1?'up':ratio===0?'down':'partial');bar.style.setProperty('--down',((1-ratio)*100)+'%');desc='稼働率 '+(ratio*100).toFixed(2)+'% / '+total+'回監視';}else if(h.maintenance){bar.classList.add('maintenance');desc='メンテナンス中';}}
    bar.title=date+' (UTC)：'+desc;strip.append(bar);
  }
  const axis=node('div','axis');axis.append(node('span',null,'89日前'),node('span',null,'今日'));el.append(strip,axis);
  const samples=(s.samples||[]).filter(p=>p.ms!=null&&Number.isFinite(p.ms));
  if(samples.length){el.append(node('p','chart-label','応答時間'));const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('class','response-chart');svg.setAttribute('viewBox','0 0 700 110');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label','実測のHTTP応答時間');
    for(const y of [10,55,100]){const line=document.createElementNS(ns,'line');for(const [k,v]of Object.entries({x1:0,x2:700,y1:y,y2:y,class:'chart-grid'}))line.setAttribute(k,v);svg.append(line);}
    const max=Math.max(1000,...samples.map(p=>p.ms));const points=samples.map((p,i)=>`${samples.length===1?350:i/(samples.length-1)*700},${100-p.ms/max*90}`);
    const poly=document.createElementNS(ns,'polyline');poly.setAttribute('class','chart-line');poly.setAttribute('points',points.join(' '));svg.append(poly);
    if(samples.length===1){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx','350');dot.setAttribute('cy',100-samples[0].ms/max*90);dot.setAttribute('r','3');dot.setAttribute('fill','var(--blue)');svg.append(dot);}
    const caption=node('div','chart-caption');caption.append(node('span',null,'実測 '+samples.length+'件 / 上限 '+(max/1000).toFixed(1)+' s'),node('span',null,'最新 '+(samples.at(-1).ms/1000).toFixed(2)+' s'));el.append(svg,caption);
  }
  el.append(node('small',null,(stale?'最終確認時：':'')+(s.httpStatus?'HTTP '+s.httpStatus:'応答を取得できませんでした')+(s.latencyMs!=null?' / '+s.latencyMs+' ms':'')));return el;
}
function render(data){
  const age=Date.now()-Date.parse(data.checkedAt);const stale=!Number.isFinite(age)||age>20*60*1000||age< -60000;
  const rows=data.services||[];const down=rows.some(s=>s.status==='down');const maintenance=rows.some(s=>s.status==='maintenance');
  $('summary').textContent=stale?'監視結果が更新されていません':down?'接続異常を検知しています':maintenance?'一部サービスはメンテナンス中です':'監視対象への接続は正常です';
  $('indicator').className='status-icon '+(stale?'unknown':down?'down':maintenance?'maintenance':'up');$('indicator').textContent=stale?'?':!down&&!maintenance?'✓':'!';
  $('updated').textContent='最終更新日時：'+(Number.isFinite(Date.parse(data.checkedAt))?time(data.checkedAt):'未確認');
  $('group-status').textContent=stale?'現在は未確認':down?'接続異常あり':maintenance?'一部メンテナンス中':'稼働中';
  $('warning').hidden=!stale;$('warning').textContent='監視データが古いため、現在の稼働状況は未確認です。下記は最終確認時の情報です。';
  $('main-link').href=safeLink(data.mainStatus);$('notice').textContent=data.notice||'';
  $('services').replaceChildren(...rows.map(s=>serviceCard(s,stale,Number.isFinite(Date.parse(data.checkedAt))?data.checkedAt:new Date().toISOString())));
  const events=(data.events||[]).slice(0,20).map(e=>{const li=document.createElement('li');li.textContent=e.name+'：'+(labels[e.to]||'未確認');const at=document.createElement('time');at.textContent=time(e.at);li.append(at);return li;});
  if(!events.length){const li=document.createElement('li');li.textContent='記録された状態変更はありません。';events.push(li);}$('events').replaceChildren(...events);
}
async function load(){
  $('refresh').disabled=true;
  try{const res=await fetch('status.json?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error();render(await res.json());}
  catch{$('summary').textContent='監視結果を取得できません';$('indicator').className='status-icon unknown';$('indicator').textContent='?';$('group-status').textContent='現在は未確認';$('warning').hidden=false;$('warning').textContent='現在の稼働状況は未確認です。時間をおいて再度ご確認ください。';for(const mark of document.querySelectorAll('.service-mark')){mark.className='service-mark unknown';mark.textContent='?';}for(const badge of document.querySelectorAll('.badge')){badge.className='badge unknown';badge.textContent='現在は未確認';}}
  finally{$('refresh').disabled=false;}
}
$('refresh').addEventListener('click',load);load();setInterval(load,60000);
