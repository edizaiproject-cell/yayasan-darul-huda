'use client';
import {MediaField} from './media-field';
import {useRef,useState} from 'react';
import {QR_TYPES} from '@/lib/payment-qr';
type Row=Record<string,any>;
export function PaymentQrEditor({value,onChange,onBusy,upload,notify,compact=false}:{value:Row;onChange:(patch:Row)=>void;onBusy:(busy:boolean)=>void;upload:(file:File)=>Promise<any>;notify:(message:string)=>void;compact?:boolean}){
 const [busy,setBusy]=useState(false);
 return <section className="panel payment-qr-editor"><h2>QR &amp; QRIS</h2>
  <fieldset className="qr-mode"><legend className="sr-only">Penggunaan QR</legend>{[[false,'Tidak menggunakan QR'],[true,'Gunakan QR / QRIS']].map(([enabled,label])=><label key={String(enabled)}><input type="radio" name="qr-mode" checked={!!value.qr_enabled===enabled} disabled={busy} onChange={()=>onChange({qr_enabled:enabled,...(enabled?{qr_type:value.qr_type||'QRIS',qr_active:value.qr_active??true}:{qr_primary:false})})}/>{label}</label>)}</fieldset>
  {value.qr_enabled&&<div className="payment-qr-grid"><div className="payment-qr-fields">
   <label>Jenis QR<select value={value.qr_type||'QRIS'} onChange={e=>onChange({qr_type:e.target.value,...(e.target.value!=='QRIS'?{qr_primary:false}:{})})}>{QR_TYPES.map(type=><option key={type}>{type}</option>)}</select></label>
   <label>Judul QR<input value={value.qr_title||''} maxLength={150} placeholder="QRIS Ma’had Al-Qur’an Darul Huda" onChange={e=>onChange({qr_title:e.target.value})}/></label>
   <label>Keterangan singkat<textarea rows={3} maxLength={500} value={value.qr_description||''} placeholder="Scan QR menggunakan mobile banking atau e-wallet yang mendukung QRIS." onChange={e=>onChange({qr_description:e.target.value})}/></label>
   <label>Status QR<select value={value.qr_active?'active':'inactive'} onChange={e=>onChange({qr_active:e.target.value==='active',...(e.target.value==='inactive'?{qr_primary:false}:{})})}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
   {value.qr_type==='QRIS'&&<><label>Nama merchant / lembaga pada QRIS (opsional)<input value={value.qr_merchant||''} maxLength={150} onChange={e=>onChange({qr_merchant:e.target.value})}/></label><label className="qr-check"><input type="checkbox" checked={!!value.qr_primary} disabled={!value.qr_active} onChange={e=>onChange({qr_primary:e.target.checked})}/>Jadikan QR ini sebagai QRIS utama</label></>}
  </div><div className="payment-qr-preview" data-validation-field="qr_image"><strong>Upload gambar QR</strong><MediaField compact={compact} value={value.qr_image||''} purpose="qr" onChange={url=>onChange(url?{qr_image:url}:{qr_image:'',qr_enabled:false,qr_active:false,qr_primary:false})} upload={upload} onBusy={v=>{setBusy(v);onBusy(v)}} notify={notify}/><small>Penggantian atau penghapusan berlaku setelah Simpan perubahan.</small>
  </div></div>}
 </section>;
}
