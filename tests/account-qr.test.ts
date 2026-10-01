import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import sharp from 'sharp';
import {accountQrText} from '../lib/account-qr.ts';

const accounts=[{bank:'BSI',number:'9005559930'},{bank:'BNI',number:'738384760'},{bank:'BRI',number:'0256 01002137309'}];
for(const account of accounts)test(`${account.bank}: downloadable PNG decodes to exact account details`,async()=>{
 const text=accountQrText({...account,holder:"Ma'had Alquran Darul Huda"});
 const png=await QRCode.toBuffer(text,{type:'png',width:1024,margin:4,errorCorrectionLevel:'M',color:{dark:'#073e35',light:'#ffffff'}});
 const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
 assert.equal(info.width,1024);
 assert.equal(decoded?.data,`Bank: ${account.bank}\nNo. Rekening: ${account.number.replace(/\s/g,'')}\nAtas Nama: Ma'had Alquran Darul Huda`);
});
test('reusable QR preserves leading zeroes and supports another recipient',()=>{
 assert.equal(accountQrText({bank:'Bank Lain',number:'001 002',holder:'Yayasan Contoh'}),'Bank: Bank Lain\nNo. Rekening: 001002\nAtas Nama: Yayasan Contoh');
});
