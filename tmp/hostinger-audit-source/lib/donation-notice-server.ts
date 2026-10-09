import {createHash} from 'node:crypto';
import {db,records} from './database.ts';
import {noticeSettings,publicNoticeName} from './donation-notice.ts';
export function donationNotices(){
 const settings=noticeSettings(records('site_settings',true)[0]||{});
 if(!settings.enabled)return {settings,items:[]};
 const rows=db.prepare(`SELECT t.id,json_extract(t.data,'$.donor_name') name,json_extract(t.data,'$.publicName') public_name,json_extract(t.data,'$.anonymous') anonymous,json_extract(t.data,'$.amount') amount,p.title program
 FROM donation_transactions t LEFT JOIN donation_programs p ON p.id=t.program_id
 WHERE t.deleted_at IS NULL AND t.status='valid' AND json_extract(t.data,'$.kind')='Pemasukan' AND CAST(json_extract(t.data,'$.amount') AS REAL)>0
 AND (t.program_id IS NULL OR (p.deleted_at IS NULL AND p.status IN ('active','achieved','completed','closed') AND COALESCE(json_extract(p.data,'$.hidePublic'),0)=0))
 ORDER BY COALESCE(json_extract(t.data,'$.verified_at'),t.updated_at) DESC,t.id DESC LIMIT 10`).all() as any[];
 return {settings,items:rows.map(r=>({id:createHash('sha256').update('notice:'+r.id).digest('hex').slice(0,24),name:publicNoticeName(r.name,r.public_name,r.anonymous,settings.mask),...(settings.amount?{amount:Number(r.amount)}:{}),...(settings.program?{program:r.program||'Donasi Umum'}:{})}))};
}
