import {normalizeDocumentSettings,documentKinds,type DocumentKind} from './document-template.ts';
import {documentProfile} from './document-settings.ts';
import {receiptPdf,donationReportPdf,donorReportPdf} from './donation-documents.ts';
import {officialPdf,officialTable,officialApproval} from './official-pdf.ts';
export async function documentPreview(input:any,kind:DocumentKind){
 if(!documentKinds.includes(kind))throw new Error('Jenis preview tidak dikenal.');
 const institution={...documentProfile(),documentSettings:normalizeDocumentSettings(input)},date='2026-10-04';
 const receipt={receipt_number:'CONTOH-001',transaction_code:'PREVIEW-001',date,donor_name:'Donatur Contoh',donor_phone:'080000000000',program:'Program Pendidikan (Contoh)',amount:150000,bank:'Bank Contoh',number:'0000000000',status:'valid'};
 if(kind==='receipt')return receiptPdf(receipt,institution);
 const data={date,rows:Array.from({length:3},(_,i)=>({...receipt,donor_name:'Donatur Contoh '+(i+1),name:'Donatur Contoh '+(i+1),phone:receipt.donor_phone,category:'Donatur Tetap',created_at:date,total:150000})),count:3,total:450000,labels:['Data contoh — bukan transaksi asli']};
 if(kind==='donors')return donorReportPdf(data,institution);
 if(kind==='report'||kind==='transactions')return donationReportPdf(data,institution,kind);
 return officialPdf(institution,'CONTOH DOKUMEN',false,async(doc,header)=>{doc.font('Bold').fontSize(16).text('CONTOH DOKUMEN');doc.font('Body').fontSize(9).text('Data contoh — bukan transaksi asli');doc.y+=18;await officialTable(doc,header,['No','Uraian','Keterangan'],[35,300,176.28],[['1','Kegiatan contoh','Dokumen administrasi']]);await officialApproval(doc,header,institution,date,'other');},'other');
}
