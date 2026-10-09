import test from 'node:test';
import assert from 'node:assert/strict';
import {latestHomeNews,newsExcerpt,newsDate} from '../lib/home-news.ts';

test('homepage selects five newest eligible posts without mutating source or honoring pinned order',()=>{
 const posts=Array.from({length:8},(_,i)=>({id:i,publishAt:`2026-09-${String(i+10).padStart(2,'0')}`,pinned:i===0}));
 assert.deepEqual(latestHomeNews([...posts,{id:10,publishAt:'2026-10-01',showOnHome:false}]).map(r=>r.id),[7,6,5,4,3]);
 assert.equal(posts[0].id,0);
 assert.equal(latestHomeNews(posts.slice(0,2)).length,2);
 assert.deepEqual(latestHomeNews([]),[]);
});
test('excerpt falls back to body, removes markup and truncates safely',()=>{
 assert.equal(newsExcerpt({summary:'<p> </p>',body:'<p>Belajar &amp; tumbuh</p><p>bersama.</p><script>bad()</script>'}),'Belajar & tumbuh bersama.');
 assert.equal(newsExcerpt({summary:'Ringkasan',body:'Isi'}),'Ringkasan');
 const short=newsExcerpt({body:'Kegiatan belajar bersama santri. '.repeat(20)});
 assert.ok(short.length<=130);assert.ok(short.endsWith('…'));assert.ok(!short.includes('<'));
});
test('publication dates use Jakarta and tolerate missing legacy dates',()=>{
 assert.equal(newsDate({publishAt:'2026-09-20T18:00:00Z'})?.label,'21 Sep 2026');
 assert.equal(newsDate({publishAt:'invalid'}),null);
 assert.equal(newsDate({}),null);
});
