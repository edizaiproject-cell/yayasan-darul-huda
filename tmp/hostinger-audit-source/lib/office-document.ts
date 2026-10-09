import JSZip from 'jszip';
export const officeTypes:Record<string,string>={'.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
export async function inspectOfficeDocument(bytes:Buffer,extension:string){
 if(!officeTypes[extension])return '';
 if(extension==='.doc'){
  if(bytes.length<512||!bytes.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex'))||!bytes.includes(Buffer.from('WordDocument','utf16le')))throw new Error('Dokumen Word tidak valid.');
 }else{
  try{
   const zip=await JSZip.loadAsync(bytes),files=Object.values(zip.files);let expanded=0;
   if(files.length>5000)throw new Error();
   for(const file of files){expanded+=Number((file as any)._data?.uncompressedSize||0);if(expanded>100*1024*1024||/vbaProject\.bin$/i.test(file.name))throw new Error();}
   const path=extension==='.docx'?'word/document.xml':'xl/workbook.xml';
   if(!zip.file('[Content_Types].xml')||!zip.file(path))throw new Error();
   const xml=await zip.file(path)!.async('string');if(!xml.includes(extension==='.docx'?':document':'workbook'))throw new Error();
  }catch{throw new Error('Dokumen Office tidak valid, terlalu besar, atau mengandung makro.');}
 }
 return officeTypes[extension];
}
