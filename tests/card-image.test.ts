import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {cardImagePosition} from '../lib/card-image.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-card-focus-')),'test.sqlite');
const d=await import('../lib/database.ts');
test.after(()=>d.db.close());
test('circle focal positions round trip independently without changing image or URL',()=>{
 for(const name of ['education_units','donation_programs']){
 const initial=d.saveRecord(name,{title:'Foto lingkaran '+name,status:'draft',level:'SMP',image:'/media/image2.png',summary:'Isi lama',image_position_x:23,image_position_y:76},'test');
 const reloaded=d.records(name,true).find(r=>r.id===initial.id)!;
 assert.equal(cardImagePosition(reloaded).css,'23% 76%');
 const edited=d.saveRecord(name,{...reloaded,image_position_x:0,image_position_y:100},'test');
 assert.equal(edited.slug,initial.slug);assert.equal(edited.image,initial.image);assert.equal(edited.summary,'Isi lama');assert.equal(cardImagePosition(edited).css,'0% 100%');
 const {image_position_x,image_position_y,...omitted}=edited;
 assert.equal(cardImagePosition(d.saveRecord(name,omitted,'test')).css,'0% 100%');
 assert.throws(()=>d.saveRecord(name,{...edited,image_position_y:101},'test'),/Posisi gambar/);
 }
});
test('legacy photos default to center and existing media focal points remain compatible',()=>{
 assert.equal(cardImagePosition({image:'/media/image2.png'}).css,'50% 50%');
 assert.equal(cardImagePosition({image:'/media/image2.png?fx=30&fy=70'}).css,'30% 70%');
});
