'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
export function AppearancePreview({children,onClose,title}:{children:ReactNode;onClose:()=>void;title:string}){
 const dialog=useRef<HTMLDialogElement>(null),frame=useRef<HTMLIFrameElement>(null);const [mobile,setMobile]=useState(false),[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 function ready(){const doc=frame.current?.contentDocument;if(!doc)return;for(const style of document.querySelectorAll('link[rel="stylesheet"],style'))doc.head.appendChild(style.cloneNode(true));doc.body.style.margin='0';doc.addEventListener('click',e=>{if((e.target as Element).closest('a'))e.preventDefault()});setHost(doc.body);}
 return createPortal(<dialog ref={dialog} className="appearance-preview-dialog" aria-label={title} onCancel={onClose}><header><h2>{title}</h2><div className="actions"><button type="button" aria-pressed={!mobile} onClick={()=>setMobile(false)}>Desktop</button><button type="button" aria-pressed={mobile} onClick={()=>setMobile(true)}>Mobile</button><button type="button" onClick={onClose}>Tutup</button></div></header><p>Pratinjau perubahan yang belum disimpan. Tautan tidak membuka halaman lain.</p><div className="appearance-preview-scroll"><iframe ref={frame} title={title} style={{width:mobile?390:1200}} onLoad={ready} srcDoc={'<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>'}/>{host&&createPortal(<div onClickCapture={e=>{if((e.target as Element).closest('a'))e.preventDefault()}}>{children}</div>,host)}</div></dialog>,document.body);
}
