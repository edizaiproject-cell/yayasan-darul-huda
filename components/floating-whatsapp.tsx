import {whatsappLink} from '@/lib/whatsapp';
export function FloatingWhatsapp({settings}:{settings:Record<string,any>}){
 const href=whatsappLink(settings);if(!href)return null;
 return <a className="floating-whatsapp" href={href} target="_blank" rel="noopener noreferrer" aria-label="Hubungi Darul Huda melalui WhatsApp"><svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M16 .8A15.1 15.1 0 0 0 3 23.5L1 31l7.7-2A15.2 15.2 0 1 0 16 .8zm0 27.7c-2.3 0-4.5-.6-6.4-1.8l-.5-.3-4.6 1.2 1.2-4.5-.3-.5A12.6 12.6 0 1 1 16 28.5zm7-9.4c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.4-.2.3-.4.3-.8.1-1.1-.5-2-1-3-2-1-.9-1.6-1.9-1.8-2.3-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2 0-.5 0-.7l-1.2-2.8c-.3-.7-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.4 1.3-1.4 3.1s1.4 3.6 1.6 3.8c.2.3 2.7 4.2 6.5 5.8 2.4 1 3.4 1.1 4.6.9 1-.2 2.3-1 2.6-1.9.4-.9.4-1.7.3-1.9-.1-.1-.3-.2-.7-.4z"/></svg><span className="whatsapp-tooltip">Hubungi kami melalui WhatsApp</span></a>
}
