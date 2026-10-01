const CACHE='darul-huda-public-v2';
const LOCAL_PREVIEW=['localhost','127.0.0.1','[::1]'].includes(new URL(self.location.origin).hostname);
const SHELL=['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/media/image1.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>LOCAL_PREVIEW?self.skipWaiting():undefined)));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('darul-huda-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(/^\/(admin|api)(\/|$)/.test(u.pathname))return;
 const asset=/^\/(assets|icons|media)\//.test(u.pathname)||u.pathname==='/offline.html';
 const safePage=!LOCAL_PREVIEW&&(/^\/(profil|pendidikan|berita|galeri|pustaka)(\/|$)/.test(u.pathname)||u.pathname==='/');
 if(asset)e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(response=>{if(response.ok){const copy=response.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)));}return response})));
 else if(r.mode==='navigate')e.respondWith(fetch(r,{cache:'no-store'}).then(response=>{if(safePage&&response.ok){const h=new Headers(response.headers);h.set('X-Darul-Huda-Cached-At',new Date().toISOString());e.waitUntil(response.clone().arrayBuffer().then(body=>caches.open(CACHE).then(c=>c.put(r,new Response(body,{status:200,headers:h})))));}return response}).catch(async()=>{if(safePage){const cached=await caches.match(r);if(cached){const html=await cached.text();return new Response(html.replace(/<body\b[^>]*>/i,body=>body+'<div style="background:#fff0c7;padding:12px;text-align:center;font:14px system-ui">Salinan offline. Terakhir diperbarui: '+new Date(cached.headers.get('X-Darul-Huda-Cached-At')).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB</div>'),{headers:{'Content-Type':'text/html; charset=utf-8'}})}}return caches.match('/offline.html')}));
});
