import test from 'node:test';
import assert from 'node:assert/strict';
import {searchAdmin,dashboardView,announcementState,dashboardNotices} from '../lib/admin-view-model.ts';
const now=Date.parse('2026-09-30T18:00:00Z');
test('search excludes unauthorized records and limits results',()=>{
 const data={posts:Array.from({length:20},(_,id)=>({id,title:`Berita ${id}`})),donation_programs:[{title:'Berita rahasia'}]};
 const results=searchAdmin(data,'berita',m=>m==='posts');
 assert.equal(results.length,15);assert.ok(results.every(r=>r.target.module==='posts'));
 assert.deepEqual(searchAdmin(data,'',()=>true),[]);
});
test('announcement lifecycle uses WIB and respects indefinite publication',()=>{
 assert.equal(announcementState({status:'published',startsAt:'2026-10-01T02:00'},now),'scheduled');
 assert.equal(announcementState({status:'published',endsAt:'2026-10-01T00:30'},now),'expired');
 assert.equal(announcementState({status:'published',endsAt:'2026-10-01T00:30',untilRevoked:true},now),'active');
 assert.equal(announcementState({status:'draft'},now),'draft');
});
test('dashboard handles verified totals, priority, cancelled events and WIB month boundaries',()=>{
 const data={posts:[{status:'published',publishAt:'2026-09-30T17:30:00Z'},{status:'published',publishAt:'2026-10-03T12:00'},{status:'draft',publishAt:'2026-10-01T00:00'}],agendas:[{status:'published',date:'2026-10-02',title:'Besok'},{status:'published',date:'2026-10-01',eventStatus:'Dibatalkan'},{status:'published',date:'2026-09-30'}],donation_programs:[{id:'a',status:'active',target:0,sort_order:0},{id:'b',status:'active',target:100,priority:true}],donationTotals:[{id:'b',total:125}]};
 const view=dashboardView(data,()=>true,now);
 assert.equal(view.monthPosts,1);assert.equal(view.agendas.length,1);assert.equal(view.agendas[0].title,'Besok');
 assert.equal(view.programs[0].id,'b');assert.equal(view.programs[0].percentage,125);assert.equal(view.programs[1].percentage,null);
 assert.deepEqual(dashboardView(data,()=>false,now).programs,[]);
 assert.deepEqual(dashboardNotices(undefined,{announcements:[{status:'published',endsAt:'2026-01-01'}]},()=>false,now),[]);
});
