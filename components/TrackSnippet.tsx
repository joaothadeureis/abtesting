import React from "react";

export default function TrackSnippet({ experimentId }: { experimentId: number }) {
  const code = `
  (function(){
    var expId = ${experimentId};
    function qp(name){
      try { var u = new URL(window.location.href); return u.searchParams.get(name) || ""; } catch(e) { return ""; }
    }
    function post(data){
      try {
        navigator.sendBeacon('/api/track', new Blob([JSON.stringify(data)], {type:'application/json'}));
      } catch(e) {
        fetch('/api/track', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(data)});
      }
    }

    var sid = qp('sid') || localStorage.getItem('sid');
    if (!sid) { sid = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)); }
    localStorage.setItem('sid', sid);

    var v = qp('v') || localStorage.getItem('exp_' + expId + '_var');
    if (!v) v = 'A';
    localStorage.setItem('exp_' + expId + '_var', v);

    // Pageview
    post({ type: 'pageview', experimentId: expId, variantName: v, sid: sid, ts: Date.now(), props: { source: 'client' } });

    // Track clicks
    document.addEventListener('click', function(e){
      var el = e.target;
      if (!el) return;
      if (el.closest) el = el.closest('[data-track]');
      if (!el) return;
      var name = el.getAttribute('data-track') || 'click';
      post({ type: 'click', experimentId: expId, variantName: v, sid: sid, ts: Date.now(), props: { name: name } });
    }, true);

    // Conversion on form submit
    document.addEventListener('submit', function(e){
      var form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.hasAttribute('data-conversion-form')) return;
      post({ type: 'conversion', experimentId: expId, variantName: v, sid: sid, ts: Date.now(), props: { form: form.getAttribute('name') || '' } });
    }, true);
  })();
  `.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

