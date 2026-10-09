import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';

// Render the actual TSX component without starting or changing the application DB.
const temporary=mkdtempSync(join(tmpdir(),'dh-list-render-'));
let source=ts.transpileModule(readFileSync(resolve('components/donation-list-ui.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const name of ['react','react-dom','react/jsx-runtime'])source=source.replaceAll(`from "${name}"`,`from ${JSON.stringify(import.meta.resolve(name))}`).replaceAll(`from '${name}'`,`from ${JSON.stringify(import.meta.resolve(name))}`);
for(const name of ['whatsapp','donation-workflow-shared'])source=source.replaceAll(`'@/lib/${name}'`,JSON.stringify(pathToFileURL(resolve('lib/'+name+'.ts')).href));
source=source.replaceAll("'../lib/list-sort'",JSON.stringify(pathToFileURL(resolve('lib/list-sort.ts')).href));
const entry=join(temporary,'list.mjs');writeFileSync(entry,source);
const {DonorPhone,DonationList,DonationBadge,ListPagination,ActionMenu}=await import(pathToFileURL(entry).href);
after(()=>rmSync(temporary,{recursive:true,force:true}));

test('phone numbers retain display and normalize the outbound WhatsApp destination',()=>{
 for(const phone of ['081363123456','+62 813-6312-3456','6281363123456']){
  const html=render(h(DonorPhone,{phone}));assert.match(html,/href="https:\/\/wa.me\/6281363123456"/);assert.match(html,/target="_blank"/);assert.match(html,/noopener noreferrer/);assert.match(html,/Hubungi via WhatsApp/);assert.match(html,/<svg/);
 }
 assert.equal(render(h(DonorPhone,{phone:''})),'—');
 const invalid=render(h(DonorPhone,{phone:'legacy invalid'}));assert.ok(invalid.includes('legacy invalid'));assert.ok(!invalid.includes('<a'));
});
test('loading replaces stale financial rows; empty state is announced',()=>{
 const props={label:'Donasi',rows:[{id:'one',name:'Donatur lama'}],columns:[{key:'name',label:'Donatur',render:(r:any)=>r.name}]};
 const loading=render(h(DonationList,{...props,loading:true}));assert.match(loading,/aria-busy="true"/);assert.match(loading,/role="status"/);assert.ok(!loading.includes('Donatur lama'));
 const empty=render(h(DonationList,{...props,rows:[]}));assert.match(empty,/Belum ada data/);assert.ok(!empty.includes('<table'));
 const list=render(h(DonationList,{...props,card:(r:any)=>h('strong',null,r.name)}));assert.match(list,/scope="col"/);assert.match(list,/donation-desktop/);assert.match(list,/donation-cards/);
});
test('pagination prevents navigation beyond both edges and while loading',()=>{
 const disabled=(page:number,count:number,loading=false)=>(render(h(ListPagination,{page,count,loading,onChange:()=>{}})).match(/disabled=""/g)||[]).length;
 assert.equal(disabled(1,0),2);assert.equal(disabled(1,41),1);assert.equal(disabled(2,41),0);assert.equal(disabled(3,41),1);assert.equal(disabled(2,41,true),2);
});
test('status vocabulary and closed action menu remain concise',()=>{
 for(const [status,label] of Object.entries({pending:'Menunggu Verifikasi',valid:'Terverifikasi',rejected:'Ditolak',void:'Dibatalkan'}))assert.ok(render(h(DonationBadge,{status})).includes(label));
 const menu=render(h(ActionMenu,{label:'Aksi Donatur'},h('button',null,'Verifikasi')));assert.match(menu,/aria-expanded="false"/);assert.match(menu,/⋯/);assert.ok(!menu.includes('Verifikasi'));
});

test('sortable headings expose direction and exclude action, proof, and QR columns',()=>{
 const html=render(h(DonationList,{label:'Test sorting',rows:[{id:'one',amount:100}],sort:'amount:desc',onSort:()=>{},columns:[{key:'amount',label:'Nominal',render:(r:any)=>r.amount},{key:'qr',label:'QR',render:()=>''},{key:'proof',label:'Bukti',render:()=>''},{key:'actions',label:'Aksi',render:()=>''}]}));
 assert.match(html,/aria-sort="descending"/);assert.match(html,/Urutkan berdasarkan Nominal/);assert.match(html,/↓/);assert.equal((html.match(/class="list-sort/g)||[]).length,1);
});
