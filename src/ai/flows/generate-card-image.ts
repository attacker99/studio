
'use server';

/**
 * @fileOverview Generates an image for a given tarot card.
 *
 * - generateCardImage - A function that generates an image for a tarot card.
 * - GenerateCardImageInput - The input type for the generateCardImage function.
 * - GenerateCardImageOutput - The return type for the generateCardImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCardImageInputSchema = z.object({
  cardName: z.string().describe("The name of the tarot card to generate an image for."),
});
export type GenerateCardImageInput = z.infer<typeof GenerateCardImageInputSchema>;

const GenerateCardImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image as a data URI."),
});
export type GenerateCardImageOutput = z.infer<typeof GenerateCardImageOutputSchema>;

export async function generateCardImage(input: GenerateCardImageInput): Promise<GenerateCardImageOutput> {
  return generateCardImageFlow(input);
}

const generateCardImageFlow = ai.defineFlow(
  {
    name: 'generateCardImageFlow',
    inputSchema: GenerateCardImageInputSchema,
    outputSchema: GenerateCardImageOutputSchema,
  },
  async ({ cardName }) => {
    const parts = cardName.split(' ');
    let finalPrompt;

    const numberMap: { [key: string]: number } = {
      'Ace': 1, 'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5,
      'Six': 6, 'Seven': 7, 'Eight': 8, 'Nine': 9, 'Ten': 10
    };
    const suitMap: { [key: string]: string } = {
      'Wands': 'wands or staves',
      'Cups': 'cups or chalices',
      'Swords': 'swords',
      'Pentacles': 'pentacles or coins'
    };

    const numberWord = parts[0];
    const suitWord = parts[2];
    const isNumberedMinorArcana = parts.length === 3 && parts[1] === 'of' && numberMap[numberWord] && suitMap[suitWord];
    
    let promptInstruction = `An artistic, visually stunning tarot card illustration of "${cardName}".`

    if (isNumberedMinorArcana) {
      const number = numberMap[numberWord];
      const suit = suitMap[suitWord];
      promptInstruction += ` The artwork MUST prominently feature exactly ${number} ${suit}. For example, the "Eight of Cups" must show exactly eight cups. This is a strict requirement.`
    }

    finalPrompt = `${promptInstruction} The final image should look like a physical tarot card with clearly visible rounded corners and a consistent border. The card's artwork should be mystical, ethereal, detailed, with symbolic elements, all unified by a dark, cosmic background theme. The style should be reminiscent of the classic Rider-Waite tarot deck, but with a modern, surreal, and a degen cat-like twist. The name '${cardName}' should be written at the bottom of the card in an elegant font.`;

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: finalPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      console.error(`Image generation failed for card: ${cardName}`);
      // Fallback to a placeholder to avoid crashing the app if a single image fails
      return { imageDataUri: 'https://placehold.co/250x400.png' };
    }

    return { imageDataUri: media.url };
  }
);
