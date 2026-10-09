import {servePublicMedia} from '@/lib/media-response';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{file:string}>}){return servePublicMedia((await params).file)}
