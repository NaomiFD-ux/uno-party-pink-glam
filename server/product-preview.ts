import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {BlockList,isIP} from 'node:net';
import type {SantaProduct} from '../src/online/santa';
const blocked=new BlockList();
for(const [ip,bits]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(ip,bits,'ipv4');
export function publicAddress(address:string){if(isIP(address)===4)return !blocked.check(address,'ipv4');if(isIP(address)!==6)return false;const ip=address.toLowerCase();return /^[23][0-9a-f]{3}:/.test(ip)&&!ip.startsWith('2001:')&&!ip.startsWith('2002:')&&!ip.startsWith('3fff:');}
export function productURL(raw:string){let url:URL;try{url=new URL(raw);}catch{throw Error('Paste a full https:// product link.');}if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||url.href.length>2000||!url.hostname.includes('.')||url.hostname.endsWith('.local')||url.hostname.endsWith('.localhost'))throw Error('Use a public https:// store link.');url.hash='';return url;}
async function addresses(url:URL){const records=await Promise.race([lookup(url.hostname,{all:true}),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(Error('The store took too long to respond.')),2500);timer.unref();})]);if(!records.length||records.some(record=>!publicAddress(record.address)))throw Error('Use a public store link.');return records[0];}
const decode=(s:string)=>s.replace(/&(?:amp|quot|apos|lt|gt|#39|#x27|#\d+|#x[0-9a-f]+);/gi,token=>{const known:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'"};if(known[token.toLowerCase()])return known[token.toLowerCase()];const n=token[2].toLowerCase()==='x'?parseInt(token.slice(3),16):parseInt(token.slice(2));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});
const clean=(s:unknown,max=250)=>typeof s==='string'?decode(s.replace(/<[^>]*>/g,'')).trim().slice(0,max):'';
export function parseProduct(html:string,url:URL):SantaProduct {
 const meta:Record<string,string>={};
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs:Record<string,string>={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[match[1].toLowerCase()]=decode(match[2]??match[3]??match[4]);const key=attrs.property||attrs.name||attrs.itemprop;if(key&&attrs.content&&!meta[key.toLowerCase()])meta[key.toLowerCase()]=attrs.content;}
 let product:any=null;
 const walk=(value:any,depth=0)=>{if(!value||typeof value!=='object'||depth>12||product)return;if(Array.isArray(value)){for(const row of value)walk(row,depth+1);return;}if([value['@type']].flat().some(v=>v==='Product')){product=value;return;}for(const child of Object.values(value))walk(child,depth+1);};
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(match[1]));}catch{}}
 const offer=Array.isArray(product?.offers)?product.offers[0]:product?.offers;
 const image=Array.isArray(product?.image)?product.image[0]:typeof product?.image==='object'?product.image?.url:product?.image;
 let imageURL='';try{const candidate=new URL(image||meta['og:image']||meta['twitter:image']||'',url);if(candidate.href!==url.href)imageURL=productURL(candidate.href).href;}catch{}
 const price=offer?.price??offer?.priceSpecification?.price??offer?.lowPrice??meta['product:price:amount']??meta['og:price:amount']??meta['price'];
 return {url:url.href,title:clean(product?.name||meta['og:title']||meta['twitter:title']||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])||url.hostname,image:imageURL,price:clean(typeof price==='number'?String(price):price,40),currency:clean(offer?.priceCurrency||offer?.priceSpecification?.priceCurrency||meta['product:price:currency']||meta['og:price:currency'],10),store:clean(meta['og:site_name']||url.hostname.replace(/^www\./,''),80)};
}
export async function fetchProduct(raw:string):Promise<{product:SantaProduct;warning?:string}> {
 let url=productURL(raw);await addresses(url); // Reject local/private targets rather than saving them as fallback links.
 try{
  let html='';
  for(let hop=0;hop<4;hop++){
   const record=await addresses(url);
   const result=await new Promise<{html?:string;redirect?:string}>((resolve,reject)=>{
    const req=request(url,{method:'GET',headers:{'User-Agent':'GameNightWishlist/1.0','Accept':'text/html','Accept-Encoding':'identity'},lookup:((_host:any,options:any,callback:any)=>options?.all?callback(null,[record]):callback(null,record.address,record.family)) as any},res=>{
     if([301,302,303,307,308].includes(res.statusCode||0)){res.resume();if(!res.headers.location)return reject(Error('No product page was found.'));return resolve({redirect:res.headers.location});}
     if(res.statusCode!==200||!res.headers['content-type']?.includes('text/html')||(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity')){res.resume();reject(Error('The store did not share product details.'));return;}
     let body='';res.setEncoding('utf8');res.on('data',part=>{body+=part;if(Buffer.byteLength(body)>1000000){req.destroy(Error('The product page is too large.'));}});res.on('end',()=>resolve({html:body}));res.on('error',reject);
    });const timer=setTimeout(()=>req.destroy(Error('The store took too long to respond.')),3500);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
   });
   if(result.redirect){url=productURL(new URL(result.redirect,url).href);continue;}html=result.html||'';break;
  }
  if(!html)throw Error('No product details were available.');
  const product=parseProduct(html,url);if(product.image){try{await addresses(new URL(product.image));}catch{product.image='';}}
  return {product,...(!product.price||!product.image||product.title===url.hostname?{warning:'The store shared only some details. You can still save the link and add a note.'}:{})};
 }catch{return {product:{url:productURL(raw).href,title:productURL(raw).hostname,store:productURL(raw).hostname,image:'',price:'',currency:''},warning:'This store blocks automatic details. You can still save the link and add a note.'};}
}
