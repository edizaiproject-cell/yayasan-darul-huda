import type { ReactNode } from 'react';
import './globals.css';
import './media-fields.css';
import './media-library-toolbar.css';
import './information-public.css';
import './appearance.css';
import './admin-theme.css';
import './dashboard-welcome.css';
import './public-theme.css';
import './hero-motion.css';
import './programs.css';
import './home-visual-cards.css';
import './admin-form-spacing.css';
import './donation-lists.css';
import './donation-reports.css';
import './donation-accounts.css';
import './donation-program-editor.css';
import './navigation-builder.css';
import './compact-services.css';
import { Pwa } from '@/components/pwa';
export const metadata={title:'Ma’had Al-Qur’an Darul Huda',description:'Pendidikan Al-Qur’an dan ilmu keislaman yang terjangkau.',manifest:'/manifest.webmanifest',icons:{icon:'/media/image1.png',apple:'/icons/icon-192.png'}};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{if(sessionStorage.getItem("darul-huda-opening-v3-seen")==="1")document.documentElement.dataset.openingSeen="true"}catch{}`}}/><noscript><style>{`.opening-splash{display:none!important}.opening-content.is-covered{visibility:visible!important}body:has(.opening-splash){overflow:auto!important}`}</style></noscript></head><body>{children}<Pwa/></body></html>}

import './list-toolbar.css';
