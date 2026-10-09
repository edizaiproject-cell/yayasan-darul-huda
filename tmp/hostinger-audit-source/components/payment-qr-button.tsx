'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {hasPaymentQr,type PaymentQr} from '@/lib/payment-qr';
import type {BankAccount} from '@/lib/account-qr';
export function PaymentQrButton({account}:{account:BankAccount&PaymentQr}){
 const [open,setOpen]=useState(false),[failed,setFailed]=useState(false);const ref=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{if(!open)return;setFailed(false);const d=ref.current;if(!d)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';d.showModal();return()=>{d.close();document.body.style.overflow=overflow;trigger.current?.focus()}},[open]);
 if(!hasPaymentQr(account))return null;
 return <><button className="bank-qr-trigger" type="button" ref={trigger} aria-haspopup="dialog" onClick={()=>setOpen(true)}>Tampilkan QR</button>{open&&<dialog ref={ref} className="bank-qr-modal payment-qr-modal" aria-labelledby={id} onCancel={e=>{e.preventDefault();setOpen(false)}}>
  <div className="bank-qr-heading"><div><p className="eyebrow">QR PEMBAYARAN UNGGAHAN ADMIN</p><h3 id={id}>{account.qr_title||account.qr_type}</h3></div><span className="bank-qr-badge">{account.qr_type}</span></div>
  {failed?<p role="alert">Gambar QR belum dapat dimuat. Gunakan nomor rekening atau coba kembali.</p>:<img className="official-qr-image" src={account.qr_image} alt={account.qr_title||account.qr_type||'QR pembayaran'} onError={()=>setFailed(true)}/>}
  <dl className="bank-qr-details"><div><dt>Bank</dt><dd>{account.bank}</dd></div>{account.number&&<div><dt>No. Rekening</dt><dd>{account.number}</dd></div>}<div><dt>Atas Nama</dt><dd>{account.holder||"Ma'had Alquran Darul Huda"}</dd></div>{account.qr_merchant&&<div><dt>Merchant</dt><dd>{account.qr_merchant}</dd></div>}</dl>
  {account.qr_description&&<p className="bank-qr-hint">{account.qr_description}</p>}
  <div className="bank-qr-footer"><button type="button" autoFocus onClick={()=>setOpen(false)}>Tutup</button></div>
 </dialog>}</>;
}
