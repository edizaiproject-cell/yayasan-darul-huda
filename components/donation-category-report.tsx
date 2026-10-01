'use client';
import {categoryReport} from '@/lib/donation-categories';
import {money} from '@/lib/modules';
export function DonationCategoryReport({transactions,programs}:{transactions:any[];programs:any[]}){
 const rows=categoryReport(transactions,programs);
 return <section className="donation-category-report" aria-label="Laporan donasi per kategori"><h2>Laporan donasi per kategori</h2><p>Transaksi valid sesuai filter di atas, termasuk koreksi. Kategori mengikuti kategori program saat ini.</p>{rows.length?<div className="category-table-scroll"><table><thead><tr><th>Kategori Donasi</th><th>Transaksi valid</th><th>Total bersih</th></tr></thead><tbody>{rows.map(r=><tr key={r.category}><td>{r.category}</td><td>{r.count}</td><td>{money(r.total)}</td></tr>)}</tbody><tfoot><tr><th>Total</th><td>{rows.reduce((n,r)=>n+r.count,0)}</td><td>{money(rows.reduce((n,r)=>n+r.total,0))}</td></tr></tfoot></table></div>:<p>Belum ada transaksi valid untuk filter ini.</p>}</section>;
}
