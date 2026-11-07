import { Card, CardColor, CardValue, Player } from '../types/game';

export const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  // For each color:
  // one '0', two each of '1'-'9', two each of 'skip', 'reverse', 'draw2'
  COLORS.forEach((color) => {
    // 0
    deck.push({
      id: `card_${idCounter++}_${color}_0`,
      color,
      value: '0',
      score: 0,
    });

    // 1-9 (2 each)
    const numbers: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    numbers.forEach((num) => {
      deck.push({
        id: `card_${idCounter++}_${color}_${num}`,
        color,
        value: num,
        score: parseInt(num, 10),
      });
      deck.push({
        id: `card_${idCounter++}_${color}_${num}`,
        color,
        value: num,
        score: parseInt(num, 10),
      });
    });

    // Action cards (2 each)
    const actions: CardValue[] = ['skip', 'reverse', 'draw2'];
    actions.forEach((act) => {
      deck.push({
        id: `card_${idCounter++}_${color}_${act}`,
        color,
        value: act,
        score: 20,
      });
      deck.push({
        id: `card_${idCounter++}_${color}_${act}`,
        color,
        value: act,
        score: 20,
      });
    });
  });

  // Wild cards (4 standard wild and 4 wild draw 4)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `card_${idCounter++}_wild`,
      color: 'wild',
      value: 'wild',
      score: 50,
    });
    deck.push({
      id: `card_${idCounter++}_wild4`,
      color: 'wild',
      value: 'wild4',
      score: 50,
    });
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Rejection sampling avoids modulo bias; used for fresh decks and recycling.
    const bound=i+1,limit=Math.floor(0x100000000/bound)*bound;
    const word=new Uint32Array(1);do{crypto.getRandomValues(word);}while(word[0]>=limit);
    const j = word[0] % bound;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function isValidPlay(card: Card, topCard: Card, currentColor: CardColor): boolean {
  // Wild cards can always be played
  if (card.color === 'wild') {
    return true;
  }

  // Same color as the currently active color (which may have been set by a wild)
  if (card.color === currentColor) {
    return true;
  }

  // Same number or action symbol as top card
  if (card.value === topCard.value) {
    return true;
  }

  return false;
}

export const BOT_PERSONALITIES = [
  {
    name: 'Gia Glam',
    title: 'Diamond Diva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    quotes: ['✨ Slay darling!', '💅 Not on my watch!', '🔥 Catch this Wild!', '💖 Feelin glamorous!'],
  },
  {
    name: 'Chloé Chic',
    title: 'Velvet High Roller',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    quotes: ['💋 Elegant move.', '👑 The crown stays here.', '🍸 A sip of victory.', '🎀 Perfectly played.'],
  },
  {
    name: 'Sasha Sparkle',
    title: 'Card Countess',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    quotes: ['💎 Sparkling through!', '🌟 Did someone call GLAM?', '🌸 Oooops sorry not sorry!', '⚡ Reversing back to you!'],
  },
  {name:'Emma Rose',title:'',avatar:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',quotes:['Your turn 👀','😂','Nice play!','Not today! 💅']},
];

export function chooseBotMove(
  bot: Player,
  topCard: Card,
  currentColor: CardColor
): { cardToPlay: Card | null; chosenColor?: CardColor; quote?: string } {
  const playableCards = bot.hand.filter((c) => isValidPlay(c, topCard, currentColor));

  if (playableCards.length === 0) {
    return { cardToPlay: null };
  }

  // Strategy:
  // 1. Prefer regular matching cards before wilds to save wilds for tight spots
  // 2. If next player has 1 card left, play Draw2 / Skip / Wild4 aggressively
  const nonWilds = playableCards.filter((c) => c.color !== 'wild');
  let chosenCard: Card;

  if (nonWilds.length > 0) {
    // Check if we have action cards to disrupt
    const actionCards = nonWilds.filter((c) => ['skip', 'draw2', 'reverse'].includes(c.value));
    if (actionCards.length > 0 && Math.random() > 0.35) {
      chosenCard = actionCards[Math.floor(Math.random() * actionCards.length)];
    } else {
      chosenCard = nonWilds[Math.floor(Math.random() * nonWilds.length)];
    }
  } else {
    // Must play a wild
    chosenCard = playableCards[Math.floor(Math.random() * playableCards.length)];
  }

  // If wild, choose the color the bot has the most of in hand
  let chosenColor: CardColor = 'red';
  if (chosenCard.color === 'wild') {
    const colorCounts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
    bot.hand.forEach((c) => {
      if (c.color !== 'wild') colorCounts[c.color]++;
    });

    let bestColor: CardColor = 'red';
    let maxCount = -1;
    COLORS.forEach((col) => {
      if (colorCounts[col] > maxCount) {
        maxCount = colorCounts[col];
        bestColor = col;
      }
    });
    chosenColor = bestColor;
  }

  const quote = Math.random() > 0.65 ? BOT_PERSONALITIES.find(p => p.name === bot.name)?.quotes[Math.floor(Math.random() * 4)] : undefined;

  return { cardToPlay: chosenCard, chosenColor, quote };
}
