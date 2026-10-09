import {normalizeDocumentSettings,templateFor,institutionHeader,approvalDate,signerRows,type DocumentKind} from './document-template.ts';
import {originalMediaUrl} from './media-presets.ts';
import PDFDocument from 'pdfkit';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import sharp from 'sharp';
import {db} from './database.ts';

const fontkit=createRequire(import.meta.url)('fontkit');
export class PdfError extends Error {
 code:string;status:number;
 constructor(code:string,message:string,status=500){super(message);this.name='PdfError';this.code=code;this.status=status;}
}
export const pdfText=(v:unknown)=>String(v??'').normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
export function pdfDate(value:unknown,filename=false){const d=new Date(String(value||''));if(!Number.isFinite(d.getTime()))return filename?'Tanpa-Tanggal':'—';const p=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);return filename?p.replaceAll('/','-'):d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'});}
export const filePart=(v:unknown)=>pdfText(v).replace(/[^\p{L}\p{N}.-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,90)||'Tanpa-Nama';
export function pdfFilename(kind:string,value?:unknown,date?:unknown){return kind==='receipt'?`Kuitansi-Donasi-${filePart(value)}-${pdfDate(date,true)}.pdf`:`Daftar-${kind==='donors'?'Donatur':'Donasi'}-${filePart(value||'Semua-Periode')}.pdf`;}
export function reportPeriod(q:URLSearchParams){return [q.get('from')||q.get('registered_from'),q.get('to')||q.get('registered_to')].filter(Boolean).map(v=>pdfDate(v,true)).join('-sampai-')||'Semua-Periode';}
export function disposition(filename:string,inline=false){const ascii=filename.normalize('NFKD').replace(/[^\x20-\x7e]/g,'').replace(/["\\\r\n]/g,'');return `${inline?'inline':'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;}

export async function officialLogo(value:unknown):Promise<Buffer|null>{
 let url=originalMediaUrl(String(value||'')).split('?')[0];if(!/^\/(media|uploads)\/[\w.-]+$/.test(url))return null;
 try{
  const alias=db.prepare('SELECT m.url FROM media_aliases a JOIN media m ON m.id=a.media_id WHERE a.old_url=? AND m.private=0').get(url) as any;if(alias)url=alias.url;
  return await sharp(resolve('public','.'+url),{limitInputPixels:40000000}).rotate().resize({width:360,height:360,fit:'inside'}).png().toBuffer();
 }catch{return null;}
}
export async function officialPdf(institution:any,title:string,landscape:boolean,draw:(doc:PDFKit.PDFDocument,header:()=>void)=>Promise<void>|void,kind:DocumentKind='report'){
 const config=normalizeDocumentSettings(institution.documentSettings||{},institution),template=templateFor(config,kind),identity=institutionHeader(institution,template),name=pdfText(identity.name).trim();
 let regular:Buffer,arabic:Buffer,bold:Buffer;
 try{regular=readFileSync(resolve('assets/fonts/NotoSans.ttf'));arabic=readFileSync(resolve('assets/fonts/NotoNaskhArabic.ttf'));bold=readFileSync(resolve('assets/fonts/NotoSans-Bold.ttf'));}catch{throw new PdfError('PDF_FONT_MISSING','Font template PDF tidak ditemukan atau tidak dapat dibaca. Pulihkan font NotoSans, NotoSans-Bold, dan NotoNaskhArabic di assets/fonts.');}
 const logo=template.header.enabled?await officialLogo(identity.logo):null;
 let doc:PDFKit.PDFDocument;
 try{doc=new PDFDocument({size:'A4',layout:landscape?'landscape':'portrait',margin:42,bufferPages:true,font:regular as unknown as string,info:{Title:title,Creator:name}});doc.registerFont('Body',regular).registerFont('Bold',bold as any).registerFont('Arabic',arabic).font('Body');}catch(e:any){throw new PdfError('PDF_TEMPLATE','Template PDF gagal dimuat: '+pdfText(e.message).slice(0,180));}
 const chunks:Buffer[]=[];const result=new Promise<Buffer>((res,rej)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>res(Buffer.concat(chunks)));doc.on('error',rej)});
 // Attach immediately so a drawing exception never leaves an unhandled stream rejection.
 void result.catch(()=>{});
 const header=()=>{
  doc.x=42;doc.y=42;doc.font('Body').fillColor('#233b31');
  if(!template.header.enabled)return;
  const h=template.header,right=doc.page.width-42,compact=h.style!=='formal',size=h.style==='compact'?36:compact?42:62,x=logo?42+size+14:42,width=right-x;
  if(logo)doc.image(logo,42,42,{fit:[size,size],align:'center',valign:'center'});
  if(name)doc.font(/[\u0600-\u06ff]/.test(name)?'Arabic':'Bold').fontSize(h.style==='compact'?14:16).fillColor('#163c33').text(name,x,42,{width});
  doc.font('Body').fontSize(h.style==='compact'?8:9).fillColor('#3d5149');
  const lines=[identity.address,identity.phone&&'Telp/WhatsApp: '+identity.phone,identity.email&&'Email: '+identity.email,identity.website&&'Website: '+identity.website].filter(Boolean);
  for(const line of compact?(lines.length?[lines.join(' • ')]:[]):lines)doc.text(pdfText(line),x,doc.y+3,{width});
  const hasContent=!!(name||logo||lines.length);if(!hasContent){doc.x=42;doc.y=42;return;}
  const bottom=Math.max(logo?42+size:42,doc.y)+10,weight={thin:.5,medium:1,bold:1.5}[h.weight];
  if(h.line!=='none'){doc.lineWidth(weight).strokeColor('#355c4d').moveTo(42,bottom).lineTo(right,bottom).stroke();if(h.line==='double')doc.lineWidth(weight/2).moveTo(42,bottom+3).lineTo(right,bottom+3).stroke();}
  doc.font('Body').fillColor('#233b31');doc.x=42;doc.y=bottom+{tight:9,normal:18,wide:28}[h.spacing];
 };
 try{header();await draw(doc,header);const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(i);const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.font('Body').fontSize(8).fillColor('#62776c').text(`${title} | Halaman ${i+1} / ${pages.count}`,42,doc.page.height-29,{width:doc.page.width-84,lineBreak:false});doc.page.margins.bottom=bottom;}doc.end();return await result;}
 catch(e){doc.destroy();throw e;}
}

export async function officialTable(doc:PDFKit.PDFDocument,header:()=>void,labels:string[],widths:number[],rows:string[][],rightAligned:number[]=[]){
 const tableHead=()=>{const y=doc.y;doc.rect(42,y,doc.page.width-84,25).fill('#eaf1ed');let x=42;labels.forEach((label,i)=>{doc.font('Bold').fontSize(8).fillColor('#193d30').text(label,x+6,y+7,{width:widths[i]-12,lineBreak:false});x+=widths[i]});doc.font('Body');doc.y=y+25;};tableHead();
 if(!rows.length){doc.fontSize(10).text('Tidak ada data yang sesuai filter.',48,doc.y+18);return;}
 for(const row of rows){
  const cells=row.map(pdfText);doc.font('Body').fontSize(8);
  const heights=cells.map((c,i)=>{doc.font(/[\u0600-\u06ff]/.test(c)?'Arabic':'Body');return doc.heightOfString(c,{width:widths[i]-12})});
  const height=Math.max(29,...heights.map(h=>h+16));
  if(doc.y+height>doc.page.height-58){doc.addPage();header();tableHead();}
  // Extremely long legacy fields are kept readable without overflowing the page.
  const rowHeight=Math.min(height,doc.page.height-58-doc.y),y=doc.y;let x=42;
  cells.forEach((cell,i)=>{doc.font(/[\u0600-\u06ff]/.test(cell)?'Arabic':'Body').fontSize(8).fillColor('#243e32').text(cell,x+6,y+8,{width:widths[i]-12,height:rowHeight-14,ellipsis:true,align:rightAligned.includes(i)?'right':'left'});x+=widths[i]});
  doc.lineWidth(.3).strokeColor('#d6e1da').moveTo(42,y+rowHeight).lineTo(doc.page.width-42,y+rowHeight).stroke();doc.y=y+rowHeight;
 }
}
export async function officialApproval(doc:PDFKit.PDFDocument,header:()=>void,institution:any,date:unknown,kind:DocumentKind='report'){
 const config=normalizeDocumentSettings(institution.documentSettings||{},institution);if(!config[kind])return;
 const template=templateFor(config,kind),rows=signerRows(template),width=doc.page.width-84;
 const images=new Map<string,Buffer>();for(const p of template.signers)if(p.imageEnabled){const image=await officialLogo(p.image);if(image)images.set(p.id,image)}
 const stamp=template.stamp.enabled?await officialLogo(template.stamp.image):null;
 const dateLine=[template.city,approvalDate(date,template)].filter(Boolean).join(', ');
 const metrics=rows.map((row,rowIndex)=>{
  const columns=row[0].columns,slot=width/columns,block=slot-16;
  const idText=(p:typeof template.signers[number])=>p.identifier&&p.identifierType!=='hidden'?(p.identifierType==='Lainnya'?'':p.identifierType+': ')+p.identifier:'';
  const height=(value:string,font:string,size:number)=>{doc.font(/[\u0600-\u06ff]/.test(value)?'Arabic':font).fontSize(size);return value?doc.heightOfString(pdfText(value),{width:block}):0;};
  const roleHeight=Math.max(...row.map(p=>height(p.signer.role,'Body',9))),nameHeight=Math.max(...row.map(p=>height(p.signer.name,'Bold',10))),idHeight=Math.max(...row.map(p=>height(idText(p.signer),'Body',9)));
  const dateHeight=rowIndex===0&&dateLine?height(dateLine,'Body',9)+12:0,rowHeight=dateHeight+roleHeight+62+nameHeight+idHeight+32;
  return {row,slot,block,idText,roleHeight,nameHeight,idHeight,dateHeight,rowHeight:rowHeight+16};
 });
 const totalHeight=metrics.reduce((sum,m)=>sum+m.rowHeight,0);
 if(doc.y+totalHeight>doc.page.height-55&&rows.length>1){doc.addPage();header();}
 for(let rowIndex=0;rowIndex<metrics.length;rowIndex++){
  const {row,slot,block,idText,roleHeight,nameHeight,dateHeight,rowHeight}=metrics[rowIndex];
  if(doc.y+rowHeight>doc.page.height-55){doc.addPage();header();}
  const top=doc.y+16,y=top+dateHeight;
  if(dateHeight){const single=template.signers.length===1;doc.font('Body').fontSize(9).text(pdfText(dateLine),single?42+row[0].column*slot+8:42,top,{width:single?block:width,align:'center'});}
  for(const {signer:p,column} of row){const x=42+column*slot+8,align=template.layout==='auto'&&template.signers.length<=3?'center':p.position;
   doc.font(/[\u0600-\u06ff]/.test(p.role)?'Arabic':'Body').fontSize(9).text(pdfText(p.role),x,y,{width:block,align});
   const signature=images.get(p.id);if(signature)doc.image(signature,x,y+roleHeight+5,{fit:[block,48],align:align==='left'?undefined:align,valign:'center'});
   doc.font(/[\u0600-\u06ff]/.test(p.name)?'Arabic':'Bold').fontSize(10).text(pdfText(p.name),x,y+roleHeight+58,{width:block,align});
   if(idText(p))doc.font('Body').fontSize(9).text(pdfText(idText(p)),x,y+roleHeight+58+nameHeight+4,{width:block,align});
  }
  if(stamp){let x:number|undefined;const st=template.stamp,last=template.signers.at(-1)!;if(st.position==='last'){const p=row.find(p=>p.signer.id===last.id);if(p)x=42+p.column*slot+(slot-65)/2;}else if(rowIndex===0)x=st.position==='center'?42+(width-65)/2:42+({left:0,center:.5,right:1}[st.preset])*(width-65);if(x!==undefined){doc.save().opacity(.65).image(stamp,x,y+roleHeight+2,{fit:[65,50],align:'center',valign:'center'}).restore();}}
  doc.x=42;doc.y=top+rowHeight-16;
 }
}
export function pdfFailure(error:any){
 if(error instanceof PdfError)return {code:error.code,details:error.message};
 const message=String(error?.message||'');
 if(error?.status===404)return {code:'PDF_DATA_NOT_FOUND',details:/Kuitansi belum tersedia/.test(message)?message:'Data transaksi atau kuitansi tidak ditemukan.'};
 if(error?.status===401||error?.status===403)return {code:'PDF_PERMISSION',details:'Sesi tidak aktif atau akun tidak memiliki hak akses unduhan PDF. Masuk dengan akun pengelola Donasi.'};
 if(['EACCES','EPERM','EROFS'].includes(error?.code))return {code:'PDF_ACCESS',details:'Berkas pendukung PDF tidak dapat diakses. Periksa izin baca font/logo dan izin penyimpanan server.'};
 if(error?.code==='ENOENT')return {code:'PDF_ASSET_MISSING',details:'Berkas pendukung template PDF tidak ditemukan. Periksa font dan aset template pada server.'};
 if(error?.code==='MODULE_NOT_FOUND'||/standard-fonts|Cannot find module/.test(message))return {code:'PDF_LIBRARY',details:'Library atau font PDF gagal dimuat pada build produksi. Periksa dependensi PDFKit dan font template.'};
 if(/SQLITE|database/i.test(message))return {code:'PDF_QUERY',details:'Data laporan gagal dibaca dari database. Periksa koneksi database dan filter laporan.'};
 return {code:'PDF_GENERATION',details:'Proses PDF gagal saat merender dokumen. '+pdfText(message).replace(/[A-Z]:\\[^\n]+|\/(?:home|tmp|var|Users)\/[^\n]+/g,'[lokasi server]').slice(0,220)};
}
