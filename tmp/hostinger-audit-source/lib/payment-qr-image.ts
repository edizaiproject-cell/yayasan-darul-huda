import sharp from 'sharp';
import jsQR from 'jsqr';
export const QR_MAX_BYTES=5*1024*1024;
export async function inspectPaymentQr(bytes:Buffer,mime:string){
 if(!bytes.length||bytes.length>QR_MAX_BYTES)throw new Error('Gambar QR maksimal 5 MB.');
 if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Pilih gambar PNG, JPG/JPEG, atau WEBP.');
 let meta;
 try{meta=await sharp(bytes,{limitInputPixels:16000000}).metadata();if(mime!=='image/'+meta.format||(meta.pages||1)>1)throw new Error();}
 catch{throw new Error('Isi gambar atau MIME type tidak valid. Gunakan gambar statis hingga 16 megapiksel.');}
 if(!meta.width||!meta.height||Math.min(meta.width,meta.height)<128)throw new Error('Resolusi QR terlalu kecil. Gunakan gambar minimal 128 × 128 piksel, disarankan 1000 × 1000 atau lebih.');
 const warnings:string[]=[];
 if(Math.min(meta.width,meta.height)<750)warnings.push('Resolusi gambar kecil; disarankan 1000 × 1000 piksel.');
 try{
  const {data,info}=await sharp(bytes,{limitInputPixels:16000000}).resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(!jsQR(new Uint8ClampedArray(data),info.width,info.height))warnings.push('QR belum terbaca otomatis; gambar mungkin buram. Uji pemindaian sebelum mengaktifkan.');
 }catch{throw new Error('Gambar rusak atau tidak dapat dibaca.');}
 return {width:meta.width,height:meta.height,warnings,ext:meta.format==='jpeg'?'.jpg':'.'+meta.format};
}
