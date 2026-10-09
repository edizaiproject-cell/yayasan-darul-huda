import test from 'node:test';
import assert from 'node:assert/strict';
import {shareLinks} from '../lib/share-links.ts';

test('share destinations preserve the active URL, Indonesian title and reserved characters',()=>{
 const title='Ilmu & Al-Qur’an #1 — Darul Huda',url='https://darulhuda.test/berita/kabar?asal=beranda&hal=2#isi';
 const links=Object.fromEntries(shareLinks(title,url).map(r=>[r.platform,new URL(r.href)]));
 assert.equal(links.whatsapp.searchParams.get('text'),title+' '+url);
 assert.equal(links.facebook.searchParams.get('u'),url);
 for(const platform of ['twitter','telegram']){assert.equal(links[platform].searchParams.get('url'),url);assert.equal(links[platform].searchParams.get('text'),title)}
 assert.equal(links.email.protocol,'mailto:');assert.equal(links.email.searchParams.get('subject'),title);assert.equal(links.email.searchParams.get('body'),url);
 assert.ok(shareLinks('Artikel berikutnya','https://darulhuda.test/berita/baru').every(r=>!r.href.includes('kabar')));
});
