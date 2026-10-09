'use client';
import {ShareActions} from './share-actions';


export function ProgramIcon({name}:{name:string}){const paths:Record<string,string>={open:'M7 17 17 7M7 7h10v10',edit:'m4 16 12-12 4 4L8 20H4v-4M14 6l4 4',copy:'M9 9h11v11H9zM15 5V3H3v12h2',share:'M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8',publish:'m5 12 4 4L19 6',unpublish:'M8 5v14M16 5v14',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',up:'m6 14 6-6 6 6',down:'m6 10 6 6 6-6'};return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.open}/></svg>}

export function ProgramShare({title}:{title:string}){return <ShareActions title={title}/>;}