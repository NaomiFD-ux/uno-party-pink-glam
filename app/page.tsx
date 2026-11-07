'use client';
import dynamic from 'next/dynamic';
const UnoParty=dynamic(()=>import('../src/App'),{ssr:false,loading:()=> <main className="auth-page"><p className="auth-intro">Opening your table…</p></main>});
export default function Page(){return <UnoParty/>;}
