import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {readPdfResponse} from '../lib/pdf-download.ts';
const temporary=mkdtempSync(join(tmpdir(),'dh-pdf-'));process.env.DARUL_HUDA_DB=join(temporary,'pdf.sqlite');
const {receiptPdf,donationReportPdf,donorReportPdf}=await import('../lib/donation-documents.ts');
const {officialPdf,pdfFilename}=await import('../lib/official-pdf.ts');
const d=await import('../lib/database.ts'),{handle}=await import('../lib/api.ts');
const institution={name:'Lembaga Pendidikan Al-Qur’an',logo:'/media/image1.png',address:'Jalan Pendidikan No. 10, Payakumbuh, Sumatera Barat',phone:'0752 123456',whatsapp:'081234567890',email:'sekretariat@example.test',website:'https://example.test',pdfPlace:'Payakumbuh',pdfSignerName:'Abdullah Rahman',pdfSignerRole:'Bendahara'};
const receipt={receipt_number:'KWT-DON-20261004-00001',transaction_code:'DON-20261004-00001',date:'2026-10-04',donor_name:'Ahmad Mu’min — Éléonore',donor_phone:'081234567890',program:'Pembangunan Asrama dan Pendidikan Al-Qur’an',amount:1500000,bank:'BSI',number:'9005559930',status:'valid',verified_at:'2026-10-04T05:00:00Z',institution};
test('receipt, donation list and donor list render A4 with embedded fonts and multipage reports',async()=>{
 const rows=Array.from({length:45},(_,i)=>({...receipt,id:String(i),donor_name:i===1?'عبد الله':receipt.donor_name,amount:200000+i*10000,name:receipt.donor_name,phone:receipt.donor_phone,category:'Donatur Tetap',created_at:receipt.date,total:receipt.amount}));
 const data={rows,count:rows.length,total:rows.reduce((n,r)=>n+r.amount,0),labels:['Mulai: 2026-10-01','Sampai: 2026-10-31']};
 const outputs=[['kuitansi.pdf',await receiptPdf(receipt)],['daftar-donasi.pdf',await donationReportPdf(data,institution)],['daftar-donatur.pdf',await donorReportPdf(data,institution)]] as const;
 mkdirSync(resolve('tmp/pdfs'),{recursive:true});
 for(const [name,bytes] of outputs){assert.equal(bytes.subarray(0,5).toString(),'%PDF-');const pdf=await PDFDocument.load(bytes);const pages=pdf.getPages();assert.ok(pages.length>=(name==='kuitansi.pdf'?1:2));assert.ok(pages[0].getWidth()>(name==='kuitansi.pdf'?590:840));writeFileSync(resolve('tmp/pdfs',name),bytes);}
});
test('missing, invalid and omitted optional logo/contact fields do not block generation',async()=>{
 for(const logo of ['', '/media/missing-logo.png','/media/fonts/OFL-NotoNaskhArabic.txt','https://untrusted.example/logo.svg']){
  const bytes=await receiptPdf(receipt,{name:institution.name,logo});assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
 }
 assert.equal((await receiptPdf(receipt,{logo:''})).subarray(0,5).toString(),'%PDF-');
 const cwd=process.cwd();try{process.chdir(temporary);await assert.rejects(()=>officialPdf({name:'Lembaga'},'Uji',false,()=>{}),/Font template PDF tidak ditemukan/)}finally{process.chdir(cwd)}
});
test('browser download checks the response and honors recognizable Unicode filenames',async()=>{
 assert.equal(pdfFilename('receipt','Ahmad','2026-10-04'),'Kuitansi-Donasi-Ahmad-04-10-2026.pdf');
 const ok=await readPdfResponse(new Response('%PDF-1.7 test',{headers:{'content-type':'application/pdf','content-disposition':"attachment; filename*=UTF-8''Kuitansi-Donasi-%C3%89mile.pdf"}}));assert.equal(ok.filename,'Kuitansi-Donasi-Émile.pdf');
 await assert.rejects(()=>readPdfResponse(Response.json({error:'PDF belum dapat dibuat.',details:'Nama lembaga belum diisi.',code:'PDF_INSTITUTION_NAME'},{status:422})),(e:any)=>e.details==='Nama lembaga belum diisi.'&&e.code==='PDF_INSTITUTION_NAME');
 await assert.rejects(()=>readPdfResponse(new Response('<html>Login</html>',{headers:{'content-type':'text/html'}})),(e:any)=>e.code==='PDF_RESPONSE_TYPE');
 await assert.rejects(()=>readPdfResponse(new Response('not a pdf',{headers:{'content-type':'application/pdf'}})),(e:any)=>e.code==='PDF_INVALID_FILE');
});
test('admin PDF route preserves authorization, privacy of public receipts and actionable errors',async()=>{
 d.initializeRoles();await d.createUser({email:'pdf@test.local',password:'PdfTests!2026',role_id:'Super Admin'},'test');
 const login=await handle(new Request('http://localhost/api/login',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({email:'pdf@test.local',password:'PdfTests!2026'})}));const cookie=login.headers.get('set-cookie')!.split(';')[0];
 const call=(path:string,session=cookie)=>handle(new Request('http://localhost/api/'+path,{headers:{cookie:session}}));
 const missing=await call('donations/missing/pdf');assert.equal(missing.status,404);assert.match((await missing.json()).details,/tidak ditemukan/);
 const config=d.saveRecord('site_settings',{...institution,title:institution.name,status:'published'},'test');
 const tx=d.saveRecord('donation_transactions',{title:'Uji PDF',status:'valid',kind:'Pemasukan',amount:200000,date:'2026-10-04',donor_name:'Nama Privat',donor_phone:'081363123456',anonymous:true},'test');
 const receiptRow=d.db.prepare('SELECT token FROM donation_receipts WHERE transaction_id=?').get(tx.id) as any;
 assert.equal((await call('donations/'+tx.id+'/pdf','')).status,401);
 const admin=await call('donations/'+tx.id+'/pdf');assert.equal(admin.status,200);assert.match(admin.headers.get('content-disposition')!,/Kuitansi-Donasi-Nama-Privat-04-10-2026/);
 const pub=await call('receipts/'+receiptRow.token+'/pdf','');assert.equal(pub.status,200);assert.match(pub.headers.get('content-disposition')!,/Hamba-Allah/);
 const publicData=await (await call('receipts/'+receiptRow.token,'')).json();assert.ok(!('donor_phone' in publicData));
 const inline=await call('donations/'+tx.id+'/pdf?view=1');assert.match(inline.headers.get('content-disposition')!,/^inline/);
 d.saveRecord('site_settings',{...config,name:''},'test');const emptyHeader=await call('donations/export?format=pdf');assert.equal(emptyHeader.status,200);assert.match(emptyHeader.headers.get('content-type')!,/application\/pdf/);
});
