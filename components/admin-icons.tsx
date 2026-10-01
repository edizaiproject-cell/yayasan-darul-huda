// Shared lightweight outline icons; the project has no icon-library dependency.
const paths:Record<string,string>={
 plus:'M12 5v14 M5 12h14',bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',external:'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',check:'M5 12l4 4L19 6',

 book:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3z M12 6v15',
 quran:'M3 6q5-3 9 1 4-4 9-1v13q-5-3-9 1-4-4-9-1z M12 7v13 M8 3h8 M6 10h2 M16 10h2',
 calculator:'M5 3h14v18H5z M8 6h8v4H8z M8 14h1 M15 14h1 M8 18h1 M15 18h1',
 globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
 computer:'M3 4h18v13H3z M8 21h8 M12 17v4',
 flask:'M9 3h6 M10 3v6L4 19q-1 2 2 2h12q3 0 2-2L14 9V3 M7 14h10',
 activity:'M2 12h5l3-9 4 18 3-9h5',
 pen:'M4 16L16 4l4 4L8 20H4z M14 6l4 4',
 search:'M18 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6',
 download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
 calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 18h2',
 photo:'M3 4h18v16H3z M3 16l5-5 5 5 3-3 5 5 M15 8h.01',
 wallet:'M3 6h17v14H3z M3 6V4h15 M16 11h5v5h-5z',
 bank:'M3 9l9-6 9 6z M5 11v7 M10 11v7 M15 11v7 M19 11v7 M3 21h18',
 people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
 megaphone:'M3 10h5l12-5v14L8 14H3z M7 14l2 7h4l-3-6',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
 dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 Konten:'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h3 M8 18h8',
 Lembaga:'M3 21h18 M5 21V8h14v13 M3 8l9-5 9 5 M9 11v6 M15 11v6',
 Informasi:'M12 8v1 M12 12v5 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 Donasi:'M12 12s-7-4-7-7a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 3-7 7-7 7 M3 15h5l4 3h5l4-3 M3 21h11l7-5',
 Tampilan:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3a5 5 0 0 0 0-10z M7 8h.01 M11 6h.01 M16 7h.01 M6 13h.01',
 Sistem:'M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7z M9 12l2 2 4-4',
 chevron:'M9 5l7 7-7 7',collapse:'M15 5l-7 7 7 7 M3 3v18',menu:'M4 6h16 M4 12h16 M4 18h16',close:'M6 6l12 12 M18 6L6 18',more:'M12 5h.01 M12 12h.01 M12 19h.01'
};
export function AdminIcon({name}:{name:string}){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.Sistem}/></svg>}
