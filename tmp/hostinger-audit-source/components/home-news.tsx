'use client';
import Link from 'next/link';
import {useState} from 'react';
import {latestHomeNews,newsDate,newsExcerpt} from '../lib/home-news';
import {originalMediaUrl} from '../lib/media-presets';
import '../app/home-news.css';
type Row=Record<string,any>;

function NewsPhoto({post}:{post:Row}){
 const [failed,setFailed]=useState(false);
 // Use the original composition, including images previously saved with a crop.
 let src=post.image||'';
 if(src.startsWith('/api/media-image?'))src='/api/media-image?'+new URLSearchParams({src:originalMediaUrl(src),purpose:'thumbnail'});
 return <div className="home-news-photo">{src&&!failed?<img src={src} alt={post.alt||post.title} loading="lazy" decoding="async" width="1200" height="900" onError={()=>setFailed(true)}/>:<div className="home-news-placeholder" role="img" aria-label={'Ilustrasi Darul Huda untuk '+post.title}><span aria-hidden="true">✦</span><span>Darul Huda</span></div>}</div>;
}
function EditorialNewsCard({post,categories,showDate=true,showExcerpt=true}:{post:Row;categories:Row[];showDate?:boolean;showExcerpt?:boolean}){
 const category=categories.find(c=>c.id===post.categoryId)?.title||post.category||post.kind||'Berita';
 const date=newsDate(post),excerpt=newsExcerpt(post);
 const photos=(post.photos||[]).filter((photo:Row)=>photo.url).slice(0,2);
 return <article className="home-news-paper scroll-reveal-card">
  <header className="home-news-masthead"><p>{post.kind||'Berita'}</p><span>Darul Huda</span></header>
  <div className="home-news-story"><div className="home-news-sidebar"><div className="home-news-excerpt"><span className="home-news-category">{category}</span>{showExcerpt&&excerpt&&<p>{excerpt}</p>}{photos.length>0&&<div className="home-news-additional">{photos.map((photo:Row,index:number)=><NewsPhoto key={photo.url+'-'+index} post={{image:photo.url,alt:photo.alt||photo.caption||`${post.title} — dokumentasi ${index+1}`,title:post.title}}/>)}</div>}</div></div><NewsPhoto post={post}/></div>
  <div className="home-news-ribbon"><span>Kita Hari ini</span></div>
  <h3><Link href={'/berita/'+post.slug}>{post.title}</Link></h3>
  <footer>{showDate&&(date?<time dateTime={date.iso}>{date.label}</time>:<span>Tanggal belum tersedia</span>)}<Link href={'/berita/'+post.slug} aria-label={'Selengkapnya: '+post.title}>Selengkapnya <span aria-hidden="true">↗</span></Link></footer>
 </article>;
}
export function HomeNews({posts,categories=[],configured=false,showDate=true,showExcerpt=true}:{posts:Row[];categories?:Row[];configured?:boolean;showDate?:boolean;showExcerpt?:boolean}){
 const items=configured?posts:latestHomeNews(posts);
 return items.length?<div className={'home-news-grid home-news-count-'+items.length}>{items.map(post=><EditorialNewsCard key={post.id} post={post} categories={categories} showDate={showDate} showExcerpt={showExcerpt}/>)}</div>:<p className="muted">Belum ada berita yang diterbitkan.</p>;
}
