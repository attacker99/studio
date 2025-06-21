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
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `An artistic, visually stunning tarot card illustration of "${cardName}". Mystical, ethereal, detailed, with symbolic elements. The style should be reminiscent of the classic Rider-Waite tarot deck, but with a modern, surreal, and a degen cat-like twist. The name '${cardName}' should be written at the bottom of the card in an elegant font.`,
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
