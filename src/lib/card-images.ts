// This file contains the paths to the pre-generated images for the tarot cards.
// The images themselves should be placed in the public/images/tarot/ folder.

export function slugify(text: string): string {
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

// This creates an object that maps each card name to its corresponding image file path.
// The images should be placed in the `public/images/tarot/` directory.
// For example, the image for 'The Fool' should be at `public/images/tarot/the-fool.png`.
// You can use the Image Generator page at /admin/image-generator to create these images.
export const cardImageMap: { [key: string]: string } = cardNames.reduce((acc, cardName) => {
  // A fallback image is used until the real one is generated and saved.
  const imageUrl = `/images/tarot/${slugify(cardName)}.png`;
  const fallbackImageUrl = 'https://placehold.co/250x440.png';

  // For the purpose of this example, we'll use a generic fallback for all.
  // In a real project, you would check if the file exists before deciding.
  // For now, we will just point to the final destination. The Next.js image
  // component will show the alt text if the image is missing.
  acc[cardName] = imageUrl;
  return acc;
}, {} as { [key: string]: string });
