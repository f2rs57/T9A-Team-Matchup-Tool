const VERSION='0.9.6', CACHE='t9a-shell-096-v1';
const VERSIONED=['style.css','app.js','pairing.css','pairing.js','pairing-engine.js','favicon.svg','apple-touch-icon.png'].map(f=>'./'+f+'?v='+VERSION);
const FILES=['./index.html',...VERSIONED,'./favicon.ico','./t9a-banner.png',...['BH','DL','DE','DH','EOS','HE','ID','KOE','OK','ONG','SA','SE','UD','VC','VS','WDG'].map(x=>'./emblems/'+x+'.webp')];
const URLS=new Set(FILES.map(f=>new URL(f,self.location.href).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(new URL(f,self.location.href),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('t9a-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-cache'}).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html'))));return;}
 if(URLS.has(e.request.url))e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));
});
