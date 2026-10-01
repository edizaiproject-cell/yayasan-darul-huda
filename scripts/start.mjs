import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
if(existsSync('.env'))process.loadEnvFile('.env');
process.env.NODE_ENV='production';
const {startProdServer,tryServeStatic}=await import('vinext/server/prod-server');
const {server}=await startProdServer({host:process.env.APP_HOST||'127.0.0.1',port:Number(process.env.APP_PORT||5174)});
// Vinext 0.0.50 builds static-cache keys with Windows backslashes. Use its
// public filesystem static handler without that cache for our asset allowlist.
const handlers=server.listeners('request');
server.removeAllListeners('request');
server.on('request',async(req,res)=>{
 try{
  const path=new URL(req.url||'/','http://localhost').pathname;
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  if(/^\/(admin|api)(\/|$)/.test(path))res.setHeader('Cache-Control','no-store');
  if(path.startsWith('/donasi/kwitansi/')){res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');}
  if(Number(req.headers['content-length']||0)>11*1024*1024){res.writeHead(413,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Batas ukuran unggahan 10 MB.'}));return;}
  // Serve uploaded masters through the database, including files present at build time.
  // This avoids Vinext's Windows static-cache interception and preserves merged URL aliases.
  if(['GET','HEAD'].includes(req.method)&&path.startsWith('/uploads/')){const {servePublicMedia}=await import('../lib/media-response.ts');const result=servePublicMedia(path.slice('/uploads/'.length));res.writeHead(result.status,Object.fromEntries(result.headers));res.end(req.method==='HEAD'?undefined:Buffer.from(await result.arrayBuffer()));return;}
  const staticPath=/^\/(assets|icons|media)\//.test(path)||['/sw.js','/manifest.webmanifest','/offline.html'].includes(path);
  if(['GET','HEAD'].includes(req.method)&&staticPath){const headers={'X-Content-Type-Options':'nosniff',...(path==='/sw.js'?{'Cache-Control':'no-store'}:{}),...(path==='/manifest.webmanifest'?{'Content-Type':'application/manifest+json'}:{})};if(await tryServeStatic(req,res,resolve('dist/client'),path,true,undefined,headers))return;}
  for(const handler of handlers)handler.call(server,req,res);
 }catch(e){console.error('Request failed:',e.message);if(!res.headersSent){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Data gagal dimuat. Silakan coba kembali.');}}
});


