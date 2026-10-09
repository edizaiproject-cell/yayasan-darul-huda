import {CardPlaceholderTheme} from '../lib/card-image';
export function CardImagePlaceholder({title=''}:{title?:string}){
 const theme=CardPlaceholderTheme(title);
 return <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{theme==='house'?<><path d="m14 36 26-22 26 22M22 32v32h36V32M34 64V45h12v19M52 22v-8h8v15"/><path d="M27 38h5M48 38h5"/></>:theme==='books'?<><path d="M16 18h13v46H16zM32 14h13v50H32zM47 23l12-3 11 42-12 3zM19 27h7M35 24h7M35 54h7M54 33l7-2"/></>:<><path d="M17 47h12l12 9h12c8 0 8 9 0 9H33L17 56M13 44l-6 17M53 55l13-10c7-3 11 3 5 8L55 65"/><path d="m40 40-13-12c-10-10 4-21 13-9 9-12 23-1 13 9z"/></>}</svg>;
}
