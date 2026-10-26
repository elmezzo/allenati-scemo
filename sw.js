const CACHE="allenati-scemo-v57";
const CORE=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png","icons/icon-maskable-512.png"];
const isFont=u=>/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(new URL(u).hostname);
// I font (foglio di Google Fonts e file woff2) non sono in CORE: si copiano dalle cache vecchie prima che activate le cancelli,
// così la prima apertura offline dopo un aggiornamento ha ancora i font. Se la copia non riesce l'installazione va avanti lo stesso
async function keepFonts(c){for(const k of await caches.keys()){if(k===CACHE)continue;const o=await caches.open(k);for(const r of await o.keys())if(isFont(r.url)&&!(await c.match(r))){const hit=await o.match(r);if(hit)await c.put(r,hit)}}}
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).then(()=>keepFonts(c).catch(()=>{}))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  // pagina: rete prima, senza la cache del browser (così gli aggiornamenti arrivano subito), ma se la rete non risponde entro 2,5 s apre la copia salvata;
  // la risposta della rete, se arriva dopo, aggiorna comunque la copia per la prossima apertura
  if(req.mode==="navigate"){
    const net=fetch(req,{cache:"no-store"}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put("index.html",c))}return r});
    e.waitUntil(net.catch(()=>{}));
    e.respondWith(new Promise(res=>{let done=false;const fin=r=>{if(!done&&r){done=true;res(r)}};
      const t=setTimeout(()=>caches.match("index.html").then(hit=>{if(hit)fin(hit)}),2500);
      net.then(r=>{clearTimeout(t);fin(r)}).catch(()=>{clearTimeout(t);caches.match("index.html").then(hit=>fin(hit||Response.error()))})}));
    return}
  // font e file statici: cache prima
  if(url.origin===location.origin||url.hostname.endsWith("fonts.googleapis.com")||url.hostname.endsWith("fonts.gstatic.com")){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c));return r})));
  }
});
