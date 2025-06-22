
'use server';
/**
 * @fileOverview Provides follow-up clarification for a tarot reading.
 * The AI assistant will analyze the user's follow-up question, decide whether to draw 1-3 new cards,
 * and provide a cohesive interpretation.
 *
 * - clarifyTarotReading - A function that handles the clarification process.
 * - ClarifyTarotReadingInput - The input type for the clarifyTarotReading function.
 * - ClarifyTarotReadingOutput - The return type for the clarifyTarotReading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { TAROT_DECK } from '@/lib/tarot';

const ClarifyTarotReadingInputSchema = z.object({
  question: z.string().describe('The user-provided question for the tarot reading.'),
  spreadName: z.string().describe('The name of the chosen tarot spread.'),
  initialInterpretation: z.string().describe("The full initial interpretation that was given to the user, which includes the initially drawn cards."),
  followUpQuestion: z.string().describe("The user's follow-up question about the reading."),
  allDrawnCardNames: z.array(z.string()).describe("A list of all card names that have been drawn in this session so far."),
});
export type ClarifyTarotReadingInput = z.infer<typeof ClarifyTarotReadingInputSchema>;

const CardDrawnSchema = z.object({
  cardName: z.string().describe("The name of the drawn card."),
  reversed: z.boolean().describe("Whether the card was drawn reversed.")
});

const ClarifyTarotReadingOutputSchema = z.object({
  clarification: z.string().describe('The answer to the user\'s follow-up question. If new cards were drawn, their names and interpretation MUST be included in this text.'),
  cardsDrawn: z.array(CardDrawnSchema).describe("A list of the 1-3 new cards drawn for clarification. This should be an empty array if no new cards were drawn.")
});
export type ClarifyTarotReadingOutput = z.infer<typeof ClarifyTarotReadingOutputSchema>;

export async function clarifyTarotReading(input: ClarifyTarotReadingInput): Promise<ClarifyTarotReadingOutput> {
  return clarifyTarotReadingFlow(input);
}

const clarifyTarotReadingPrompt = ai.definePrompt({
    name: 'clarifyTarotReadingPrompt',
    input: { schema: ClarifyTarotReadingInputSchema },
    output: { schema: ClarifyTarotReadingOutputSchema },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a follow-up question about a tarot reading.
Your task is to analyze their question, provide a clarifying response, and decide if you need to draw 1-3 new cards to help answer it.

1.  **Analyze the Question:** Read the user's follow-up question carefully.
2.  **Decide to Draw:** Based on the question, decide if drawing 1-3 new cards would provide a better answer. For example, if they ask 'what should I do?' or ask about a new angle, drawing cards is a good move. If they just want more detail on a card already drawn, you might not need to draw.
3.  **Draw from Remaining Deck:** If you decide to draw, you MUST choose cards from the "Available Cards" list below. Do not use any cards from the "Cards Already Drawn" list. You can choose to draw them upright or Reversed.
4.  **Populate Output:**
    *   \`cardsDrawn\`: Fill this array with the names and reversed status of the cards you chose to draw. If you didn't draw any cards, make this an empty array.
    *   \`clarification\`: Write your response here. If you drew new cards, you MUST state their names (e.g., "The Tower (Reversed)") in the text and provide a cohesive interpretation that integrates their meaning to directly answer the user's follow-up question. Connect it back to the original reading if it makes sense. Slay. If you don't draw new cards, just provide a direct answer.

**Reading Context:**
- User's Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation & Cards: "{{{initialInterpretation}}}"
- User's Follow-up Question: "{{{followUpQuestion}}}"

**Deck Status:**
- Cards Already Drawn: {{{json allDrawnCardNames}}}
- Available Cards: {{{json availableCards}}}

Now, provide your clarification and list any cards you drew in the 'cardsDrawn' field.
`,
});

const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    const availableCards = TAROT_DECK.filter(c => !input.allDrawnCardNames.includes(c));

    const result = await clarifyTarotReadingPrompt({
      ...input,
      // @ts-ignore - Adding a property not in the schema for prompt context
      availableCards,
    });
    
    return result.output!;
  }
);
