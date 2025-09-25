import { NextRequest } from "next/server";
import { prisma } from "@lib/db";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { experimentId: string } }) {
  const experimentId = Number(params.experimentId);
  if (!experimentId) return new Response("// invalid experiment id", { status: 400, headers: { "Content-Type": "application/javascript" } });

  const exp = await prisma.experiment.findUnique({ where: { id: experimentId }, select: { id: true, entry_url: true } });
  const entryUrl = exp?.entry_url || "";

  const js = `/* AB Embed for Experiment ${experimentId} */
(function(){
  var EXP_ID = ${JSON.stringify(experimentId)};
  var ENTRY_URL = ${JSON.stringify(entryUrl)};
  var ORIGIN = (function(){
    try {
      var el = document.currentScript; if (el && el.getAttribute) {
        var o = el.getAttribute('data-api-origin'); if (o) return o;
      }
      return new URL(document.currentScript.src).origin;
    } catch(e){ return location.origin; }
  })();
  var TRACK = ORIGIN + '/api/track';
  var ALLOC = ORIGIN + '/api/allocate';

  function qp(u,name){ try{ var url = new URL(u); return url.searchParams.get(name) || ''; } catch(e){ return ''; } }
  function readCookie(n){ return (document.cookie.split('; ').find(s=>s.startsWith(n+'='))||'').split('=')[1]||''; }
  function writeCookie(n,v,days){ try{ var d=new Date(); d.setTime(d.getTime()+days*864e5); document.cookie = n+'='+v+'; path=/; expires='+d.toUTCString(); }catch(e){} }
  function beacon(data){ try{ navigator.sendBeacon(TRACK, new Blob([JSON.stringify(data)], {type:'application/json'})); }catch(e){ fetch(TRACK, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(data), mode:'cors', credentials:'omit'}); } }

  function getSID(){ var sid = qp(location.href,'sid')||readCookie('sid')||localStorage.getItem('sid'); if(!sid){ sid = (crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)); } writeCookie('sid',sid,365); localStorage.setItem('sid',sid); return sid; }
  function getSticky(){ return localStorage.getItem('exp_'+EXP_ID+'_var') || readCookie('exp_'+EXP_ID+'_var') || ''; }
  function setSticky(name){ localStorage.setItem('exp_'+EXP_ID+'_var', name); writeCookie('exp_'+EXP_ID+'_var', name, 365); }

  function safeRedirect(url, params){ try{
    var last = Number(sessionStorage.getItem('ab_last_redirect')||'0');
    if(Date.now() - last < 3000) return; // debounce loop
    sessionStorage.setItem('ab_last_redirect', String(Date.now()));
    var dst = new URL(url, location.href);
    if(params){ Object.keys(params).forEach(function(k){ dst.searchParams.set(k, String(params[k])); }); }
    location.replace(dst.toString());
  }catch(e){}
  }

  var sid = getSID();
  var sticky = getSticky();
  var v = qp(location.href,'v') || sticky;
  if(v) setSticky(v);

  var onEntry = ENTRY_URL && location.href.indexOf(ENTRY_URL) === 0;
  var doGate = onEntry && !sticky; // gate on entry only for new sessions

  function afterAssigned(name,url){ setSticky(name); beacon({ type:'pageview', experimentId: EXP_ID, variantName: name, sid: sid, ts: Date.now(), currentUrl: location.href, ref: document.referrer, props: { source:'embed' } }); }

  if(doGate){
    var u = new URL(ALLOC); u.searchParams.set('experimentId', String(EXP_ID)); u.searchParams.set('sid', sid); u.searchParams.set('current', location.href);
    fetch(u.toString(), { method:'GET', mode:'cors', credentials:'omit' }).then(function(r){ return r.json(); }).then(function(resp){
      try{
        var assigned = resp && resp.assignedVariant; if(!assigned) return;
        var name = assigned.name; var url = assigned.url;
        setSticky(name);
        if(url && url !== location.href){ safeRedirect(url, { v:name, sid:sid, exp:EXP_ID }); return; }
        afterAssigned(name, url||location.href);
      }catch(e){}
    }).catch(function(){ /* ignore */ });
  } else {
    var name = (v||'A'); afterAssigned(name, location.href);
  }

  // Click & Conversion tracking
  document.addEventListener('click', function(e){ var el = e.target; if(el && el.closest) el = el.closest('[data-track]'); if(!el) return; var name = el.getAttribute('data-track')||'click'; beacon({ type:'click', experimentId: EXP_ID, variantName: getSticky()||'A', sid: sid, ts: Date.now(), currentUrl: location.href, ref: document.referrer, props: { name:name } }); }, true);
  document.addEventListener('submit', function(e){ var f = e.target; if(!(f instanceof HTMLFormElement)) return; if(!f.hasAttribute('data-conversion-form')) return; beacon({ type:'conversion', experimentId: EXP_ID, variantName: getSticky()||'A', sid: sid, ts: Date.now(), currentUrl: location.href, ref: document.referrer, props: { form: f.getAttribute('name')||'' } }); }, true);
})();
`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
