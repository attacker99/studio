'use server';
/**
 * @fileOverview Provides follow-up clarification for a tarot reading.
 *
 * - clarifyTarotReading - A function that handles follow-up questions.
 * - ClarifyTarotReadingInput - The input type for the clarifyTarotReading function.
 * - ClarifyTarotReadingOutput - The return type for the clarifyTarotReading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { TAROT_DECK } from '@/lib/tarot';

const CardWithPositionSchema = z.object({
  cardName: z.string().describe("The name of the drawn card."),
  positionLabel: z.string().describe("The label describing the meaning of this card's position in the spread."),
  reversed: z.boolean().describe("Whether the card was drawn reversed (upside down)."),
});

const SpreadPartWithCardsSchema = z.object({
  label: z.string().describe("The label for this part of the spread, matching what was suggested."),
  cards: z.array(CardWithPositionSchema).describe("The cards drawn for this part of the spread, each with its position label."),
});

const ClarifyTarotReadingInputSchema = z.object({
  question: z.string().describe('The user-provided question for the tarot reading.'),
  spreadName: z.string().describe('The name of the chosen tarot spread.'),
  spreadParts: z.array(SpreadPartWithCardsSchema).describe("An array of the cards drawn, organized by their part in the spread."),
  initialInterpretation: z.string().describe("The full initial interpretation that was given to the user."),
  followUpQuestion: z.string().describe("The user's follow-up question about the reading."),
});
export type ClarifyTarotReadingInput = z.infer<typeof ClarifyTarotReadingInputSchema>;

const ClarifyTarotReadingOutputSchema = z.object({
  clarification: z.string().describe('The answer to the user\'s follow-up question, or an interpretation of a new clarifying card.'),
});
export type ClarifyTarotReadingOutput = z.infer<typeof ClarifyTarotReadingOutputSchema>;

export async function clarifyTarotReading(input: ClarifyTarotReadingInput): Promise<ClarifyTarotReadingOutput> {
  return clarifyTarotReadingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clarifyTarotReadingPrompt',
  input: {schema: ClarifyTarotReadingInputSchema},
  output: {schema: ClarifyTarotReadingOutputSchema},
  prompt: `You are a Degen Tarot Cat. You're a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

You already did a tarot reading for a user. Here's the recap:
- User's Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Cards Pulled:
{{#each spreadParts}}
  - {{{label}}}: {{#each cards}}{{{this.cardName}}}{{#if this.reversed}} (Reversed){{/if}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}
- Your Interpretation: "{{{initialInterpretation}}}"

Now, the user has a follow-up question. This is what they're asking:
"{{{followUpQuestion}}}"

Your task is to answer their follow-up question.
- If they're just asking for more detail on a card or the reading, give it to them. Keep it real.
- If they ask you to draw another card (or a "clarifying card", "one more card", etc.), you need to *pretend* to draw one. Say something like "Bet, let's pull a clarifier card for ya. The vibes are giving..." then you MUST pick a random card from the list below and give a short, punchy interpretation for it in the context of their original question.
- Start your response on a new line.

Here's the list of all possible tarot cards you can pretend to draw from:
${TAROT_DECK.join(', ')}

Okay, let's see what the void has to say this time. Go off.`,
});

const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
