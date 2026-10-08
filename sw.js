const CACHE="allenati-scemo-v27";
const CORE=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  // pagina: rete prima (così gli aggiornamenti arrivano), ma se la rete non risponde entro 2,5 s apre la copia salvata;
  // la risposta della rete, se arriva dopo, aggiorna comunque la copia per la prossima apertura
  if(req.mode==="navigate"){
    const net=fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put("index.html",c))}return r});
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
