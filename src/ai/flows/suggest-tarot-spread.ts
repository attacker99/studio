
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting a tarot spread based on a user's question.
 *
 * The flow takes a question as input and returns a suggested tarot spread.
 * The spread suggestion is based on the question and is intended to help the user find a relevant spread for their query.
 *
 * It can handle both single spreads and comparison spreads (e.g., for "A vs B" questions).
 *
 * @fileOverview Contains the `suggestTarotSpread` function, `SuggestTarotSpreadInput` type, and `SuggestTarotSpreadOutput` type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTarotSpreadInputSchema = z.object({
  question: z.string().describe('The user question for the tarot reading.'),
});
export type SuggestTarotSpreadInput = z.infer<typeof SuggestTarotSpreadInputSchema>;

const SpreadPartSchema = z.object({
  label: z.string().describe("The label for this part of the spread (e.g., 'Past', 'Future', 'Option A: Move to new city', 'Option B: Stay')."),
  cardCount: z.number().int().min(1).describe('The number of cards for this part of the spread.'),
});

const SingleSpreadSuggestionSchema = z.object({
    suggestedSpread: z.string().describe('The name of the suggested tarot spread (e.g., "Three Card Spread", "Celtic Cross", "Comparison Spread").'),
    reason: z.string().describe('A brief explanation for why this spread is suitable for the user\'s question.'),
    parts: z.array(SpreadPartSchema).describe("An array of the parts of the spread. For a simple spread, this will have one element. For a comparison spread, it will have two or more."),
});
export type SingleSpreadSuggestion = z.infer<typeof SingleSpreadSuggestionSchema>;

const SuggestTarotSpreadOutputSchema = z.object({
  suggestions: z.array(SingleSpreadSuggestionSchema).min(1).max(3).describe("A list of 1 to 3 suggested tarot spreads for the user's question."),
});
export type SuggestTarotSpreadOutput = z.infer<typeof SuggestTarotSpreadOutputSchema>;

export async function suggestTarotSpread(input: SuggestTarotSpreadInput): Promise<SuggestTarotSpreadOutput> {
  return suggestTarotSpreadFlow(input);
}

const suggestTarotSpreadPrompt = ai.definePrompt({
  name: 'suggestTarotSpreadPrompt',
  input: {schema: SuggestTarotSpreadInputSchema},
  output: {schema: SuggestTarotSpreadOutputSchema},
  prompt: `You are an expert tarot reader. A user has a question and you must suggest between 1 and 3 different, appropriate tarot spreads.
For each suggestion, you must output the spread as a series of "parts", each with a label and a card count.

- For simple questions, suggest standard spreads with a single part.
- For comparison questions (e.g., "Should I do A or B?"), you MUST suggest a "Comparison Spread". This spread should have two parts, one for each option. For each option, suggest 1, 3, or 5 cards. You must identify the two options from the user's query for the labels.

Example for a simple question:
User's Question: "What is the outlook for my career?"
Your suggested spreads might be:
- suggestions: [
    {
      suggestedSpread: "Three Card Spread",
      reason: "A simple Past, Present, Future spread can provide clear insight.",
      parts: [{ label: "Past, Present, Future", cardCount: 3 }]
    },
    {
      suggestedSpread: "Celtic Cross",
      reason: "A more in-depth spread to explore all facets of your career path.",
      parts: [{ label: "Career Situation", cardCount: 10 }]
    }
  ]


Example for a comparison question:
User's Question: "Should I take the new job offer or stay where I am?"
Your suggested spread must include:
- suggestions: [
    {
      suggestedSpread: "Comparison Spread (3 cards each)",
      reason: "This spread will help you weigh the pros and cons of each option with three key aspects for each.",
      parts: [
        { label: "Option A: Take the new job", cardCount: 3 },
        { label: "Option B: Stay where I am", cardCount: 3 }
      ]
    },
    {
      suggestedSpread: "Comparison Spread (1 card each)",
      reason: "A quick look at the core energy of each choice.",
      parts: [
        { label: "Option A: Take the new job", cardCount: 1 },
        { label: "Option B: Stay where I am", cardCount: 1 }
      ]
    }
  ]

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
