"use client";
import dynamic from 'next/dynamic';
const Preview=dynamic(()=>import('../../src/components/TablePreview'),{ssr:false});
export default function Page(){return process.env.NODE_ENV==='development'?<Preview/>:null;}
