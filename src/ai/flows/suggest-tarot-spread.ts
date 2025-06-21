'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting a tarot spread based on a user's question.
 *
 * The flow takes a question as input and returns a suggested tarot spread.
 * The spread suggestion is based on the question and is intended to help the user find a relevant spread for their query.
 *
 * @fileOverview This file defines a Genkit flow for suggesting a tarot spread based on a user's question.
 * @fileOverview Contains the `suggestTarotSpread` function, `SuggestTarotSpreadInput` type, and `SuggestTarotSpreadOutput` type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTarotSpreadInputSchema = z.object({
  question: z.string().describe('The user question for the tarot reading.'),
});
export type SuggestTarotSpreadInput = z.infer<typeof SuggestTarotSpreadInputSchema>;

const SuggestTarotSpreadOutputSchema = z.object({
  suggestedSpread: z.string().describe('The name of the suggested tarot spread (e.g., "Three Card Spread", "Celtic Cross").'),
  reason: z.string().describe('A brief explanation for why this spread is suitable for the user\'s question.'),
  cardCount: z.number().int().positive().describe('The exact number of cards required for this specific spread.'),
});
export type SuggestTarotSpreadOutput = z.infer<typeof SuggestTarotSpreadOutputSchema>;

export async function suggestTarotSpread(input: SuggestTarotSpreadInput): Promise<SuggestTarotSpreadOutput> {
  return suggestTarotSpreadFlow(input);
}

const suggestTarotSpreadPrompt = ai.definePrompt({
  name: 'suggestTarotSpreadPrompt',
  input: {schema: SuggestTarotSpreadInputSchema},
  output: {schema: SuggestTarotSpreadOutputSchema},
  prompt: `You are an expert tarot reader. A user has a question and needs you to suggest a single, appropriate tarot spread.

Based on the user's question, you must suggest one tarot spread and provide:
1. The name of the spread.
2. The reason this spread is appropriate.
3. The exact number of cards used in the spread.

Common spreads and their card counts:
- Three Card Spread: 3 cards
- Celtic Cross: 10 cards
- Relationship Spread: 5 cards
- Past, Present, Future: 3 cards

User's Question: "{{question}}"
`,
});

const suggestTarotSpreadFlow = ai.defineFlow(
  {
    name: 'suggestTarotSpreadFlow',
    inputSchema: SuggestTarotSpreadInputSchema,
    outputSchema: SuggestTarotSpreadOutputSchema,
  },
  async input => {
    const {output} = await suggestTarotSpreadPrompt(input);
    return output!;
  }
);
