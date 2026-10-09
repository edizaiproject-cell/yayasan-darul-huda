// Safe to run at Windows sign-in or again manually. Never starts a second server.
import {existsSync, mkdirSync, openSync, closeSync, appendFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createConnection} from 'node:net';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
if(existsSync('.env'))process.loadEnvFile('.env');
const host=process.env.APP_HOST||'127.0.0.1';
const port=Number(process.env.APP_PORT||5174);
const probeHost=['0.0.0.0','::'].includes(host)?'127.0.0.1':host;
mkdirSync('data/logs',{recursive:true});
const log=resolve('data/logs/local-server.log');
const note=text=>appendFileSync(log,`\n[${new Date().toISOString()}] ${text}\n`);
function listening(){return new Promise(resolve=>{
 const socket=createConnection({host:probeHost,port});
 const done=value=>{socket.destroy();resolve(value)};
 socket.setTimeout(1500);socket.once('connect',()=>done(true));
 socket.once('error',()=>done(false));socket.once('timeout',()=>done(false));
});}
if(await listening()){
 note(`Port ${port} sudah digunakan; tidak menjalankan server kedua.`);
}else if(!existsSync('dist/server/index.js')){
 note('Build belum tersedia. Jalankan npm run build dari folder proyek.');process.exitCode=1;
}else{
 const output=openSync(log,'a');
 note(`Menjalankan website di ${probeHost}:${port}.`);
 const child=spawn(process.execPath,['scripts/start.mjs'],{
  cwd:root,env:{...process.env},detached:true,windowsHide:true,
  stdio:['ignore',output,output]
 });
 closeSync(output);
 child.on('error',error=>{note(`Gagal menjalankan server: ${error.message}`);process.exitCode=1});
 child.unref();
 let ready=false;
 for(let attempt=0;attempt<30;attempt++){
  if(await listening()){ready=true;break}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 note(ready?'Server siap.':'Server belum siap; periksa pesan error di log ini.');
 if(!ready)process.exitCode=1;
}
