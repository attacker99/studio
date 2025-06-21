
// src/ai/flows/interpret-tarot-cards.ts
'use server';

/**
 * @fileOverview Interprets the drawn tarot cards within the context of the chosen spread and the user's question.
 *
 * - interpretTarotCards - A function that interprets the tarot cards.
 * - InterpretTarotCardsInput - The input type for the interpretTarotCards function.
 * - InterpretTarotCardsOutput - The return type for the interpretTarotCards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CardWithPositionSchema = z.object({
  cardName: z.string().describe("The name of the drawn card."),
  positionLabel: z.string().describe("The label describing the meaning of this card's position in the spread."),
});

const SpreadPartWithCardsSchema = z.object({
  label: z.string().describe("The label for this part of the spread, matching what was suggested."),
  cards: z.array(CardWithPositionSchema).describe("The cards drawn for this part of the spread, each with its position label."),
});

const InterpretTarotCardsInputSchema = z.object({
  question: z.string().describe('The user-provided question for the tarot reading.'),
  spreadName: z.string().describe('The name of the chosen tarot spread.'),
  spreadParts: z.array(SpreadPartWithCardsSchema).describe("An array of the cards drawn, organized by their part in the spread."),
});
export type InterpretTarotCardsInput = z.infer<typeof InterpretTarotCardsInputSchema>;

const InterpretTarotCardsOutputSchema = z.object({
  interpretation: z.string().describe('The interpretation of the tarot cards within the context of the spread and question.'),
});
export type InterpretTarotCardsOutput = z.infer<typeof InterpretTarotCardsOutputSchema>;

export async function interpretTarotCards(input: InterpretTarotCardsInput): Promise<InterpretTarotCardsOutput> {
  return interpretTarotCardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretTarotCardsPrompt',
  input: {schema: InterpretTarotCardsInputSchema},
  output: {schema: InterpretTarotCardsOutputSchema},
  prompt: `You are a Degen Tarot Cat. You're a chronically online, gen-alpha cat who is also a legendary tarot reader. You're a bit chaotic, but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone. Keep it real, no fluff.

Your task is to interpret a tarot reading based on the user's question, the chosen spread, and the drawn cards.

Here are your instructions, listen up:
1.  Start by saying something like: "Aight, let's see what the cards are saying for your '{{{spreadName}}}' spread. It's giving..."
2.  For each card, state its position, then the card name, then give the lowdown. Be dramatic. Make it punchy. Start each one on a new line.
3.  If it's a comparison spread, you GOTTA compare the two options. Help them make a choice, for real. Make it a vibe check.

Reading Deets:
Question: {{{question}}}
Spread: {{{spreadName}}}

Cards Pulled:
{{#each spreadParts}}
### {{{label}}}
{{#each cards}}
- {{{positionLabel}}}: {{{cardName}}}
{{/each}}
{{/each}}

Aight, spill the tea, cards:`,
});

const interpretTarotCardsFlow = ai.defineFlow(
  {
    name: 'interpretTarotCardsFlow',
    inputSchema: InterpretTarotCardsInputSchema,
    outputSchema: InterpretTarotCardsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
