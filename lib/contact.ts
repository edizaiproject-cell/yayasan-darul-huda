import {normalizeWhatsapp} from './whatsapp.ts';
type Row=Record<string,any>;
export const socialPlatforms=[['facebook','Facebook'],['instagram','Instagram'],['youtube','YouTube'],['tiktok','TikTok'],['twitter','X / Twitter'],['telegram','Telegram']] as const;
export function contactUrl(value:unknown){try{const url=new URL(String(value||'').trim());return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:''}catch{return '';}}
export function contactSocials(settings:Row){return socialPlatforms.flatMap(([platform,label])=>{const href=contactUrl(settings[platform]);return href?[{platform,label,href}]:[]});}
export function contactWhatsapp(settings:Row){try{const number=normalizeWhatsapp(settings.whatsapp);return number?'https://wa.me/'+number:''}catch{return '';}}
export function contactMap(settings:Row){
 const address=String(settings.address||'').trim(),query=[settings.name,address].filter(Boolean).join(', ');
 const href=contactUrl(settings.maps)||(address?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query):'');
 let embed='';const source=contactUrl(settings.mapsEmbed)||contactUrl(settings.maps);
 if(source){const url=new URL(source);if(['www.google.com','maps.google.com','www.google.co.id'].includes(url.hostname)&&url.pathname.startsWith('/maps/embed'))embed=url.href;}
 // A short Maps sharing link cannot be embedded directly. Use the saved address as a search preview.
 if(!embed&&address)embed='https://www.google.com/maps?q='+encodeURIComponent(query)+'&output=embed';
 return {href,embed,address};
}
export function validateContactSettings(settings:Row){
 for(const [key] of socialPlatforms)if(settings[key]&&!contactUrl(settings[key]))throw new Error('URL media sosial harus menggunakan HTTP atau HTTPS.');
 if(settings.maps&&!contactUrl(settings.maps))throw new Error('URL lokasi harus menggunakan HTTP atau HTTPS.');
 if(settings.mapsEmbed){const embed=contactMap({...settings,maps:'',address:''}).embed;if(!embed)throw new Error('Gunakan URL embed Google Maps (https://www.google.com/maps/embed...), bukan kode iframe.');}
}
