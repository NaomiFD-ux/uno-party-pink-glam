// Find the leading edge of the main impact rather than starting at MP3 silence.
export function impactOffset(samples:Float32Array,sampleRate:number):number {
 const window=Math.max(1,Math.floor(sampleRate*.005));const energy:number[]=[];
 for(let i=0;i<samples.length;i+=window){let sum=0;for(let j=i;j<Math.min(i+window,samples.length);j++)sum+=samples[j]*samples[j];energy.push(Math.sqrt(sum/window));}
 if(!energy.length)return 0;
 const maximum=Math.max(...energy);if(maximum<.0001)return 0;
 let frame=energy.indexOf(maximum);
 while(frame>0&&energy[frame-1]>maximum*.08)frame--;
 return Math.max(0,frame*window/sampleRate-.003);
}
