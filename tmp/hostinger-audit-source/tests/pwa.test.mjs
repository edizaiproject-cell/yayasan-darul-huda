import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync('public/sw.js','utf8');
function setup(networkDown=false,origin='https://darul-huda.example'){const events={},entries=new Map(),pending=[];let response;const cache={addAll:async paths=>paths.forEach(p=>entries.set(p,new Response('<body>Offline</body>',{headers:{'Content-Type':'text/html'}}))),put:async (r,v)=>entries.set(typeof r==='string'?r:r.url,v),match:async r=>entries.get(typeof r==='string'?r:r.url)?.clone()};const context={self:{location:{origin},clients:{claim:async()=>{}},skipWaiting(){},addEventListener:(name,fn)=>events[name]=fn},caches:{open:async()=>cache,match:cache.match,keys:async()=>[],delete:async()=>true},URL,Response,Headers,fetch:async()=>{if(networkDown)throw Error('offline');return new Response('<body>Live public page</body>',{status:200,headers:{'Content-Type':'text/html'}})}};vm.runInNewContext(script,context);return {entries,pending,events,cache,dispatch(url,method='GET',mode='navigate'){response=undefined;const request={url:origin+url,method,mode};events.fetch({request,respondWith:p=>response=p,waitUntil:p=>pending.push(p)});return response;}};}
test('manifest includes installable PNG sizes, standalone display, actual icons',()=>{const m=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));assert.equal(m.display,'standalone');assert.equal(m.start_url,'/');for(const i of m.icons){const bytes=readFileSync('public'+i.src);assert.equal(bytes.readUInt32BE(16),Number(i.sizes.split('x')[0]));assert.equal(bytes.readUInt32BE(20),Number(i.sizes.split('x')[1]));}});
test('service worker never intercepts private API, admin, or writes',()=>{const sw=setup();for(const url of ['/api/me','/api/bootstrap','/api/private-media/a','/admin','/admin/users'])assert.equal(sw.dispatch(url),undefined);assert.equal(sw.dispatch('/berita','POST'),undefined);});
test('offline public page identifies cache timestamp; donations and agenda use fallback',async()=>{const sw=setup(true);await sw.cache.addAll(['/offline.html']);sw.entries.set('https://darul-huda.example/profil/tentang',new Response('<body>Profil tersimpan</body>',{headers:{'X-Darul-Huda-Cached-At':'2026-09-30T09:00:00Z'}}));const response=await sw.dispatch('/profil/tentang');const html=await response.text();assert.match(html,/Salinan offline/);assert.match(html,/WIB/);assert.equal(await (await sw.dispatch('/donasi')).text(),'<body>Offline</body>');assert.equal(await (await sw.dispatch('/informasi')).text(),'<body>Offline</body>');});
test('dynamic financial pages are not stored in cache',async()=>{const sw=setup();await sw.dispatch('/donasi');await Promise.all(sw.pending);assert.equal(sw.entries.size,0);await sw.dispatch('/pendidikan');await Promise.all(sw.pending);assert.ok(sw.entries.has('https://darul-huda.example/pendidikan'));});


test('local preview never returns a stale homepage when its server stops',async()=>{
 for(const origin of ['http://localhost:5174','http://127.0.0.1:5174']){
  const sw=setup(true,origin);
  await sw.cache.addAll(['/offline.html']);
  sw.entries.set(origin+'/',new Response('<body>Old homepage</body>'));
  assert.equal(await (await sw.dispatch('/')).text(),'<body>Offline</body>');
 }
});
test('local preview does not store homepage HTML',async()=>{
 const sw=setup(false,'http://127.0.0.1:5174');
 await sw.dispatch('/');await Promise.all(sw.pending);
 assert.equal(sw.entries.size,0);
});