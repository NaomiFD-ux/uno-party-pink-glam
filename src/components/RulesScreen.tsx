import { ArrowLeft } from 'lucide-react';
const RULES=[
 ['Play a card','Match the current color, number or action symbol. Wild cards, including Wild +4, can be played at any time outside a pending draw stack.'],
 ['Matching numbers','Play several cards with the same number, even in different colors. Playable cards glow white and lift from your hand. A single card plays immediately when tapped. If another card has the same number, tap the cards in the order you want, then tap the face-up pile to play your selection. Tap a selected card again to deselect it. Your first card must match the table; the last card sets the next color.'],
 ['Stack draw cards','Stack +2 only on +2, or +4 only on +4. Colors do not need to match for a +2 stack. Never mix the two types. If you have no matching draw card, the accumulated total is automatically dealt to you and your turn ends. If you have a matching draw card but do not want to play it, press Skip to take the whole accumulated penalty instead.'],
 ['Drawing','Draw one card on a normal turn. If it matches, you can play that drawn card immediately, or press Skip to end your turn without drawing another card. If it does not match, your turn ends. A draw-stack penalty is taken together, not one card at a time.'],
 ['Automatic UNO','UNO is announced automatically when a player reaches one card. Their picture gets a small UNO badge and, when sound is on, their name is announced. There is no forgotten-UNO penalty.'],
 ['Finish on any card','Any card can be your final card. The round ends immediately, including on +2 or +4: nobody draws a finishing-card penalty.'],
 ['No time limit','Take the time you need. There is no countdown or ticking reminder. You will never be forced to draw or lose your turn for taking too long.'],
 ['Skip and Reverse','Skip misses the next player. Reverse changes direction. With two players, Reverse returns play to the same player.'],
 ['No Jump-In or 7–0','Only the active player can play. Sevens and zeroes have no swapping or hand-passing effects.'],
 ['Every round counts','Track rounds won and lost, not card-point scores. Each completed round updates your saved statistics and dated game history.'],
];
export function RulesScreen({onBack}:{onBack:()=>void}) {return <section className="settings-screen"><button className="text-button back-link" onClick={onBack}><ArrowLeft size={17}/> Back</button><h1>How to play</h1><p className="text-sm text-[#87466d] mb-6">Our UNO Party house rules</p><div className="space-y-4">{RULES.map(([title,text])=><article key={title} className="settings-panel"><h2 className="font-heading font-bold text-lg mb-2">{title}</h2><p className="text-sm text-[#574048] leading-relaxed">{text}</p></article>)}</div></section>;}
