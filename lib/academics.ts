export type AcademicRecord={id:string;title:string;level?:string;summary?:string;body?:string;image?:string;alt?:string;[key:string]:any};
export type Subject={id:string;name:string;category:string;icon:string;group:string;level:string;curriculum:string;description?:string;objectives?:string;classes?:string;topics?:string;workload?:string;document?:string};
const decode=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,v)=>{const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v);return n<=0x10ffff?String.fromCodePoint(n):''}).replace(/&(amp|nbsp|quot|apos|lt|gt);/g,(_,v)=>({amp:'&',nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>'}[v as string]||'')).replace(/\s+/g,' ').trim();
export function subjectStyle(name:string){const s=name.toLowerCase();if(/matematika/.test(s))return {category:'Umum',icon:'calculator'};if(/bahasa|b inggris|qiraah|hiwar|nahwu|muthalaah|nusus|mahfuzat|al\s*fiah|al\s*fiyah/.test(s))return {category:'Bahasa',icon:'globe'};if(/informatika|koding|komputer|artifisial/.test(s))return {category:'Sains & Teknologi',icon:'computer'};if(/pengetahuan alam|^ipa$|biologi|fisika|kimia/.test(s))return {category:'Sains & Teknologi',icon:'flask'};if(/seni|sbdp|kaligrafi|khaligrafi|tataboga|silat|olahraga|jasmani/.test(s))return {category:'Seni & Keterampilan',icon:/olahraga|jasmani|silat/.test(s)?'activity':'Tampilan'};if(/qur|tahfi|tahsin|tajwid|tauhid|ibadah|adab|akidah|akhlak|hadis|fiq|tafsir|sirah|agama islam/.test(s))return {category:'Keagamaan',icon:/qur|tahfi|tajwid/.test(s)?'quran':'book'};return {category:'Umum',icon:'book'};}
export function academicSubjects(record:AcademicRecord,includeHidden=false):Subject[]{
 if(Array.isArray(record.subjects))return record.subjects.filter((s:any)=>includeHidden||s.active!==false).map((s:any)=>({...s,level:record.level||record.title,curriculum:record.title}));
 const subjects:Subject[]=[],seen=new Set<string>();let group='';
 // Existing CMS stores each subject as a paragraph/list item. Preserve the source in the structure dialog.
 const entries=[...(record.body||'').matchAll(/<(p|li|h[2-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)].flatMap(m=>m[2].split(/<br\s*\/?\s*>/i)).map(decode);
 for(const text of entries){if(!text)continue;if(/^(mata pelajaran (wajib|pilihan)|muatan lokal|bidang mapel|kelompok .+)[:\s]*$/i.test(text)){group=text;continue;}if(text.length>180||/^(kurikulum|daftar mata pelajaran|struktur kurikulum)\b/i.test(text))continue;
 const key=text.toLocaleLowerCase('id-ID').replace(/^b\.? inggris$/,'bahasa inggris').replace(/\s+/g,' ').trim();if(seen.has(key))continue;seen.add(key);subjects.push({id:record.id+'-'+subjects.length,name:text,...subjectStyle(text),group,level:record.level||record.title,curriculum:record.title});}
 return subjects;
}
export function academicSearch(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('id-ID').replace(/[’‘'`-]/g,'').replace(/\s+/g,' ').trim();}
export function academicLink(value:unknown){return typeof value==='string'&&!/[\\\x00-\x1f]/.test(value)&&(/^(https?:\/\/)/i.test(value)||/^\/(?!\/)/.test(value))?value:undefined;}
export const ACADEMIC_CATEGORIES=['Umum','Keagamaan','Bahasa','Sains & Teknologi','Seni & Keterampilan'];
export const ACADEMIC_ICONS=['book','quran','calculator','globe','computer','flask','activity','Tampilan','pen'];
export function validateAcademicSubjects(value:unknown):any[]{
 if(!Array.isArray(value)||value.length>200)throw new Error('Maksimal 200 mata pelajaran per kurikulum.');
 const ids=new Set<string>(),names=new Set<string>();
 return value.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Data mata pelajaran tidak valid.');const result:Record<string,any>={};
 for(const [key,limit] of Object.entries({name:180,category:80,icon:40,group:120,description:5000,objectives:10000,classes:200,workload:200,topics:15000,document:500})){if(row[key]!=null&&typeof row[key]!=='string')throw new Error('Isi mata pelajaran harus berupa teks.');const text=String(row[key]||'').trim();if(text.length>limit)throw new Error(`Isian ${key} terlalu panjang.`);result[key]=text;}
 if(!result.name)throw new Error('Nama setiap mata pelajaran wajib diisi.');const name=academicSearch(result.name);if(names.has(name))throw new Error('Nama mata pelajaran tidak boleh berulang dalam satu kurikulum.');names.add(name);
 result.category=result.category||subjectStyle(result.name).category;result.icon=result.icon||subjectStyle(result.name).icon;
 if(!ACADEMIC_CATEGORIES.includes(result.category)||!ACADEMIC_ICONS.includes(result.icon))throw new Error('Kategori atau ikon mata pelajaran tidak valid.');
 if(result.document&&!/^\/(media|uploads)\/[\w.-]+\.pdf$/i.test(result.document))throw new Error('Pilih dokumen PDF dari Media Library.');
 result.id=String(row.id||crypto.randomUUID());if(!/^[\w-]{1,100}$/.test(result.id)||ids.has(result.id))throw new Error('ID mata pelajaran tidak valid atau berulang.');ids.add(result.id);
 if(row.active!==undefined&&typeof row.active!=='boolean')throw new Error('Status mata pelajaran tidak valid.');result.active=row.active!==false;return result;
 });
}
