'use client';
import {useEffect,useState,type RefObject} from 'react';

export function PdfPreview({blob,container,onReady}:{blob:Blob;container:RefObject<HTMLDivElement|null>;onReady:(ready:boolean)=>void}){
 const [error,setError]=useState('');
 useEffect(()=>{
  let cancelled=false,task:import('pdfjs-dist').PDFDocumentLoadingTask|undefined;
  onReady(false);setError('');
  async function render(){try{
   const [pdfjs,worker]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
   if(cancelled)return;pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
   task=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer())});const pdf=await task.promise;
   if(cancelled)return;container.current?.replaceChildren();
   for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n);if(cancelled)return;
    const viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Halaman ${n} dari ${pdf.numPages}`);container.current?.appendChild(canvas);
    await page.render({canvas,viewport}).promise;if(cancelled)return;
   }
   onReady(true);
  }catch(e){if(!cancelled)setError('Preview belum dapat ditampilkan. '+(e instanceof Error?e.message:'Gunakan Download PDF untuk membuka dokumen.'));}}
  void render();return()=>{cancelled=true;void task?.destroy();container.current?.replaceChildren()};
 },[blob,container,onReady]);
 return <>{error&&<p role="alert">{error}</p>}<div ref={container} className="pdf-canvas-pages" aria-label="Halaman dokumen PDF"/></>;
}
