export const documentKinds=['receipt','report','donors','transactions','other'] as const;
export type DocumentKind=typeof documentKinds[number];
export const documentLabels:Record<DocumentKind,string>={receipt:'Kuitansi',report:'Laporan / Rekap',donors:'Daftar Donatur',transactions:'Daftar Transaksi',other:'Dokumen lainnya'};
export const rolePresets=['Bendahara','Pimpinan','Kepala Sekolah','Kepala Madrasah','Ketua Yayasan','Direktur','Kepala Unit','Sekretaris','Ketua Panitia','Administrator','Mengetahui','Lainnya'];
export const headerFields=['logo','name','address','phone','email','website'] as const;
export type HeaderField=typeof headerFields[number];
export type Position='left'|'center'|'right';
export type Signer={id:string;name:string;role:string;identifier:string;identifierType:string;position:Position;imageEnabled:boolean;image:string};
export type DocumentTemplate={city:string;dateFormat:'long-padded'|'long'|'numeric';dateSource:'document'|'print';layout:'auto'|'row'|'two'|'three';signers:Signer[];count:number;header:{enabled:boolean;useProfile:boolean;custom:Record<HeaderField,string>;show:Record<HeaderField,boolean>;style:'formal'|'minimal'|'compact';line:'none'|'single'|'double';weight:'thin'|'medium'|'bold';spacing:'tight'|'normal'|'wide'};stamp:{enabled:boolean;image:string;position:'last'|'center'|'custom';preset:Position}};
export type DocumentSettingsValue=DocumentTemplate&{version:2;shared:boolean;templates:Partial<Record<DocumentKind,DocumentTemplate>>}&Record<DocumentKind,boolean>;
const text=(v:any,max=180)=>String(v??'').trim().slice(0,max);
const choice=<T extends string>(v:any,allowed:readonly T[],fallback:T):T=>allowed.includes(v)?v:fallback;
const image=(v:any)=>{const s=text(v,1000);if(!s)return '';let src=s;if(s.startsWith('/api/media-image?'))src=new URL(s,'http://local').searchParams.get('src')||'';if(!/^\/(media|uploads)\/[\w.-]+$/.test(src))throw new Error('Pilih gambar lokal dari Media Library.');return src;};
export function newSigner(index=0):Signer{return {id:'signer-'+(index+1),name:'',role:index?'Pimpinan':'Bendahara',identifier:'',identifierType:'NIP',position:index?'right':'left',imageEnabled:false,image:''};}
export function normalizeTemplate(input:any={},profile:any={}):DocumentTemplate{
 const legacy=input.version!==2&&input.count!==undefined;
 const source=input.signers??[{...newSigner(),name:profile.pdfSignerName||'',role:profile.pdfSignerRole||'Bendahara',position:'right'}];
 if(!Array.isArray(source)||!source.length||source.length>6)throw new Error('Gunakan 1 sampai 6 penandatangan per template.');
 if(legacy&&(!Number.isInteger(input.count)||input.count<1||input.count>source.length))throw new Error('Jumlah penandatangan tidak sesuai.');
 const people=legacy?source.slice(0,input.count):source,h=input.header||{},st=input.stamp||{};
 const signers=people.map((s:any,i:number)=>({...newSigner(i),id:text(s.id)||'signer-'+(i+1),name:text(s.name),role:text(s.role),identifier:text(s.identifier),identifierType:choice(s.identifierType,['NIP','NIY','NIK','NIDN','NUPTK','Lainnya','hidden'],legacy?'Lainnya':'NIP'),position:choice(s.position,['left','center','right'],people.length===1?'right':i===0?'left':'right'),imageEnabled:!!s.imageEnabled,image:image(s.image)}));
 if(new Set(signers.map(s=>s.id)).size!==signers.length)throw new Error('Identitas penandatangan harus unik.');
 return {city:text(input.city??profile.pdfPlace),dateFormat:choice(input.dateFormat,['long-padded','long','numeric'],'long-padded'),dateSource:choice(input.dateSource,['document','print'],'document'),layout:choice(input.layout,['auto','row','two','three'],'auto'),signers,count:signers.length,
 header:{enabled:h.enabled!==false,useProfile:h.useProfile!==false,custom:Object.fromEntries(headerFields.map(k=>[k,k==='logo'?image(h.custom?.[k]):text(h.custom?.[k],k==='address'?500:180)])) as Record<HeaderField,string>,show:Object.fromEntries(headerFields.map(k=>[k,h.show?.[k]!==false])) as Record<HeaderField,boolean>,style:choice(h.style,['formal','minimal','compact'],'formal'),line:choice(h.line,['none','single','double'],'double'),weight:choice(h.weight,['thin','medium','bold'],'thin'),spacing:choice(h.spacing,['tight','normal','wide'],'normal')},
 stamp:{enabled:!!st.enabled,image:image(st.image),position:choice(st.position,['last','center','custom'],'last'),preset:choice(st.preset,['left','center','right'],'center')}};
}
export function normalizeDocumentSettings(input:any={},profile:any={}):DocumentSettingsValue{
 const template=normalizeTemplate(input,profile);const templates:Partial<Record<DocumentKind,DocumentTemplate>>={};
 for(const kind of documentKinds)if(input.templates?.[kind])templates[kind]=normalizeTemplate({...input.templates[kind],version:2},profile);
 return {...template,version:2,shared:input.shared!==false,receipt:input.receipt!==false,report:input.report!==false,donors:!!input.donors,transactions:input.transactions===undefined?input.report!==false:!!input.transactions,other:input.other===undefined?input.report!==false:!!input.other,templates};
}
export function templateFor(settings:DocumentSettingsValue,kind:DocumentKind):DocumentTemplate{return !settings.shared&&settings.templates[kind]?settings.templates[kind]!:settings;}
export function institutionHeader(profile:any,template:DocumentTemplate){const source=template.header.useProfile?{...profile,phone:profile.phone||profile.whatsapp}:template.header.custom;return Object.fromEntries(headerFields.map(k=>[k,template.header.show[k]?source[k]||'':'']));}
export function approvalDate(value:unknown,template:DocumentTemplate,now=new Date()){
 const d=template.dateSource==='print'?now:new Date(String(value||''));if(!Number.isFinite(d.getTime()))return '';
 if(template.dateFormat==='numeric')return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Jakarta'}).format(d).replaceAll('/','-');
 return new Intl.DateTimeFormat('id-ID',{day:template.dateFormat==='long'?'numeric':'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d);
}
export type SignerRow={signer:Signer;column:number;columns:number}[];
export function signerRows(template:DocumentTemplate):SignerRow[]{
 const people=template.signers;
 if(template.layout==='auto'&&people.length<=3){const rows:SignerRow[]=[];for(const signer of people){const column={left:0,center:1,right:2}[signer.position];let row=rows.at(-1);if(!row||row.some(p=>p.column===column)){row=[];rows.push(row)}row.push({signer,column,columns:3})}return rows;}
 const columns=template.layout==='row'?people.length:template.layout==='two'?2:template.layout==='three'?3:people.length===4?2:3;
 const rows:SignerRow[]=[];for(let i=0;i<people.length;i+=columns){const group=people.slice(i,i+columns);rows.push(group.map((signer,column)=>({signer,column,columns:group.length})));}return rows;
}
