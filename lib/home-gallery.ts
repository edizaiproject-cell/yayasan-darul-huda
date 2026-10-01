import {originalMediaUrl} from './media-presets.ts';

type Album={id:string;slug:string;title:string;status:string;category?:string;unitId?:string;image?:string;alt?:string;photos?:{url:string;alt?:string;caption?:string}[];publishAt?:string;date?:string;created_at?:string;showOnHome?:boolean;showWebsite?:boolean;showPublic?:boolean};
export type HomeGalleryPhoto={id:string;image:string;alt:string;title:string;category:string;href:string};

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
