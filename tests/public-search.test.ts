import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSearchPolicy as policy} from '../lib/public-search-policy.ts';
test('small public institutional lists show content directly',()=>{for(const kind of ['pendidikan','program','donasi','pengumuman','agenda']){const p=policy(kind,12,3);assert.equal(p.search,false);assert.equal(p.categories,false);assert.equal(p.paginate,false)}});
test('medium lists use relevant compact controls and galleries favor categories',()=>{assert.equal(policy('donasi',13,2).statuses,true);assert.equal(policy('donasi',30,2).search,false);assert.equal(policy('galeri',3,2).categories,true);assert.equal(policy('galeri',3,1).categories,false);assert.equal(policy('pendidikan',13,1).categories,false)});
test('large public collections and growing archives retain search and pagination',()=>{for(const kind of ['pendidikan','program','donasi','galeri','pengumuman','agenda']){assert.equal(policy(kind,31,2).search,true);assert.equal(policy(kind,31,2).paginate,true)}for(const kind of ['berita','pustaka']){assert.equal(policy(kind,1).search,true);assert.equal(policy(kind,1).paginate,true)}});
