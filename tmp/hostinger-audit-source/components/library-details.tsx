import {contentDefaults,contentFieldVisible,publicLibrary} from '../lib/content-schema';
export function LibraryDetails({item}:{item:Record<string,any>}){
 const r=contentDefaults('library_items',item),visible=publicLibrary(r);
 const fields=[['kind','Jenis pustaka'],['category','Kategori'],['author','Penulis'],['publisher','Penerbit'],['year','Tahun terbit'],['city','Kota terbit'],['isbn','ISBN / ISSN'],['edition','Edisi'],['language','Bahasa'],['pages','Jumlah halaman'],['journal','Nama jurnal'],['volume','Volume'],['issue','Nomor'],['doi','DOI / URL']];
 return <><dl className="fact-list">{fields.filter(([key])=>r[key]&&contentFieldVisible('library_items',key,r)).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{r[key]}</dd></div>)}</dl><div className="actions">{visible.pdf&&<a className="button button--primary" href={visible.pdf} download>Unduh PDF ↓</a>}{visible.externalUrl&&<a className="button button--outline" href={visible.externalUrl} target="_blank" rel="noopener noreferrer">{r.linkText||'Kunjungi Sumber'} ↗</a>}</div>{r.access==='Hanya informasi'&&<p className="muted">Koleksi ini tersedia sebagai informasi katalog.</p>}</>;
}
