
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

const PositionLabelSchema = z.string().describe("The meaning of a single card's position in the spread (e.g. 'The Past', 'Your challenge', 'Outcome').");

const SpreadPartSchema = z.object({
  label: z.string().describe("The label for this part of the spread (e.g., 'Your Situation', 'Option A: Move to new city')."),
  positions: z.array(PositionLabelSchema).nonempty().describe("An array of labels for each card position in this part of the spread. The number of elements in this array determines the number of cards to draw for this part."),
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
For each suggestion, you must output the spread as a series of "parts". Each part has a label and a list of "positions", where each position has a descriptive label explaining its meaning. The number of positions determines how many cards are drawn for that part.

- For simple questions, suggest standard spreads. For a "Three Card Spread", you would list three position labels like 'Past', 'Present', 'Future'.
- For comparison questions (e.g., "Should I do A or B?"), you MUST suggest a "Comparison Spread". This spread should have two parts, one for each option. For each option, suggest 1, 3, or 5 cards, each with its own position label. You must identify the two options from the user's query for the part labels.

Example for a simple question:
User's Question: "What is the outlook for my career?"
Your suggested spreads might be:
- suggestions: [
    {
      suggestedSpread: "Three Card Spread",
      reason: "A simple Past, Present, Future spread can provide clear insight.",
      parts: [{
        label: "Career Path",
        positions: ["The Past", "The Present", "The Future"]
      }]
    },
    {
      suggestedSpread: "Situation-Action-Outcome",
      reason: "A spread to understand the core of the situation and potential results.",
      parts: [{
        label: "Career Situation",
        positions: ["The current situation", "Recommended action", "The likely outcome"]
      }]
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
        {
          label: "Option A: Take the new job",
          positions: ["Potential of this path", "Challenge of this path", "Key outcome"]
        },
        {
          label: "Option B: Stay where I am",
          positions: ["Potential of this path", "Challenge of this path", "Key outcome"]
        }
      ]
    }
  ]

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
