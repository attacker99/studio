
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
  prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're a bit chaotic, but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a question. You gotta suggest 1 to 3 tarot spreads. Make them sound lit.
For each spread, give me the deets: the name, why it slaps for their question, and the "parts".
Each part needs a label and a list of "positions". Each position label explains what the card means there. The number of positions is how many cards get pulled.

- For basic questions, suggest some fire spreads. Like a "Quick Vibe Check" (3 cards) with positions like 'The Tea from Before', 'What's Cookin' Now', 'The Future's Lookin'...'.
- For comparison questions, like "Should I do A or B?", you HAVE to suggest a "Side-Eye Spread". Two parts, one for each option. Give each option 1, 3, or 5 cards with bussin' position labels. Identify the two options from their question for the part labels.

Example for a simple question:
User's Question: "What's the outlook for my career?"
Your suggestions, make 'em slay:
- suggestions: [
    {
      suggestedSpread: "The Glow Up Spread",
      reason: "A quick vibe check on your career path. No cap, it's gonna give you the 411.",
      parts: [{
        label: "Your Career Arc",
        positions: ["How you started (your flop era)", "Where you're at (your slay era)", "Where you're going (main character energy)"]
      }]
    },
    {
      suggestedSpread: "Situation, Slay, Secured",
      reason: "To understand the bag and how to secure it.",
      parts: [{
        label: "Career Sitch",
        positions: ["The current situation, fr", "What you gotta do to slay", "The bag: secured or fumbled"]
      }]
    }
  ]

Example for a comparison question:
User's Question: "Should I text my ex or nah?"
Your suggestion, make it iconic:
- suggestions: [
    {
      suggestedSpread: "Side-Eye Spread (3 cards each)",
      reason: "This spread is gonna help you weigh the options. Let's see which one is a green flag.",
      parts: [
        {
          label: "Option A: Text the ex",
          positions: ["The potential rizz", "The biggest L", "The final vibe"]
        },
        {
          label: "Option B: Nah, leave 'em on read",
          positions: ["The potential rizz", "The biggest L", "The final vibe"]
        }
      ]
    }
  ]

OK, bet. Here's the user's question: "{{question}}"
`,
  config: {
    timeout: 50000,
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
});

const suggestTarotSpreadFlow = ai.defineFlow(
  {
    name: 'suggestTarotSpreadFlow',
    inputSchema: SuggestTarotSpreadInputSchema,
    outputSchema: SuggestTarotSpreadOutputSchema,
  },
  async input => {
    const {output} = await suggestTarotSpreadPrompt(input);
    if (!output) {
      throw new Error("The AI failed to suggest a spread. Its response may have been blocked for safety reasons.");
    }
    return output;
  }
);
