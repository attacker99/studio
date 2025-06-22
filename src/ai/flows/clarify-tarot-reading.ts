
'use server';
/**
 * @fileOverview Provides follow-up clarification for a tarot reading.
 * The AI assistant will analyze the user's follow-up question, decide whether to draw 1-3 new cards,
 * draw them, and provide a cohesive interpretation.
 *
 * - clarifyTarotReading - A function that handles the clarification process.
 * - ClarifyTarotReadingInput - The input type for the clarifyTarotReading function.
 * - ClarifyTarotReadingOutput - The return type for the clarifyTarotReading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { TAROT_DECK, drawCards } from '@/lib/tarot';

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

// Step 1: LLM decides whether to draw cards or not.
const drawDecisionSchema = z.object({
    shouldDraw: z.boolean().describe("Whether or not to draw new cards to answer the user's follow-up question."),
    reason: z.string().describe("A brief, cat-like reason for the decision. e.g., 'The vibes are telling me we need more tea.' or 'Nah, we got this, fam.'"),
    cardsToDraw: z.number().min(0).max(3).describe("How many cards to draw. Should be 0 if shouldDraw is false.")
});

const decideToDrawPrompt = ai.definePrompt({
    name: 'decideToDrawPrompt',
    input: { schema: ClarifyTarotReadingInputSchema },
    output: { schema: drawDecisionSchema },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader.
A user has a follow-up question. Your first job is to decide if drawing more cards is the move.

Analyze the user's question. If it asks for a new perspective, about the future, or 'what should I do?', drawing cards is a total slay. If they just want more detail on an existing card, you might not need to.

Decide if you should draw, how many cards (1-3), and give a quick reason.

**Reading Context:**
- User's Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation & Cards: "{{{initialInterpretation}}}"
- User's Follow-up Question: "{{{followUpQuestion}}}"

Your decision, make it quick, kitten:`
});

// Step 2: LLM interprets the drawn cards (or just answers the question).
const InterpretationInputSchema = ClarifyTarotReadingInputSchema.extend({
    newlyDrawnCards: z.array(CardDrawnSchema).describe("The new cards that were just drawn for clarification. Empty if no cards were drawn.")
});

const interpretationPrompt = ai.definePrompt({
    name: 'interpretationPrompt',
    input: { schema: InterpretationInputSchema },
    output: { schema: z.object({ clarification: z.string() }) },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user had a follow-up question: "{{{followUpQuestion}}}"

{{#if newlyDrawnCards}}
To get the tea, you just pulled these cards:
{{#each newlyDrawnCards}}
- {{{cardName}}}{{#if reversed}} (Reversed){{/if}}
{{/each}}

Now, give the lowdown. Interpret these new cards to directly answer their question. Connect it back to the original reading. Slay. You MUST state the names of the cards you drew in your response.
{{else}}
You decided not to draw any new cards. Just answer their question directly based on the original reading. Keep it real.
{{/if}}

Original question: "{{{question}}}"
Original interpretation: "{{{initialInterpretation}}}"

Spill the tea, bestie:`
});


const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    // Step 1: Decide whether to draw cards
    const decisionResult = await decideToDrawPrompt(input);
    const decision = decisionResult.output!;

    let newlyDrawnCards: z.infer<typeof CardDrawnSchema>[] = [];

    // Step 2: If the decision is to draw, then draw them.
    if (decision.shouldDraw && decision.cardsToDraw > 0) {
        const availableCards = TAROT_DECK.filter(c => !input.allDrawnCardNames.includes(c));
        if (availableCards.length >= decision.cardsToDraw) {
            const drawn = await drawCards(decision.cardsToDraw, availableCards);
            newlyDrawnCards = drawn.map(c => ({ cardName: c.name, reversed: c.reversed }));
        }
    }
    
    // Step 3: Interpret the results (with or without new cards)
    const interpretationResult = await interpretationPrompt({
        ...input,
        newlyDrawnCards,
    });
    const interpretation = interpretationResult.output!;

    // Step 4: Return the final, structured result.
    return {
        clarification: interpretation.clarification,
        cardsDrawn: newlyDrawnCards
    };
  }
);
