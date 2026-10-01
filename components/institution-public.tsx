import {money} from '@/lib/modules';
type Row=Record<string,any>;
export function ProgramAction({item:r}:{item:Row}){
 if(!r.ctaType||r.ctaType==='Tanpa tombol')return null;
 const href=r.ctaUrl||(r.ctaType==='Hubungi'&&r.whatsapp?'https://wa.me/'+r.whatsapp.replace(/\D/g,''):'/program/'+r.slug);
 return <a className="button button--outline" href={href}>{r.ctaType} ↗</a>;
}
export function InstitutionFacts({item:r,curricula=[]}:{item:Row;curricula?:Row[]}){
 const curriculum=curricula.find(c=>c.id===r.curriculumId);
 return <><dl className="fact-list">{[['kind','Jenis'],['category','Kategori'],['programStatus','Status program'],['head','Penanggung jawab'],['serviceHours','Jam layanan'],['classCount','Jumlah kelas'],['studentCount','Jumlah siswa/santri'],['period','Periode'],['schedule','Jadwal'],['location','Lokasi'],['method','Metode'],['audience','Sasaran peserta']].map(([key,label])=>r[key]!==''&&r[key]!=null?<div key={key}><dt>{label}</dt><dd>{r[key]}</dd></div>:null)}{curriculum&&<div><dt>Kurikulum</dt><dd><a href="/akademik">{curriculum.title}</a></dd></div>}</dl>{[['objectives','Tujuan'],['benefits','Manfaat'],['requirements','Syarat mengikuti program']].map(([key,label])=>r[key]?<section key={key}><h3>{label}</h3><p style={{whiteSpace:'pre-line'}}>{r[key]}</p></section>:null)}{r.products?.length>0&&<section><h3>Produk & Layanan</h3><div className="institution-public-products">{r.products.map((p:Row)=><article key={p.id}><h4>{p.name}</h4><p>{p.description}</p>{p.price!=null&&<strong>{money(p.price)}</strong>}<p className="badge">{p.available?'Tersedia':'Tidak tersedia'}</p></article>)}</div></section>}<div className="actions">{[['document','Dokumen pendukung'],['brochure','Brosur'],['videoUrl','Video program'],['marketplaceUrl','Marketplace'],['orderUrl','Pesan sekarang']].map(([key,label])=>r[key]?<a className="button button--outline" key={key} href={r[key]}>{label} ↗</a>:null)}{r.whatsapp&&<a className="button button--outline" href={'https://wa.me/'+r.whatsapp.replace(/\D/g,'')}>WhatsApp ↗</a>}<ProgramAction item={r}/></div></>;
}
