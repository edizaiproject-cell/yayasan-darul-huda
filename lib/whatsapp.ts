export const defaultWhatsappMessage = "Assalamu'alaikum Admin Ma’had Al-Qur’an Darul Huda, saya ingin mendapatkan informasi mengenai Darul Huda.";
export function normalizeWhatsapp(value: unknown): string {
 const raw=String(value||'').trim();
 if(!raw)return '';
 if(!/^[+\d\s()\-]+$/.test(raw))throw new Error('Nomor WhatsApp tidak valid.');
 let number=raw.replace(/\D/g,'');
 if(number.startsWith('0'))number='62'+number.slice(1);
 else if(number.startsWith('8'))number='62'+number;
 if(!/^\d{8,15}$/.test(number))throw new Error('Nomor WhatsApp harus berisi 8–15 angka dengan kode negara.');
 return number;
}
export function whatsappLink(settings:Record<string,any>): string|null {
 if(!settings.whatsappEnabled)return null;
 try {const number=normalizeWhatsapp(settings.whatsapp);return number?'https://wa.me/'+number+'?text='+encodeURIComponent(settings.whatsappMessage??defaultWhatsappMessage):null;}catch{return null;}
}
