'use client';
import {money} from '@/lib/modules';

type Metric={total:number;target?:number;used?:number;remaining?:number};
export function DonationProgress({metric}:{metric?:Metric}){
 const target=Number(metric?.target)||0,total=Number(metric?.total)||0;
 const percentage=target>0?Math.round(total/target*1000)/10:null;
 return <><dl className="donation-facts"><div><dt>Dana terkumpul</dt><dd>{metric?money(total):'Pilih program donasi'}</dd></div>{percentage!==null&&<><div><dt>Target dana</dt><dd>{money(target)}</dd></div><div><dt>Progres dana</dt><dd>{percentage}%{total>=target?' · Target tercapai':''}</dd></div></>}{metric&&<><div><dt>Dana disalurkan / digunakan</dt><dd>{money(metric.used||0)}</dd></div><div><dt>Sisa dana</dt><dd>{money(metric.remaining??total)}</dd></div></>}</dl>{percentage!==null&&<div className="progress" aria-label={`Capaian dana ${percentage}%`}><span style={{width:`${Math.min(100,percentage)}%`}}/></div>}{metric&&percentage===null&&<small>Tanpa target dana — total donasi tetap dihitung otomatis.</small>}</>;
}

export function DonationProgressOverview({data,addUpdate}:{data:Record<string,any>;addUpdate:(program:Record<string,any>)=>void}){
 return <section className="panel"><h2>Capaian dana otomatis</h2><p>Dana dan persentase diperbarui dari transaksi terverifikasi. Tidak perlu membuat laporan untuk memperbarui capaian dana.</p><div className="donation-editor-grid">{(data.donation_programs||[]).map((program:Record<string,any>)=><section className="panel" key={program.id}><h3>{program.title}</h3><DonationProgress metric={(data.donationTotals||[]).find((r:Record<string,any>)=>r.id===program.id)}/><button type="button" onClick={()=>addUpdate(program)}>＋ Tambah Perkembangan</button></section>)}</div><p>Tambahkan laporan ketika ada perkembangan nyata.</p></section>;
}
