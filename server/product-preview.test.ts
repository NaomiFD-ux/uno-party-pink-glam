import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProduct,productURL,publicAddress} from './product-preview';
test('product links and resolved addresses exclude private and special network targets',()=>{
 for(const ip of ['0.0.0.0','10.1.2.3','100.64.1.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.5','198.18.0.1','224.1.1.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::'])assert.equal(publicAddress(ip),false,ip);
 for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])assert.equal(publicAddress(ip),true,ip);
 for(const url of ['file:///etc/passwd','http://shop.com','https://user:secret@shop.com','https://shop.com:8443','https://localhost','https://box.local','javascript:alert(1)'])assert.throws(()=>productURL(url));
 assert.equal(productURL('https://shop.example/item#top').href,'https://shop.example/item');
});
test('product metadata prefers structured product data and never invents missing prices',()=>{
 const html=`<meta property="og:title" content="Fallback"><meta content="Our Store" property="og:site_name"><meta property="og:image" content="/fallback.jpg"><script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Pink &amp; Gold Gift","image":["https://images.example/gift.jpg"],"offers":[{"price":"29.50","priceCurrency":"USD"}]}]}</script>`;
 assert.deepEqual(parseProduct(html,new URL('https://shop.example/item')),{url:'https://shop.example/item',title:'Pink & Gold Gift',image:'https://images.example/gift.jpg',price:'29.50',currency:'USD',store:'Our Store'});
 const partial=parseProduct(`<meta property='og:title' content='Nice &quot;Gift&quot;'><meta property='og:image' content='javascript:bad'><script type="application/ld+json">{broken}</script>`,new URL('https://shop.example/item'));
 assert.equal(partial.title,'Nice "Gift"');assert.equal(partial.price,'');assert.equal(partial.image,'');
});
