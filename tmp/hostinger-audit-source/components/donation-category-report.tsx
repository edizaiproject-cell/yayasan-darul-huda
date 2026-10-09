'use client';
import {useState} from 'react';
import {sortRows,nextSort,parseSort} from '../lib/list-sort';
import {categoryReport} from '@/lib/donation-categories';
import {money} from '@/lib/modules';
export function DonationCategoryReport({transactions,programs}:{transactions:any[];programs:any[]}){
 const [sort,setSort]=useState('');const current=parseSort(sort);const rows=sortRows(categoryReport(transactions,programs),sort);
 return <section className="donation-category-report" aria-label="Laporan donasi per kategori"><h2>Laporan donasi per kategori</h2><p>Transaksi valid sesuai filter di atas, termasuk koreksi. Kategori mengikuti kategori program saat ini.</p>{rows.length?<div className="category-table-scroll"><table className="donation-table"><thead><tr>{[['category','Kategori Donasi'],['count','Transaksi valid'],['total','Total bersih']].map(([key,label])=><th key={key} scope="col" aria-sort={current.key===key?(current.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className={'list-sort'+(current.key===key?' is-active':'')} title={'Urutkan berdasarkan '+label} onClick={()=>setSort(nextSort(sort,key))}>{label}<span aria-hidden="true">{current.key===key?(current.direction==='asc'?'↑':'↓'):'↕'}</span></button></th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.category}><td>{r.category}</td><td>{r.count}</td><td>{money(r.total)}</td></tr>)}</tbody><tfoot><tr><th>Total</th><td>{rows.reduce((n,r)=>n+r.count,0)}</td><td>{money(rows.reduce((n,r)=>n+r.total,0))}</td></tr></tfoot></table></div>:<p>Belum ada transaksi valid untuk filter ini.</p>}</section>;
}
