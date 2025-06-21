// This file contains the paths to the pre-generated images for the tarot cards.
// The images themselves should be placed in the public/images/tarot/ folder.

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

const cardNames = [
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

// In a real app, you would have actual images here. We'll use a single placeholder.
// To add your own images, place them in `public/images/tarot/` and ensure the filenames match the slugified card names.
// For example, 'The Fool' becomes 'the-fool.png'.
const placeholderImage = '/images/tarot/placeholder.png';

export const cardImageMap: { [key: string]: string } = cardNames.reduce((acc, cardName) => {
  // To use unique images, you would generate them and use the slugified name:
  // acc[cardName] = `/images/tarot/${slugify(cardName)}.png`;
  // For now, we use one placeholder for all.
  acc[cardName] = placeholderImage;
  return acc;
}, {} as { [key: string]: string });


// This creates an object like:
// {
//   'The Fool': '/images/tarot/the-fool.png',
//   'The Magician': '/images/tarot/the-magician.png',
//   ...
// }
// For now, we will point all of them to a single placeholder you can replace.
export const realCardImageMap: { [key: string]: string } = cardNames.reduce((acc, cardName) => {
  acc[cardName] = `/images/tarot/${slugify(cardName)}.png`;
  return acc;
}, {} as { [key: string]: string });
