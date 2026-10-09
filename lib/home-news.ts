type Row=Record<string,any>;

/** Public posts are supplied by the existing website data loader. */
export function latestHomeNews(posts:Row[]):Row[]{
 return posts.filter(r=>r.showOnHome!==false&&r.showWebsite!==false&&r.showPublic!==false)
  .slice().sort((a,b)=>newsTimestamp(b)-newsTimestamp(a)).slice(0,5);
}
function newsTimestamp(row:Row){return Date.parse(row.publishAt||row.created_at||'')||0;}
export function newsExcerpt(row:Row,max=130):string{
 const plain=(value:unknown)=>String(value||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ')
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,v)=>{const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v);return n<=0x10ffff?String.fromCodePoint(n):'';})
  .replace(/&(amp|nbsp|quot|apos|lt|gt|mdash|ndash|hellip);/g,(_,v)=>({amp:'&',nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>',mdash:'—',ndash:'–',hellip:'…'}[v as string]||''))
  .replace(/\s+/g,' ').trim();
 const text=plain(row.summary)||plain(row.excerpt)||plain(row.body);
 if(text.length<=max)return text;
 const cut=text.slice(0,max-1),space=cut.lastIndexOf(' ');
 return cut.slice(0,space>max*.65?space:cut.length).trimEnd()+'…';
}
export function newsDate(row:Row){
 const value=row.publishAt||row.created_at;
 const timestamp=Date.parse(value||'');
 return Number.isFinite(timestamp)?{iso:new Date(timestamp).toISOString(),label:new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(timestamp)}:null;
}
