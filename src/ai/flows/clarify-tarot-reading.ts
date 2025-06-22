
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
import { TAROT_DECK, drawCards } from '@/lib/tarot';

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
  newlyDrawnCard: z.object({
      cardName: z.string(),
      reversed: z.boolean(),
  }).optional(),
});
export type ClarifyTarotReadingInput = z.infer<typeof ClarifyTarotReadingInputSchema>;

const ClarifyingCardSchema = z.object({
    cardName: z.string(),
    reversed: z.boolean(),
}).optional().describe("The clarifying card that was drawn, if any.");

const ClarifyTarotReadingOutputSchema = z.object({
  clarification: z.string().describe('The answer to the user\'s follow-up question, or an interpretation of a new clarifying card.'),
  drawnCard: ClarifyingCardSchema,
});
export type ClarifyTarotReadingOutput = z.infer<typeof ClarifyTarotReadingOutputSchema>;

export async function clarifyTarotReading(input: Omit<ClarifyTarotReadingInput, 'newlyDrawnCard'>): Promise<ClarifyTarotReadingOutput> {
  return clarifyTarotReadingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clarifyTarotReadingPrompt',
  input: {schema: ClarifyTarotReadingInputSchema},
  output: {schema: z.object({ clarification: z.string() })},
  prompt: `You are a Degen Tarot Cat. You're a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

You already did a tarot reading for a user. Here's the recap:
- User's Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Cards Pulled:
{{#each spreadParts}}
  - {{{label}}}: {{#each cards}}{{{this.cardName}}}{{#if this.reversed}} (Reversed){{/if}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}
- Your Interpretation: "{{{initialInterpretation}}}"

Now, the user has a follow-up question:
"{{{followUpQuestion}}}"

{{#if newlyDrawnCard}}
To answer them, you just drew a clarifying card using quantum randomness from the remaining cards in the deck. The card is: **{{newlyDrawnCard.cardName}}{{#if newlyDrawnCard.reversed}} (Reversed){{/if}}**.
Your task is to interpret THIS clarifying card in the context of their original question and reading. Start your response with something like "Bet, the quantum void just coughed up this hairball for ya...". Then give a short, punchy interpretation of what this new card means for their situation.
{{else}}
Your task is to answer their follow-up question directly, without drawing any new cards. Just give them the details they asked for. Keep it real.
{{/if}}`,
});

const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema.omit({ newlyDrawnCard: true }),
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    const keywords = ['draw', 'card', 'clarify', 'pull', 'another', 'one more'];
    const followUp = input.followUpQuestion.toLowerCase();
    const shouldDraw = keywords.some(k => followUp.includes(k));

    let newlyDrawnCard: { name: string; reversed: boolean; } | undefined = undefined;

    if (shouldDraw) {
      const drawnCardNames = input.spreadParts.flatMap(part => part.cards.map(c => c.cardName));
      const remainingDeck = TAROT_DECK.filter(c => !drawnCardNames.includes(c));
      
      if (remainingDeck.length > 0) {
        const [drawnResult] = await drawCards(1, remainingDeck);
        newlyDrawnCard = {
            name: drawnResult.name,
            reversed: drawnResult.reversed,
        };
      }
    }

    const promptInput = {
        ...input,
        newlyDrawnCard: newlyDrawnCard ? { cardName: newlyDrawnCard.name, reversed: newlyDrawnCard.reversed } : undefined,
    };

    const { output } = await prompt(promptInput);
    
    return {
      clarification: output!.clarification,
      drawnCard: newlyDrawnCard ? { cardName: newlyDrawnCard.name, reversed: newlyDrawnCard.reversed } : undefined,
    };
  }
);
