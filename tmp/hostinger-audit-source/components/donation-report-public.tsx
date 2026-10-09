import {programType,reportFields,reportValue,publicReport} from '@/lib/donation-report-schema';
import {money} from '@/lib/modules';
type Row=Record<string,any>;
export function DonationReportFacts({program,report}:{program:Row;report:Row}){
 const safe=publicReport(program,report),fields=reportFields(program).filter(f=>!['summary','body','image','alt','photos','document'].includes(f.key));
 const values=fields.flatMap(f=>{const v=reportValue(safe,f);if(v==null||v==='')return [];const formatted=f.key==='amountUsed'?money(Number(v)):f.type==='number'?Number(v).toLocaleString('id-ID')+(f.unit?' '+f.unit:''):String(v);return [{...f,formatted}];});
 const goods=programType(program)==='goods'&&fields.some(f=>f.key==='targetCount')&&fields.some(f=>f.key==='availableCount')&&Number(safe.reportValues?.targetCount)>0;
 return <>{goods&&<p><strong>Progres pengadaan: {Number(safe.reportValues?.availableCount||0).toLocaleString('id-ID')} dari {Number(safe.reportValues.targetCount).toLocaleString('id-ID')} {safe.reportValues.itemType||'barang'}</strong></p>}{values.length>0&&<dl className="report-public-facts">{values.map(f=><div key={f.key}><dt>{f.label}</dt><dd>{f.formatted}</dd></div>)}</dl>}</>;
}
