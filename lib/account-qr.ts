export type BankAccount={bank:string;number:string;holder?:string};
export const DEFAULT_HOLDER="Ma'had Alquran Darul Huda";
export function accountQrText(account:BankAccount){
 return `Bank: ${account.bank}\nNo. Rekening: ${account.number.replace(/\s/g,'')}\nAtas Nama: ${account.holder?.trim()||DEFAULT_HOLDER}`;
}
