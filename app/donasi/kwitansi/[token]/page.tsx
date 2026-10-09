import {PublicReceiptPdf} from '@/components/pdf-documents';
import {notFound} from 'next/navigation';
import {receiptByToken} from '@/lib/donation-service';
import {receiptFooter,receiptStatuses,rupiah} from '@/lib/donation-workflow-shared';
export const metadata={title:'Bukti Penerimaan Donasi',robots:{index:false,follow:false},referrer:'no-referrer'};
export const dynamic='force-dynamic';
export default async function ReceiptPage({params}:{params:Promise<{token:string}>}){const {token}=await params;let receipt;try{receipt=receiptByToken(token)}catch{notFound()}const r=receipt,s=r.institution;return <main className="public-receipt"><article><header>{s.logo&&<img src={s.logo} alt="Logo lembaga"/>}<div><h1>{s.name}</h1><p>{s.address}</p><small>{[s.phone,s.email,s.website].filter(Boolean).join(' • ')}</small></div></header><p className="eyebrow">BUKTI PENERIMAAN DONASI</p><h2>{r.receipt_number}</h2><span className={'badge '+r.status}>{receiptStatuses[r.status]}</span><dl className="donation-facts"><div><dt>Nama donatur</dt><dd>{r.donor_name}</dd></div><div><dt>Program donasi</dt><dd>{r.program}</dd></div><div><dt>Tanggal</dt><dd>{r.date}</dd></div></dl><strong className="receipt-amount">{rupiah(r.amount)}</strong><p dir="rtl" lang="ar" className="receipt-arabic">{receiptFooter}</p><PublicReceiptPdf token={token}/></article></main>}
