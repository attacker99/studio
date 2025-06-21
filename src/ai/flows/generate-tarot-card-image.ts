'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a single tarot card image.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {TAROT_DECK} from '@/lib/tarot';

const GenerateTarotCardImageInputSchema = z.object({
  cardName: z.enum(TAROT_DECK).describe('The name of the tarot card to generate.'),
});
export type GenerateTarotCardImageInput = z.infer<typeof GenerateTarotCardImageInputSchema>;

const GenerateTarotCardImageOutputSchema = z.object({
  cardName: z.string(),
  imageUrl: z.string().describe("A data URI of the generated image. Expected format: 'data:image/png;base64,<encoded_data>'."),
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
  async (input) => {
    const { cardName } = input;
    
    // Improved prompt to be more specific and reliable
    const imagePrompt = `An artistic, professional illustration of the "${cardName}" tarot card, reimagined for a cat-themed deck called "Degen Tarot Cat".
The main character or characters in the card MUST be cats, embodying the spirit of the card. The cat should have a slightly chaotic, "degen" but wise vibe.
Key elements and classic symbolism of the tarot card must be present, but adapted to the cat theme.
The style should be mystical, fantasy art, with rich colors and intricate details.
The background MUST be a dark, cosmic, celestial, or nebula scene. DO NOT use a solid color or white background.
The image must have rounded corners like a playing card.
The card name should NOT be written on the image.
If the card is a numbered suit card (e.g., 'Six of Swords'), the image MUST depict the correct number of items (e.g., exactly 6 swords). For example, The "Three of Cups" should show three cats celebrating with three cups.
`;

    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: imagePrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media.url) {
        throw new Error(`Image generation failed for ${cardName}`);
      }
      
    return {
      cardName,
      imageUrl: media.url,
    };
  }
);
