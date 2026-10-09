import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const temp=mkdtempSync(join(tmpdir(),'dh-audit-'));
process.env.DARUL_HUDA_DB=join(temp,'audit.sqlite');
const d=await import('./lib/database.ts');
d.initializeRoles();
await d.createUser({email:'audit@example.test',password:'AuditOnly!2026a',role_id:'Super Admin'},'audit');
for(let i=0;i<8;i++)try{await d.login('audit@example.test','invalid','audit@example.test')}catch{}
let blocked=false;try{await d.login('audit@example.test','AuditOnly!2026a','audit@example.test')}catch{blocked=true}
const bypass=await d.login(' audit@example.test','AuditOnly!2026a',' audit@example.test');
console.log(JSON.stringify({normalKeyBlocked:blocked,whitespaceKeyBypass:!!bypass}));
for(const trusted of [false,true]){
 const child=spawn(process.execPath,['scripts/start.mjs'],{windowsHide:true,env:{...process.env,APP_PORT:'5189',VINEXT_TRUST_PROXY:trusted?'1':'',VINEXT_TRUSTED_HOSTS:trusted?'audit.example.test':''},stdio:'ignore'});
 try{
  let ready=false;for(let i=0;i<80;i++){try{await fetch('http://127.0.0.1:5189/api/me');ready=true;break}catch{await new Promise(r=>setTimeout(r,150))}}
  if(!ready)throw Error('Server did not start');
  const r=await fetch('http://127.0.0.1:5189/api/logout',{method:'POST',headers:{Host:'audit.example.test',Origin:'https://audit.example.test','X-Forwarded-Proto':'https','X-Forwarded-Host':'audit.example.test'}});
  console.log(JSON.stringify({proxyTrusted:trusted,status:r.status,body:await r.json()}));
 }finally{child.kill();await new Promise(r=>child.once('exit',r))}
}
d.db.close();
const snapshot=new DatabaseSync('data/darul-huda.sqlite',{readOnly:true});
console.log(JSON.stringify({zipDatabaseIntegrity:snapshot.prepare('PRAGMA integrity_check').all(),foreignKeyViolations:snapshot.prepare('PRAGMA foreign_key_check').all().length,tables:snapshot.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get().n,accounts:snapshot.prepare('SELECT count(*) n FROM users').get().n,activeAccounts:snapshot.prepare('SELECT count(*) n FROM users WHERE active=1').get().n,activeAccountsRequiringPasswordChange:snapshot.prepare('SELECT count(*) n FROM users WHERE active=1 AND must_change=1').get().n}));
snapshot.close();
const audit=JSON.parse(readFileSync('audit-dependencies.json','utf8').replace(/^\uFEFF/,'').split(/\r?\nnpm notice/)[0]);
console.log(JSON.stringify({vulnerabilityCounts:audit.metadata.vulnerabilities,packages:Object.keys(audit.vulnerabilities)}));
