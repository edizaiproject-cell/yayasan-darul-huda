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
