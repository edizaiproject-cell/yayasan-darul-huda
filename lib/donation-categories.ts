export const DONATION_CATEGORIES=['Pendidikan','Beasiswa Santri','Wakaf','Pembangunan','Sosial','Operasional Ma’had','Bantuan Darurat','Infak & Sedekah','Lainnya'];
export const UNCATEGORIZED='Belum dikategorikan';
type Program={id:string;category?:string};
export function donationCategory(program?:{category?:string}){return program?.category?.trim()||UNCATEGORIZED}
export function transactionCategory(transaction:{programId?:string},programs:Program[]){return donationCategory(programs.find(p=>p.id===transaction.programId))}
export function categoryReport(transactions:{programId?:string;status:string;amount:number}[],programs:Program[]){
 const rows=new Map<string,{category:string;count:number;total:number}>();
 for(const t of transactions){if(t.status!=='valid')continue;const category=transactionCategory(t,programs),row=rows.get(category)||{category,count:0,total:0};row.count++;row.total+=Number(t.amount)||0;rows.set(category,row)}
 return [...rows.values()].sort((a,b)=>a.category.localeCompare(b.category,'id'));
}
