import sharp from 'sharp';
import {mkdirSync} from 'node:fs';
mkdirSync('public/icons',{recursive:true});
for(const size of [192,512]){
 const logo=await sharp('public/media/image1.png').resize(Math.round(size*.6),Math.round(size*.6),{fit:'inside'}).png().toBuffer();
 await sharp({create:{width:size,height:size,channels:4,background:'#f8f7f2'}}).composite([{input:logo,gravity:'center'}]).png().toFile(`public/icons/icon-${size}.png`);
}
await sharp('public/icons/icon-512.png').toFile('public/icons/maskable-512.png');
for(const name of ['image2','image3','image5']) await sharp(`public/media/${name}.png`).webp({quality:85}).toFile(`public/media/${name}.webp`);
await sharp('public/media/image2.png').resize({width:480}).webp({quality:80}).toFile('public/media/hero-mobile.webp');
console.log('Ikon PWA 192/512 dan WebP siap.');
