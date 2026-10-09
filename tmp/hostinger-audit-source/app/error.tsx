'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="container section"><p className="eyebrow">DARUL HUDA</p><h1>Data belum dapat dimuat.</h1><p>Periksa koneksi internet, lalu coba kembali.</p><div className="actions"><button className="button button--primary" onClick={reset}>Coba lagi</button><Link href="/">Kembali ke beranda</Link></div></main>}
