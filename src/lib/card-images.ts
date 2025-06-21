import { TAROT_DECK } from './tarot';

export const cardImageMap: { [key: string]: string } = {};

TAROT_DECK.forEach(card => {
  // In a real application, you would replace these placeholders with URLs
  // to your actual, pre-generated card images.
  cardImageMap[card] = 'https://placehold.co/250x440.png';
});
