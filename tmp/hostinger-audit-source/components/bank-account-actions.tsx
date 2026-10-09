'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {PaymentQrButton} from './payment-qr-button';
import type {PaymentQr} from '@/lib/payment-qr';
import {accountQrText,DEFAULT_HOLDER,type BankAccount} from '@/lib/account-qr';

export function BankAccountActions({account}:{account:BankAccount&PaymentQr}){
 const [open,setOpen]=useState(false),[qr,setQr]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const dialogRef=useRef<HTMLDialogElement>(null),triggerRef=useRef<HTMLButtonElement>(null);
 const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const titleId=useId(),hintId=useId();
 const payload=accountQrText(account);
 function notify(message:string){setNotice(message);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),3500)}
 useEffect(()=>()=>{if(noticeTimer.current)clearTimeout(noticeTimer.current)},[]);
 useEffect(()=>{
  if(!open)return;
  const dialog=dialogRef.current;if(!dialog)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';dialog.showModal();
  let cancelled=false;setQr('');setError('');
  void import('qrcode').then(module=>module.toDataURL(payload,{type:'image/png',width:1024,margin:4,errorCorrectionLevel:'M',color:{dark:'#073e35',light:'#ffffff'}}))
   .then(url=>{if(!cancelled)setQr(url)}).catch(()=>{if(!cancelled)setError('QR belum dapat dibuat. Tutup dan coba lagi, atau salin nomor rekening.')});
  return()=>{cancelled=true;dialog.close();document.body.style.overflow=previousOverflow;triggerRef.current?.focus()};
 },[open,payload]);
 async function copy(){
  const number=account.number.replace(/\s/g,'');
  try{
   try{await navigator.clipboard.writeText(number)}catch{
    const previous=document.activeElement as HTMLElement|null;
    const input=document.createElement('textarea');input.value=number;input.readOnly=true;
    input.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';document.body.appendChild(input);
    try{input.focus();input.select();input.setSelectionRange(0,number.length);if(!document.execCommand('copy'))throw new Error('Copy unavailable')}
    finally{input.remove();previous?.focus({preventScroll:true})}
   }
   notify('Nomor rekening berhasil disalin.');
  }catch{notify('Nomor belum dapat disalin. Silakan salin nomor rekening secara manual.')}
 }
 function download(){
  if(!qr)return;
  try{
   const anchor=document.createElement('a');anchor.href=qr;
   anchor.download=`QR-${account.bank.replace(/[^a-zA-Z0-9-]/g,'-')}-${account.number.replace(/\s/g,'')}.png`;
   document.body.appendChild(anchor);anchor.click();anchor.remove();notify('QR berhasil diunduh sebagai PNG.');
  }catch{notify('QR belum dapat diunduh. Silakan coba kembali.')}
 }
 const toast=<div className={'bank-toast '+(notice?'is-visible':'')} role="status" aria-live="polite" aria-atomic="true">{notice}</div>;
 return <>
  <div className="bank-actions">
   <button type="button" onClick={copy}>Salin</button>
   <PaymentQrButton account={account}/>
   <button type="button" ref={triggerRef} className="bank-qr-trigger" aria-haspopup="dialog" onClick={()=>{setNotice('');setOpen(true)}}>Lihat QR<span aria-hidden="true"> ↗</span></button>
  </div>
  {!open&&toast}
  {open&&<dialog className="bank-qr-modal" ref={dialogRef} aria-labelledby={titleId} aria-describedby={hintId} onCancel={e=>{e.preventDefault();setOpen(false)}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false)}}}>
   <div className="bank-qr-heading"><div><p className="eyebrow">QR INFORMASI REKENING · OTOMATIS</p><h3 id={titleId}>QR Rekening {account.bank}</h3></div><span className="bank-qr-badge" aria-hidden="true">{account.bank}</span></div>
   <div className="bank-qr-image" aria-busy={!qr&&!error}>{qr?<img src={qr} width="1024" height="1024" alt={'QR informasi rekening '+account.bank}/>:<p role="status">{error||'Menyiapkan QR…'}</p>}</div>
   <dl className="bank-qr-details"><div><dt>Bank</dt><dd>{account.bank}</dd></div><div><dt>No. Rekening</dt><dd>{account.number}</dd></div><div><dt>Atas Nama</dt><dd>{account.holder?.trim()||DEFAULT_HOLDER}</dd></div></dl>
   <p className="bank-qr-hint" id={hintId}>Scan untuk membaca informasi rekening, lalu lakukan transfer bank. QR rekening ini bukan kode pembayaran QRIS.</p>
   <div className="bank-qr-footer"><button type="button" className="button button--primary" disabled={!qr} onClick={download}>Unduh QR</button><button type="button" autoFocus onClick={()=>setOpen(false)}>Tutup</button></div>
   {toast}
  </dialog>}
 </>;
}

export function DonationQris({src,merchant,description}:{src?:string;merchant?:string;description?:string}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 if(!src||failed)return null;
 return <section className="donation-qris" aria-label="Scan QRIS"><div><p className="eyebrow">DONASI CEPAT</p><h3>Donasi Cepat dengan QRIS</h3><span className="bank-qr-badge">QRIS</span>{merchant&&<p><strong>{merchant}</strong></p>}<p>{description||'Pindai QRIS dengan aplikasi bank atau dompet digital Anda. Periksa nama penerima sebelum mengonfirmasi donasi.'}</p></div><img src={src} alt="QRIS donasi Ma'had Alquran Darul Huda" loading="lazy" onError={()=>setFailed(true)}/></section>;
}
