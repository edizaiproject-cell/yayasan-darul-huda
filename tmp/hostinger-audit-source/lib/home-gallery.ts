import {originalMediaUrl} from './media-presets.ts';

type Album={id:string;slug:string;title:string;status:string;category?:string;unitId?:string;image?:string;alt?:string;photos?:{url:string;alt?:string;caption?:string}[];publishAt?:string;date?:string;created_at?:string;showOnHome?:boolean;showWebsite?:boolean;showPublic?:boolean};
export type HomeGalleryPhoto={id:string;image:string;alt:string;title:string;category:string;href:string;source?:'gallery'|'news';publishedAt?:string};

/** Read the existing album photos; interleave pairs without copying stored data. */
export function homeGalleryPhotos(albums:Album[],units:{id:string;title:string}[]=[]):HomeGalleryPhoto[]{
 const seen=new Set<string>();
 const queues=albums.filter(a=>['published','active'].includes(a.status)&&a.showOnHome!==false&&a.showWebsite!==false&&a.showPublic!==false)
  .slice().sort((a,b)=>String(b.publishAt||b.date||b.created_at||'').localeCompare(String(a.publishAt||a.date||a.created_at||'')))
  .map(album=>{
   const photos=album.photos?.length?album.photos:album.image?[{url:album.image,alt:album.alt}]:[];
   return photos.flatMap((photo,index)=>{
    if(!photo.url)return [];
    const source=originalMediaUrl(photo.url);
    if(!/^\/(media|uploads)\/[\w.-]+\.(png|jpe?g|webp)$/i.test(source)||seen.has(source))return [];
    seen.add(source);
    return [{id:`${album.id}-${index}`,image:photo.url,alt:photo.alt||photo.caption||`${album.title} — foto ${index+1}`,title:album.title,category:album.category||units.find(u=>u.id===album.unitId)?.title||'',href:`/galeri/${album.slug}${album.photos?.length?'#foto-'+(index+1):''}`}];
   });
  });
 const result:HomeGalleryPhoto[]=[];
 for(let offset=0;queues.some(q=>q.length>offset);offset+=2){
  for(const queue of queues)result.push(...queue.slice(offset,offset+2));
 }
 return result;
}

type News=Omit<Album,'unitId'> & {categoryId?:string;deleted_at?:string|null;startsAt?:string;endsAt?:string};
const mediaKey=(url:string)=>originalMediaUrl(url).split(/[?#]/)[0];
const localPhoto=(url:string)=>/^\/(media|uploads)\/[\w.-]+\.(png|jpe?g|webp)$/i.test(mediaKey(url));
const timestamp=(value:string)=>Date.parse(value)||0;

/** Virtual feed, rebuilt from public records without file copies or stored snapshots. */
export function getHomepageGalleryFeed({galleries=[],posts=[],units=[],categories=[],now=Date.now()}:{
 galleries:Album[];posts:News[];units?:{id:string;title:string}[];categories?:{id:string;title:string}[];now?:number;
}):HomeGalleryPhoto[]{
 const visible=(row:News)=>!row.deleted_at&&row.showPublic!==false&&row.showWebsite!==false
  &&(!row.publishAt||Date.parse(row.publishAt)<=now)
  &&(!row.startsAt||Date.parse(row.startsAt)<=now)&&(!row.endsAt||Date.parse(row.endsAt)>now)
  &&(['published','active'].includes(row.status)||(row.status==='scheduled'&&!!row.publishAt&&Date.parse(row.publishAt)<=now));
 const candidates:HomeGalleryPhoto[]=[];
 for(const album of galleries.filter(visible)){
  const date=album.publishAt||album.date||album.created_at||'';
  candidates.push(...homeGalleryPhotos([{...album,status:'published'}],units).map(photo=>({...photo,id:'gallery-'+photo.id,source:'gallery' as const,publishedAt:date})));
 }
 for(const post of posts.filter(post=>['published','scheduled'].includes(post.status)&&visible(post))){
  const photos=[...(post.image?[{url:post.image,alt:post.alt}]:[]),...(post.photos||[])];
  const seen=new Set<string>();let count=0;
  for(const [index,photo] of photos.entries()){
   if(!photo.url||!localPhoto(photo.url)||seen.has(mediaKey(photo.url)))continue;
   seen.add(mediaKey(photo.url));
   candidates.push({id:`news-${post.id}-${index}`,source:'news',image:photo.url,alt:photo.alt||post.title,title:post.title,
    category:categories.find(category=>category.id===post.categoryId)?.title||post.category||'Berita',
    href:'/berita/'+post.slug,publishedAt:post.publishAt||post.created_at||''});
   if(++count===3)break;
  }
 }
 // Latest use of a shared file wins, including crop/thumbnail references.
 candidates.sort((a,b)=>timestamp(b.publishedAt||'')-timestamp(a.publishedAt||''));
 const seen=new Set<string>();
 const pending=candidates.filter(photo=>{const key=mediaKey(photo.image);if(seen.has(key))return false;seen.add(key);return true;});
 const result:HomeGalleryPhoto[]=[];let run=0,last:HomeGalleryPhoto['source'];
 while(pending.length){
  const alternate=run>=4?pending.findIndex(photo=>photo.source!==last):-1;
  const [photo]=pending.splice(alternate>=0?alternate:0,1);
  run=photo.source===last?run+1:1;last=photo.source;result.push(photo);
 }
 return result;
}
