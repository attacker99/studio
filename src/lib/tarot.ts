
export const TAROT_DECK = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
  'Ace of Wands', 'Two of Wands', 'Three of Wands', 'Four of Wands', 'Five of Wands',
  'Six of Wands', 'Seven of Wands', 'Eight of Wands', 'Nine of Wands', 'Ten of Wands',
  'Page of Wands', 'Knight of Wands', 'Queen of Wands', 'King of Wands',
  'Ace of Cups', 'Two of Cups', 'Three of Cups', 'Four of Cups', 'Five of Cups',
  'Six of Cups', 'Seven of Cups', 'Eight of Cups', 'Nine of Cups', 'Ten of Cups',
  'Page of Cups', 'Knight of Cups', 'Queen of Cups', 'King of Cups',
  'Ace of Swords', 'Two of Swords', 'Three of Swords', 'Four of Swords', 'Five of Swords',
  'Six of Swords', 'Seven of Swords', 'Eight of Swords', 'Nine of Swords', 'Ten of Swords',
  'Page of Swords', 'Knight of Swords', 'Queen of Swords', 'King of Swords',
  'Ace of Pentacles', 'Two of Pentacles', 'Three of Pentacles', 'Four of Pentacles', 'Five of Pentacles',
  'Six of Pentacles', 'Seven of Pentacles', 'Eight of Pentacles', 'Nine of Pentacles', 'Ten of Pentacles',
  'Page of Pentacles', 'Knight of Pentacles', 'Queen of Pentacles', 'King of Pentacles'
];

/**
 * Shuffles the deck using the Fisher-Yates algorithm with a provided array of random numbers.
 * @param deck The deck to shuffle.
 * @param randomNumbers An array of random numbers to use for shuffling.
 * @returns The shuffled deck.
 */
function fisherYatesShuffle(deck: string[], randomNumbers: number[]): string[] {
  const shuffledDeck = [...deck];
  let currentIndex = shuffledDeck.length;

  while (currentIndex !== 0) {
    // Use a pre-fetched random number to pick an element.
    const randomNumber = randomNumbers[shuffledDeck.length - currentIndex];
    const randomIndex = randomNumber % currentIndex;
    currentIndex--;

    // And swap it with the current element.
    [shuffledDeck[currentIndex], shuffledDeck[randomIndex]] = [
      shuffledDeck[randomIndex], shuffledDeck[currentIndex]];
  }

  return shuffledDeck;
}

/**
 * Shuffles the deck using the standard Fisher-Yates algorithm with Math.random().
 * This is used as a fallback if the quantum source is unavailable.
 * @param deck The deck to shuffle.
 * @returns The shuffled deck.
 */
function standardShuffle(deck: string[]): string[] {
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
}


/**
 * Draws a specified number of cards from the tarot deck.
 * It first attempts to use a true quantum random number source. If that fails,
 * it falls back to a standard pseudo-random shuffle to ensure the app remains functional.
 * @param count The number of cards to draw.
 * @returns A promise that resolves to an array of card names.
 */
export async function drawCards(count: number): Promise<string[]> {
  // We use the ANU Quantum Random Numbers API, which is a trusted public source.
  const deckSize = TAROT_DECK.length;
  const url = `https://qrng.anu.edu.au/API/jsonI.php?length=${deckSize}&type=uint16`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
        throw new Error(`Quantum API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data || data.data.length < deckSize) {
      throw new Error('Invalid or insufficient data from the quantum source.');
    }

    console.log("Successfully shuffled deck with quantum randomness from ANU.");
    const quantumRandomNumbers = data.data as number[];
    const shuffledDeck = fisherYatesShuffle(TAROT_DECK, quantumRandomNumbers);
    return shuffledDeck.slice(0, count);

  } catch (error) {
    console.warn("Could not connect to quantum source. Falling back to standard shuffle.", error);
    const shuffledDeck = standardShuffle(TAROT_DECK);
    return shuffledDeck.slice(0, count);
  }
}
