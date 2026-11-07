export function historyDate(value:string):string {
 const d=new Date(value);if(Number.isNaN(d.getTime()))return value;
 const today=new Date().toDateString()===d.toDateString();
 return `${today?'Today':d.toLocaleDateString(undefined,{month:'short',day:'numeric'})} · ${d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`;
}
