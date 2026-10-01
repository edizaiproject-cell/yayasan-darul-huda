import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {inspectPaymentQr} from '../lib/payment-qr-image.ts';
import {hasPaymentQr,paymentQrBadge} from '../lib/payment-qr.ts';
test('payment QR active status and type remain distinct from generated account QR',()=>{
 assert.equal(hasPaymentQr({qr_enabled:true,qr_active:false,qr_image:'/test.png'}),false);
 assert.equal(paymentQrBadge({}),'Belum Ada QR');
 assert.equal(paymentQrBadge({qr_enabled:true,qr_active:true,qr_image:'/test.png',qr_type:'QRIS'}),'QRIS Aktif');
 assert.equal(paymentQrBadge({qr_enabled:true,qr_active:true,qr_image:'/test.png',qr_type:'QR Rekening'}),'QR Aktif');
});
test('small or unreadable payment QR images receive quality warnings',async()=>{
 for(const format of ['png','jpeg','webp'] as const){
 const bytes=await sharp({create:{width:256,height:256,channels:3,background:'white'}}).toFormat(format).toBuffer();
 const result=await inspectPaymentQr(bytes,'image/'+format);assert.equal(result.warnings.length,2);assert.equal(result.width,256);
 }
});
