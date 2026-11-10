import type {Viewport} from 'next';
import '../src/index.css';
import '../src/santa.css';
export const viewport:Viewport={width:'device-width',initialScale:1,interactiveWidget:'overlays-content'};
export const metadata={title:'Game Night · Pink Glam',description:'Your table. Your people. Your game night.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;}

