import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {noticeCycle,noticeMessage,noticeSettings,publicNoticeName} from '../lib/donation-notice.ts';
process.env.DARUL_HUDA_DB=join(mkdtempSync(join(tmpdir(),'dh-notice-')),'test.sqlite');
const d=await import('../lib/database.ts');
const {donationNotices}=await import('../lib/donation-notice-server.ts');
test('names require permission and respect anonymity and masking',()=>{
 assert.equal(publicNoticeName('Muhammad Hidayat Ediz',true,false),'Muhammad H. E.');
 assert.equal(publicNoticeName('Private Name',false,false,false),'Hamba Allah');
 assert.equal(publicNoticeName('Private Name',true,true,false),'Hamba Allah');
 assert.equal(publicNoticeName('Public Name',true,false,false),'Public Name');
});
test('cycles repeat small pools without duplicates; settings and optional copy stay bounded',()=>{
 const a={id:'a',name:'A'},b={id:'b',name:'B'};
 assert.deepEqual(noticeCycle([a],3,'a'),[a]);
 assert.deepEqual(noticeCycle([a,b],3,'a'),[b,a]);
 assert.equal(noticeCycle([a,b],1).length,1);
 assert.equal(noticeSettings({donationNoticeGap:1}).gap,8);
 assert.equal(noticeSettings().duration,6);
 for(let i=0;i<3;i++)assert.doesNotMatch(noticeMessage(a,i),/undefined|Rp|program/);
});
test('public feed includes only verified public donations and never private transaction fields',()=>{
 const p=d.saveRecord('donation_programs',{title:'Program publik',status:'active'},'test');
 const hidden=d.saveRecord('donation_programs',{title:'Program rahasia',status:'active',hidePublic:true},'test');
 let sequence=0;const tx=(status:string,extra={})=>d.saveRecord('donation_transactions',{title:'Transaksi privat '+(++sequence),programId:p.id,amount:200000,kind:'Pemasukan',status,date:'2026-10-04',donor_name:'Muhammad Hidayat Ediz',publicName:true,anonymous:false,phone:'08123456789',...extra},'test');
 tx('valid');tx('pending');tx('void');tx('valid',{programId:hidden.id});tx('valid',{anonymous:true});
 let feed=donationNotices();assert.equal(feed.items.length,2);
 assert.deepEqual(feed.items.map(n=>n.name).sort(),['Hamba Allah','Muhammad H. E.']);
 for(const n of feed.items)assert.deepEqual(Object.keys(n).sort(),['amount','id','name','program']);
 assert.doesNotMatch(JSON.stringify(feed),/08123456789|Program rahasia|Transaksi privat|Hidayat/);
 const settings=d.records('site_settings',true)[0];
 d.saveRecord('site_settings',{...settings,title:settings?.title||'Website',donationNoticeHideAmount:true,donationNoticeHideProgram:true},'test');
 feed=donationNotices();for(const n of feed.items){assert.ok(!('amount' in n));assert.ok(!('program' in n));}
 d.saveRecord('site_settings',{...d.records('site_settings',true)[0],donationNoticeDisabled:true},'test');
 assert.deepEqual(donationNotices().items,[]);
});
