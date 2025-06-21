
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
  prompt: `You are a tarot expert. Given the user's question, the chosen spread, and the drawn cards organized by their position, provide an insightful interpretation.
It is very important that for each card, you explicitly state its position and then interpret the card's meaning in that specific context. For clarity, please put each card's interpretation on a new line. Start the line with the position label and card name.
If it is a comparison spread, make sure to compare the two options in your interpretation, helping the user make a decision.

Question: {{{question}}}
Spread Name: {{{spreadName}}}

Cards Drawn:
{{#each spreadParts}}
### {{{label}}}
{{#each cards}}
- {{{positionLabel}}}: {{{cardName}}}
{{/each}}
{{/each}}

Interpretation:`,
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
