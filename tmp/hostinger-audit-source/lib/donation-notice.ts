export type Notice={id:string;name:string;amount?:number;program?:string};
export function noticeSettings(s:Record<string,any>={}){
 const number=(key:string,fallback:number,min:number,max:number)=>{const n=Number(s[key]);return s[key]!=null&&s[key]!==''&&Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback};
 return {enabled:!s.donationNoticeDisabled,count:number('donationNoticeCount',3,1,3),duration:number('donationNoticeDuration',6,5,7),gap:number('donationNoticeGap',10,8,15),position:s.donationNoticePosition==='right'?'right':'left',amount:!s.donationNoticeHideAmount,program:!s.donationNoticeHideProgram,mask:!s.donationNoticeFullNames,template:['1','2','3'].includes(s.donationNoticeTemplate)?s.donationNoticeTemplate:'rotate'};
}
export function publicNoticeName(name:unknown,publicName:unknown,anonymous:unknown,mask=true){
 if(publicName!==true&&publicName!==1||anonymous===true||anonymous===1)return 'Hamba Allah';
 const parts=String(name||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').split(/\s+/).filter(Boolean);
 if(!parts.length)return 'Hamba Allah';
 return (mask?parts.map((p,i)=>i?Array.from(p)[0]+'.':p).join(' '):parts.join(' ')).slice(0,100);
}
export function noticeMessage(n:Notice,variant:number){const amount=n.amount==null?'':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n.amount),program=n.program?` untuk program ${n.program}`:'';
 if(variant%3===1)return `MasyaAllah, amanah${amount?' '+amount:''} dari ${n.name} telah diterima${program}. Semoga menjadi amal jariyah.`;
 if(variant%3===2&&n.program)return `Alhamdulillah, ${n.program} kembali mendapat dukungan${amount?' '+amount:''} dari ${n.name}. Jazakumullahu khairan.`;
 return `Alhamdulillah, donasi dari ${n.name}${amount?' sejumlah '+amount:''}${program}. Jazakumullahu khairan.`;
}
export function noticeCycle(pool:Notice[],count:number,last=''){
 if(!pool.length)return [];
 const first=pool.find(n=>n.id!==last)||pool[0],rest=pool.filter(n=>n.id!==first.id);
 for(let i=rest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}
 return [first,...rest].slice(0,count);
}
