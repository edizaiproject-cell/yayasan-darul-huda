'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {modules,slugify} from '@/lib/modules';
import {PROGRAM_TYPES,programType} from '@/lib/donation-report-schema';
import {MediaField} from './media-field';
import {ReportSettings} from './donation-report-fields';
import {DonationProgress} from './donation-progress';
import type {DonationEditorProps} from './donation-editor';

export function DonationProgramEditor(p:DonationEditorProps){
 const {value:v,change,data}=p;
 const [editUrl,setEditUrl]=useState(false),[manualUrl,setManualUrl]=useState(!!v.id);
 const [noTarget,setNoTarget]=useState(v.target==null||v.target===''),[noEnd,setNoEnd]=useState(!v.endDate);
 const [general,setGeneral]=useState(!v.accountId),[expanded,setExpanded]=useState(false);
 const [modal,setModal]=useState<'advanced'|'preview'|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(!modal)return;const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>{dialog.current?.close();previous?.focus()}},[modal]);
 const field=(key:string,label?:string)=>{const f=modules.donation_programs.fields.find(f=>f.key===key);return f?p.renderField({...f,label:label||f.label}):null};
 const section=(title:string,children:ReactNode)=><section className="program-form-section"><h2>{title}</h2><div className="program-field-grid">{children}</div></section>;
 const toggle=(label:string,key:string,inverse=false)=><label className="program-switch-row"><span>{label}</span><input type="checkbox" role="switch" checked={inverse?!v[key]:!!v[key]} onChange={e=>change({[key]:inverse?!e.target.checked:e.target.checked})}/></label>;
 const accounts=data.donation_accounts||[];
 const metric=(data.donationTotals||[]).find((r:Record<string,any>)=>r.id===v.id);
 return <form className="edit-form program-editor" onSubmit={p.save}>
 {section('Informasi Program',<>
  <label>Nama Program *<input required value={v.title||''} onChange={e=>change({title:e.target.value,...(!manualUrl?{slug:slugify(e.target.value)}:{})})}/></label>
  <label>Kategori *<select required value={v.category||''} onChange={e=>change({category:e.target.value})}><option value="">Pilih kategori</option>{[...new Set([...(modules.donation_programs.fields.find(f=>f.key==='category')?.options||[]),...(v.category?[v.category]:[])])].map(k=><option key={k}>{k}</option>)}</select></label>
  <label>Jenis Program *<select required value={programType(v)} onChange={e=>change({programType:e.target.value})}>{PROGRAM_TYPES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  <div className="program-url"><span>URL Program</span>{editUrl?<label className="program-url-edit"><span className="sr-only">URL Program</span><input required aria-label="URL Program" value={v.slug||''} onChange={e=>{setManualUrl(true);change({slug:slugify(e.target.value)})}}/></label>:<p>/donasi/{v.slug||slugify(v.title||'nama-program')}</p>}<button type="button" onClick={()=>setEditUrl(!editUrl)}>{editUrl?'Selesai':'Edit URL'}</button></div>
  {programType(v)==='custom'&&<label>Nama jenis *<input required maxLength={100} value={v.customProgramType||''} onChange={e=>change({customProgramType:e.target.value})}/></label>}
  <div className="program-wide"><button type="button" className="program-text-button" onClick={()=>setModal('advanced')}>Atur laporan perkembangan</button></div>
 </>)}
 {section('Target & Rekening',<>
  <div className="program-field-stack">{!noTarget&&<label>Target Dana (Rp) *<input type="number" min="1" step="1" required value={v.target??''} onChange={e=>change({target:e.target.value===''?null:Number(e.target.value)})}/></label>}<label className="program-check"><input type="checkbox" checked={noTarget} onChange={e=>{setNoTarget(e.target.checked);if(e.target.checked)change({target:null})}}/>Tanpa target dana</label></div>
  <div className="program-field-stack"><label>Rekening Tujuan<select required={!general} value={v.accountId||''} onChange={e=>change({accountId:e.target.value})}><option value="">{general?'Rekening umum':'Pilih rekening'}</option>{accounts.filter((a:Record<string,any>)=>a.status==='published'&&!a.hidePublic||a.id===v.accountId).map((a:Record<string,any>)=><option key={a.id} value={a.id}>{a.bank} · {a.number}{a.status!=='published'?' (nonaktif)':''}</option>)}</select></label><label className="program-check"><input type="checkbox" checked={general} onChange={e=>setGeneral(e.target.checked)}/>Gunakan rekening umum jika rekening khusus tidak dipilih</label></div>
  {field('startDate','Tanggal Mulai')}
  <div className="program-field-stack">{!noEnd&&<label>Tanggal Selesai *<input type="date" required min={v.startDate||undefined} value={v.endDate||''} onChange={e=>change({endDate:e.target.value})}/></label>}<label className="program-check"><input type="checkbox" checked={noEnd} onChange={e=>{setNoEnd(e.target.checked);if(e.target.checked)change({endDate:''})}}/>Program tanpa tanggal selesai</label></div>
  {field('whatsapp','WhatsApp Informasi')}
 </>)}
 {section('Konten Program',<>
  <label className="program-wide">Ringkasan<textarea maxLength={200} rows={2} value={v.summary||''} onChange={e=>change({summary:e.target.value})}/><small>{(v.summary||'').length}/200 karakter</small></label>
  <div className={'program-wide program-story'+(expanded?' is-expanded':'')}>{field('body','Deskripsi Lengkap')}<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Ringkas editor':'Perbesar editor'}</button></div>
 </>)}
 {section('Media & Publikasi',<>
  <div className="program-field-stack"><span>Foto Utama</span><MediaField compact purpose="featured" value={v.image||''} onChange={image=>change({image})} onBusy={p.setQrBusy} notify={p.notify}/>{v.image&&<button type="button" onClick={()=>setModal('preview')}>Lihat Preview</button>}{field('alt','Teks Alternatif')}</div>
  <div className="program-field-stack"><label>Status<select value={v.status||'draft'} onChange={e=>change({status:e.target.value})}>{[['draft','Draft'],['active','Aktif'],['achieved','Target tercapai'],['completed','Selesai'],['closed','Arsip / Ditutup']].map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>{toggle('Tampilkan di Website','hidePublic',true)}{toggle('Program Unggulan','priority')}<label>Urutan Tampil<input type="number" step="1" value={v.sort_order??0} onChange={e=>change({sort_order:Number(e.target.value)})}/></label></div>
 </>)}
 <button type="button" className="program-advanced-trigger" onClick={()=>setModal('advanced')}>⚙ Pengaturan lanjutan</button>
 <footer className="program-form-footer"><button type="button" onClick={p.cancel}>Batal</button><small role="status">{p.dirty?'Perubahan belum disimpan':''}</small><button type="button" onClick={()=>setModal('preview')}>Pratinjau</button><button className="button button--primary" disabled={p.busy||p.qrBusy}>{p.busy?'Menyimpan…':'Simpan Program'}</button></footer>
 {modal&&<dialog ref={dialog} className="program-subdialog" aria-label={modal==='advanced'?'Pengaturan lanjutan program':'Pratinjau program'} onCancel={e=>{e.preventDefault();e.stopPropagation();setModal(null)}}><header><h2>{modal==='advanced'?'Pengaturan lanjutan':'Pratinjau Program'}</h2><button type="button" autoFocus onClick={()=>setModal(null)}>Tutup</button></header>{modal==='advanced'?<>
  <ReportSettings hideType value={v} change={change}/>
  <details><summary>Cerita tambahan & galeri</summary><div className="program-field-grid">{['background','purpose','beneficiaries','photos'].map(k=><div key={k} className="program-wide">{field(k)}</div>)}</div></details>
  <details><summary>Opsi kampanye & tampilan gambar</summary><div className="program-field-grid">{field('adminName','Admin Konfirmasi')}{field('urgent','Mendesak')}{field('image_position_x')}{field('image_position_y')}</div></details>
  {v.id&&<button type="button" onClick={()=>p.addUpdate(v)}>＋ Tambah Perkembangan</button>}
  <footer><button type="button" onClick={()=>setModal(null)}>Selesai mengatur</button><small>Perubahan diterapkan saat Simpan Program.</small></footer>
 </>:<article className="program-live-preview">{v.image&&<img src={v.image} alt={v.alt||''}/>}<h2>{v.title||'Nama Program'}</h2><p>{v.summary}</p><DonationProgress metric={{total:metric?.total||0,used:metric?.used||0,target:Number(v.target)||0}}/><button type="button" className="button button--primary" disabled>Donasi Sekarang</button><small>Pratinjau — tombol donasi tidak melakukan transaksi.</small>{v.body&&<iframe title="Pratinjau deskripsi" sandbox="" srcDoc={'<!doctype html><html><meta charset="utf-8"><body>'+v.body+'</body></html>'}/>}</article>}</dialog>}
 </form>;
}
