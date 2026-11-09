export function verdictCaption(question:string,tied=false):string {
 if(tied)return 'Double the accusations. 😂';
 const q=question.toLowerCase();
 if(/on my way|getting dressed/.test(q))return 'Still getting dressed 😂';
 if(/chris brown|dance|dancing/.test(q))return 'The living room is their stage 😂';
 if(/lil wayne|ad-lib/.test(q))return 'Ad-libs included, obviously 😂';
 if(/airport|boarding|flight|gate|passport/.test(q))return 'Boarding group: still at home 😂';
 if(/church|sermon|choir|amen|benediction/.test(q))return 'The fellowship hall has entered the chat 😂';
 if(/fries|food|snack|hungry|restaurant|eat|menu/.test(q))return 'Your fries were never safe 😂';
 if(/fall|trip on|stumble|stairs|spill/.test(q))return 'Blaming the floor as we speak 😂';
 if(/movie|episode|tv|character/.test(q))return 'Already asking who that is 😂';
 if(/trip|vacation|suitcase|luggage/.test(q))return 'The group itinerary has concerns 😂';
 if(/song|concert|lyrics|artist|music|playlist/.test(q))return 'One song away from a world tour 😂';
 const lines=['The group brought receipts 😂','No names were needed… but we voted anyway 😂','Caught by the group chat 😂','Everybody looked at the same person 😂'];
 return lines[[...question].reduce((sum,c)=>sum+c.charCodeAt(0),0)%lines.length];
}
