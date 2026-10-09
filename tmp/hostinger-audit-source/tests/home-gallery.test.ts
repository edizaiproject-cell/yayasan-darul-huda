import test from 'node:test';
import assert from 'node:assert/strict';
import {homeGalleryPhotos} from '../lib/home-gallery.ts';
const album=(id:string,date:string,count:number)=>({id,slug:id,title:id,status:'published',date,photos:Array.from({length:count},(_,i)=>({url:`/media/${id}-${i}.webp`,caption:`${id} photo ${i}`}))});
test('homepage uses all photos, newest album first, interleaved in pairs with original anchors',()=>{
 const albums=[album('old','2026-09-01',3),album('new','2026-10-01',5)];
 const before=JSON.stringify(albums),photos=homeGalleryPhotos(albums);
 assert.deepEqual(photos.map(p=>p.id),['new-0','new-1','old-0','old-1','new-2','new-3','old-2','new-4']);
 assert.equal(photos[6].href,'/galeri/old#foto-3');
 assert.equal(photos[0].alt,'new photo 0');
 assert.equal(JSON.stringify(albums),before);
});
test('draft, hidden and duplicate media are excluded; deletions and publication follow source data',()=>{
 const first=album('one','2026-10-01',2),draft={...album('draft','2026-10-02',2),status:'draft'};
 const duplicate={...album('two','2026-09-01',1),photos:[{url:'/api/media-image?src=%2Fmedia%2Fone-0.webp&purpose=gallery'}]};
 assert.equal(homeGalleryPhotos([first,draft,duplicate,{...album('hidden','2026-10-01',1),showOnHome:false}]).length,2);
 first.photos.pop();draft.status='published';
 assert.equal(homeGalleryPhotos([first,draft]).length,3);
});
test('legacy cover is fallback only, invalid images are omitted and unit names resolve',()=>{
 const base={...album('one','2026-10-01',2),image:'/media/cover.webp',unitId:'unit'};
 assert.ok(homeGalleryPhotos([base]).every(p=>p.image!==base.image));
 const photos=homeGalleryPhotos([{...base,photos:[]}],[{id:'unit',title:'RTQ'}]);
 assert.equal(photos[0].image,base.image);assert.equal(photos[0].category,'RTQ');assert.equal(photos[0].href,'/galeri/one');
 assert.equal(homeGalleryPhotos([{...base,photos:[{url:''},{url:'broken'}]}]).length,0);
 assert.deepEqual(homeGalleryPhotos([]),[]);
});


import {getHomepageGalleryFeed} from '../lib/home-gallery.ts';
const now=Date.parse('2026-10-02T12:00:00Z');
const news=(id='news')=>({id,slug:id,title:'Prestasi Santri',status:'published',publishAt:'2026-10-01T10:00:00Z',image:'/media/'+id+'.webp',categoryId:'prestasi',photos:[] as {url:string;alt?:string}[]});
const feed=(posts:ReturnType<typeof news>[],galleries:ReturnType<typeof album>[]=[])=>getHomepageGalleryFeed({posts,galleries,now,categories:[{id:'prestasi',title:'Prestasi'}]});
test('news main photo then official documentation, maximum three unique local photos with source routes and labels',()=>{
 const post={...news(),alt:'Santri menerima penghargaan',photos:[{url:'/media/news.webp'},{url:'/media/doc1.webp',alt:'Dokumentasi'},{url:'https://example.com/external.jpg'},{url:'/media/doc2.webp'},{url:'/media/doc3.webp'}]};
 const before=JSON.stringify(post),items=feed([post]);
 assert.deepEqual(items.map(p=>p.image),['/media/news.webp','/media/doc1.webp','/media/doc2.webp']);
 assert.equal(items[0].alt,post.alt);assert.equal(items[2].alt,post.title);
 assert.ok(items.every(p=>p.source==='news'&&p.category==='Prestasi'&&p.href==='/berita/news'&&p.title===post.title));
 assert.equal(JSON.stringify(post),before);
 assert.deepEqual(feed([{...news(),image:''}]),[]);
 assert.deepEqual(feed([{...news(),image:'/media/icon.svg'}]),[]);
});
test('publication lifecycle and photo changes are reflected on every feed read',()=>{
 const post=news();post.status='draft';assert.equal(feed([post]).length,0);
 post.status='published';assert.equal(feed([post]).length,1);
 post.image='/uploads/replacement.png';assert.equal(feed([post])[0].image,post.image);
 post.image='';assert.equal(feed([post]).length,0);
 post.image='/media/news.webp';post.status='archived';assert.equal(feed([post]).length,0);
 assert.equal(feed([]).length,0);
 for(const override of [{status:'active'},{status:'deleted'},{deleted_at:'2026-10-01'},{showPublic:false},{showWebsite:false},{status:'scheduled',publishAt:'2026-10-03'},{publishAt:'2026-10-03'}])assert.equal(feed([{...news(),...override}]).length,0);
 assert.equal(feed([{...news(),status:'scheduled',publishAt:'2026-10-01'}]).length,1);
});
test('combined feed sorts by publication date and deduplicates original paths across sources',()=>{
 const gallery={...album('album','2026-09-01',2),photos:[{url:'/api/media-image?src=%2Fmedia%2Fnews.webp&purpose=gallery'},{url:'/media/unique.webp'}]};
 const items=feed([news()],[gallery]);
 assert.equal(items.length,2);assert.equal(items[0].source,'news');
 assert.equal(items[1].href,'/galeri/album#foto-2');
 assert.equal(items[1].source,'gallery');assert.equal(new Set(items.map(p=>p.id)).size,items.length);
 assert.equal(feed([{...news(),image:'/media/unique.webp?v=2'}],[gallery]).filter(p=>p.image.includes('unique')).length,1);
});
test('feed is not capped at ten and inserts another source after four consecutive items when available',()=>{
 const posts=Array.from({length:15},(_,i)=>({...news('news'+i),publishAt:new Date(now-i*1000).toISOString()}));
 const items=feed(posts,[album('old','2026-09-01',3)]);
 assert.equal(items.length,18);assert.equal(items[0].id,'news-news0-0');assert.equal(items[4].source,'gallery');assert.equal(items[9].source,'gallery');
 assert.equal(items.filter(p=>p.source==='gallery').length,3);
});
