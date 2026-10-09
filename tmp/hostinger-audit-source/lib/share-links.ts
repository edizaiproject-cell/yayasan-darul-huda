export function shareLinks(title:string,url:string){
 const text=encodeURIComponent(title),link=encodeURIComponent(url);
 return [
  {platform:'whatsapp',label:'Bagikan ke WhatsApp',href:'https://wa.me/?text='+encodeURIComponent(title+' '+url)},
  {platform:'facebook',label:'Bagikan ke Facebook',href:'https://www.facebook.com/sharer/sharer.php?u='+link},
  {platform:'twitter',label:'Bagikan ke X',href:'https://twitter.com/intent/tweet?text='+text+'&url='+link},
  {platform:'telegram',label:'Bagikan ke Telegram',href:'https://t.me/share/url?url='+link+'&text='+text},
  {platform:'email',label:'Kirim lewat Email',href:'mailto:?subject='+text+'&body='+link},
 ];
}
