export class PdfDownloadError extends Error {
 details:string;code:string;
 constructor(details:string,code='PDF_DOWNLOAD'){super('PDF belum dapat dibuat.');this.details=details;this.code=code;}
}
export async function readPdfResponse(response:Response){
 if(!response.ok){let body:any={};try{body=await response.json()}catch{}throw new PdfDownloadError(body.details||body.error||(response.status===401?'Sesi berakhir. Silakan masuk kembali.':`Server menolak unduhan PDF (HTTP ${response.status}).`),body.code||'HTTP_'+response.status);}
 if(!response.headers.get('content-type')?.toLowerCase().includes('application/pdf'))throw new PdfDownloadError('Server tidak mengembalikan berkas PDF. Respons mungkin berupa halaman login atau error.','PDF_RESPONSE_TYPE');
 const blob=await response.blob();if(await blob.slice(0,5).text()!=='%PDF-')throw new PdfDownloadError('Berkas yang diterima bukan PDF yang valid.','PDF_INVALID_FILE');
 const header=response.headers.get('content-disposition')||'';let filename='Dokumen-Donasi.pdf';
 try{filename=decodeURIComponent(header.match(/filename\*=UTF-8''([^;]+)/i)?.[1]||header.match(/filename="([^"]+)"/i)?.[1]||filename)}catch{}
 filename=filename.replace(/[\\/\r\n]/g,'-');return {blob,filename};
}
