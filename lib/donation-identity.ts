export const ANONYMOUS_DONOR='Hamba Allah';
export function normalizeDonorName(name:unknown):string{return typeof name==='string'?name.trim()||ANONYMOUS_DONOR:ANONYMOUS_DONOR}
export function donationMessage({name,amount,program,bank,number}:{name:unknown;amount:string;program?:string;bank?:string;number?:string}){
 const nominal=Number(amount);
 const formatted=amount&&Number.isFinite(nominal)&&nominal>0?'Rp'+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(nominal):'Rp...';
 return ["Assalamu'alaikum,",'saya ingin mengonfirmasi donasi.','',`Nama: ${normalizeDonorName(name)}`,`Nominal: ${formatted}`,...(bank?[`Bank tujuan: ${bank}`,`No. Rekening: ${number||''}`]:[]),...(program?[`Program: ${program}`]:[])].join('\n');
}
