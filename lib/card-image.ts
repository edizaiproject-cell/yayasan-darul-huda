import {imagePosition} from './media-presets.ts';
export const cardPositionFields=[{key:'image_position_x',label:'Posisi gambar horizontal',type:'number'},{key:'image_position_y',label:'Posisi gambar vertikal',type:'number'}];
export function cardImagePosition(item:Record<string,any>){
 const legacy=imagePosition(item.image||'').split(' ').map(v=>parseFloat(v));
 const coordinate=(value:any,fallback:number)=>value==null||value===''?fallback:Math.max(0,Math.min(100,Number(value)||0));
 const x=coordinate(item.image_position_x,legacy[0]),y=coordinate(item.image_position_y,legacy[1]);
 return {x,y,css:`${x}% ${y}%`};
}
export function CardPlaceholderTheme(title:string){return /asrama|bangun/i.test(title)?'house':/pustaka|buku/i.test(title)?'books':'care'}
