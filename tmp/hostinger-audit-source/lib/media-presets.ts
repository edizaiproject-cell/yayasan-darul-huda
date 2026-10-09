const officeTypes=['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
export const imageTypes=['image/jpeg','image/png','image/webp'];
const preset=(width:number,height:number,ratio:string,maxMB=10,extra='')=>({width,height,ratio,maxMB,types:imageTypes,extra});
export const mediaPresets={
 heroMobile:preset(1080,1350,'4:5'),
 hero:preset(1920,840,'16:7',10,'rasio lebar ±16:7'),
 bookCover:preset(1200,1600,'3:4',5),featured:preset(1600,900,'16:9'),thumbnail:preset(1200,675,'16:9',5),
 gallery:preset(1600,1200,'4:3'),profile:preset(1200,1200,'1:1',5),
 logo:{...preset(1200,1200,'1:1',2,'gunakan latar transparan'),types:['image/png','image/webp']},
 poster:preset(1080,1350,'4:5'),qr:preset(1000,1000,'1:1',5,'gunakan gambar tajam'),
 article:preset(1200,0,''),document:{...preset(0,0,'',10),types:['application/pdf']},
 newsCard:preset(1200,0,'',10,'Rekomendasi 1200 × 900 px (4:3) untuk memenuhi bingkai kartu. Gambar potret, persegi, dan lanskap tetap ditampilkan utuh tanpa dipotong; ruang kosong mengikuti rasio asli.'),
 officeDocument:{...preset(0,0,'',10),types:['application/pdf',...officeTypes]},
 proof:{...preset(0,0,'',5,'pertahankan seluruh bukti, tanpa crop'),types:[...imageTypes,'application/pdf']},
 library:{...preset(0,0,'',10,'rekomendasi mengikuti lokasi penggunaan'),types:[...imageTypes,'application/pdf',...officeTypes]}
};
export type MediaPurpose=keyof typeof mediaPresets;
export function mediaHint(purpose:MediaPurpose){const p=mediaPresets[purpose];const formats=p.types.map(t=>({'image/jpeg':'JPG','image/png':'PNG','image/webp':'WebP','application/pdf':'PDF','application/msword':'DOC','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'DOCX','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'XLSX'}[t])).join(', ');return `${formats} • maks. ${p.maxMB} MB`+(p.width?['article','newsCard'].includes(purpose)?' • Disarankan minimal 1200 px lebar':` • Disarankan ${p.width} × ${p.height} px${purpose==='hero'?'':` (${p.ratio})`}`:'')+(p.extra?` • ${p.extra}`:'');}
export function mediaPurpose(module:string,key:string,type='image'):MediaPurpose{
 if(module==='posts'&&key==='image')return 'newsCard';
 if(type==='document')return 'officeDocument';if(type==='file')return 'document';if(type==='privatefile')return 'proof';if(type==='photos')return 'gallery';
 if(/qr/i.test(key))return 'qr';if(/logo|favicon/i.test(key))return 'logo';
 if(/avatar|portrait|profile|speaker/i.test(key))return 'profile';if(/poster/i.test(key)||module==='agendas')return 'poster';
 if(module==='library_items'&&key==='image')return 'bookCover';if(module==='hero_slides')return key==='mobileImage'?'heroMobile':'hero';if(/thumbnail|ogImage/i.test(key))return 'thumbnail';return 'featured';
}
export function validateMedia(file:{type:string;size:number},purpose:MediaPurpose){const p=mediaPresets[purpose];if(!p)throw new Error('Fungsi media tidak valid.');if(!p.types.includes(file.type))throw new Error(`Format tidak sesuai. ${mediaHint(purpose)}`);if(!file.size||file.size>p.maxMB*1024*1024)throw new Error(`Ukuran berkas maksimal ${p.maxMB} MB.`);}
export function assessImage(width:number,height:number,purpose:MediaPurpose){const p=mediaPresets[purpose];return {mismatch:!!p.height&&Math.abs(width/height/(p.width/p.height)-1)>.15,small:!!p.width&&(width<p.width*.75||!!p.height&&height<p.height*.75)};}
export function originalMediaUrl(value:string){if(value.startsWith('/api/media-image?'))return new URL(value,'http://local').searchParams.get('src')||'';return value.split('#')[0];}
export function imagePosition(value:string){const q=new URL(value||'/', 'http://local').searchParams;return `${Number(q.get('fx')??50)}% ${Number(q.get('fy')??50)}%`;}
export function imageVariant(value:string,purpose:MediaPurpose,crop?:{x:number;y:number;w:number;h:number},focus?:{x:number;y:number}){const q=new URLSearchParams({src:originalMediaUrl(value),purpose});if(crop)for(const [k,v] of Object.entries(crop))q.set(k,String(Math.round(v*100000)/100000));if(focus){q.set('fx',String(focus.x));q.set('fy',String(focus.y));}return '/api/media-image?'+q;}
