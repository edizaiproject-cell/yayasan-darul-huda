import test from 'node:test';
import assert from 'node:assert/strict';
import {readMediaResponse} from '../lib/media-request.ts';
test('upload errors handle non-JSON framework responses and retain API validation messages',async()=>{
 await assert.rejects(readMediaResponse(new Response('Payload Too Large',{status:413})),/batas ukuran server/);
 await assert.rejects(readMediaResponse(new Response('Bad Gateway',{status:502})),/Server gagal memproses/);
 await assert.rejects(readMediaResponse(Response.json({error:'Gambar tidak dapat dibaca.'},{status:400})),/Gambar tidak dapat dibaca/);
 const data={url:'/uploads/hero.png',id:'hero'};
 assert.deepEqual(await readMediaResponse(Response.json(data)),data);
});
