type Row=Record<string,any>;
// Usage comes from the existing program relation; a negative display order is
// the existing priority convention, now restricted to one active general account.
export function eligibleAccounts(accounts:Row[],program?:Row){
 return accounts.filter(a=>a.status==='published'&&(program?.accountId?a.id===program.accountId:a.usage_mode!=='program'))
 .sort((a,b)=>Number(b.is_primary||false)-Number(a.is_primary||false)||a.sort_order-b.sort_order||String(a.id).localeCompare(String(b.id)));
}
export function accountLabel(account?:Row){return account?`${account.bank} ••••${String(account.number||'').slice(-4)}`:'rekening lain';}
