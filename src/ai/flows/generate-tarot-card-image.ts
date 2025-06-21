'use server';
/**
 * @fileOverview A flow to generate a single tarot card image.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTarotCardImageInputSchema = z.object({
  cardName: z.string().describe("The name of the tarot card to generate, e.g., 'The Fool' or 'Six of Swords'."),
});
type GenerateTarotCardImageInput = z.infer<typeof GenerateTarotCardImageInputSchema>;

const GenerateTarotCardImageOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated image. Expected format: 'data:image/png;base64,<encoded_data>'."),
  promptUsed: z.string().describe("The exact prompt that was used to generate this image."),
});
export type GenerateTarotCardImageOutput = z.infer<typeof GenerateTarotCardImageOutputSchema>;

export async function generateTarotCardImage(input: GenerateTarotCardImageInput): Promise<GenerateTarotCardImageOutput> {
  return generateTarotCardImageFlow(input);
}

const generateTarotCardImageFlow = ai.defineFlow(
  {
    name: 'generateTarotCardImageFlow',
    inputSchema: GenerateTarotCardImageInputSchema,
    outputSchema: GenerateTarotCardImageOutputSchema,
  },
  async ({ cardName }) => {
    
    const promptText = `A cat-themed tarot card illustration of "${cardName}".
    The style is mystical, dark, and cosmic, with a color palette of deep violets, blacks, and golds.
    The main subject is a cat that embodies the spirit of the card.
    The background is a swirling nebula of stars and cosmic dust.
    Do NOT include any text, borders, or card names in the image.
    The artwork must be detailed, symbolic, and high-quality.
    This image is for a card in a deck called "Degen Tarot Cat".`;
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: promptText,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media) {
      throw new Error('Image generation failed to return media.');
    }

    return {
      imageUrl: media.url,
      promptUsed: promptText,
    };
  }
);
