
'use server';
/**
 * @fileOverview Provides follow-up clarification for a tarot reading.
 * The AI assistant will analyze the user's follow-up question, decide whether to draw 1-3 new cards,
 * and provide a cohesive interpretation based on any newly drawn cards.
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
  cardName: z.string().describe("The name of the drawn card (e.g., 'The Fool', 'Ace of Cups')."),
  reversed: z.boolean().describe("Whether the card was drawn reversed.")
});
export type CardDrawn = z.infer<typeof CardDrawnSchema>;

const ClarifyTarotReadingOutputSchema = z.object({
  clarification: z.string().describe('The answer to the user\'s follow-up question. If new cards were drawn, their names and interpretation MUST be included in this text.'),
  cardsDrawn: z.array(CardDrawnSchema).describe("A list of the 1-3 new cards drawn for clarification. This will be an empty array if no new cards were drawn.")
});
export type ClarifyTarotReadingOutput = z.infer<typeof ClarifyTarotReadingOutputSchema>;

export async function clarifyTarotReading(input: ClarifyTarotReadingInput): Promise<ClarifyTarotReadingOutput> {
  return clarifyTarotReadingFlow(input);
}

// Prompt 1: Decide how many cards to draw.
const decideCardDrawPrompt = ai.definePrompt({
    name: 'decideCardDrawPrompt',
    input: { schema: z.object({ followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion, initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation }) },
    output: { schema: z.object({ drawCount: z.number().min(0).max(3).describe("The number of cards to draw for clarification (0, 1, 2, or 3).") }) },
    prompt: `You are Tarot Bestie, a chaotic but insightful tarot reader. A user has a follow-up question about their reading.
Based on their question and the original reading, decide if drawing more cards would be helpful.
Decide to draw 0, 1, 2, or 3 cards.

Initial Interpretation: "{{{initialInterpretation}}}"
Follow-up Question: "{{{followUpQuestion}}}"

How many cards should be drawn to clarify?`,
});


// Prompt 2: Generate only the clarification text.
const generateClarificationTextPrompt = ai.definePrompt({
    name: 'generateClarificationTextPrompt',
    input: { schema: z.object({
        question: ClarifyTarotReadingInputSchema.shape.question,
        spreadName: ClarifyTarotReadingInputSchema.shape.spreadName,
        initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation,
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
        cardsToInterpretJson: z.string().describe("A JSON string representing the new cards that were just drawn for clarification. This will be an empty array '[]' if no new cards were drawn."),
    })},
    output: { schema: z.object({ clarification: z.string().describe('The answer to the user\'s follow-up question.') }) },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a follow-up question. We have already programmatically drawn the cards, which are provided as a JSON string. This might be an empty array.

Your task is to generate ONLY the clarification text.

-   If the cards JSON IS EMPTY ('[]'), start your text with "Bet. We don't need to pull more fluff for this, the tea is already in the cards we got." or something similar. Then, answer the follow-up question by referencing only the initial interpretation.
-   If the cards JSON IS NOT EMPTY, start your text with "The plot thickens!" or a similar cat-like observation. Then, for each card, explain its meaning in relation to the question. Conclude with a summary. Your interpretation text MUST focus exclusively on the cards provided.

CONTEXT
- Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation: "{{{initialInterpretation}}}"
- Follow-up Question: "{{{followUpQuestion}}}"
- Programmatically Drawn Cards to Interpret (JSON): {{{cardsToInterpretJson}}}

Now, provide just the clarification text.`
});


// Main flow that orchestrates the steps.
const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    // 1. Decide how many cards to draw
    const decisionResponse = await decideCardDrawPrompt({
        followUpQuestion: input.followUpQuestion,
        initialInterpretation: input.initialInterpretation
    });
    const { drawCount } = decisionResponse.output!;

    let drawnCards: CardDrawn[] = [];
    if (drawCount > 0) {
        // 2. If we need to draw, then draw the cards programmatically.
        const availableCards = TAROT_DECK.filter(c => !input.allDrawnCardNames.includes(c));
        console.log(`AI decided to draw ${drawCount} cards. Drawing from ${availableCards.length} available cards.`);
        const actuallyDrawn = await drawCards(drawCount, availableCards);
        drawnCards = actuallyDrawn.map(c => ({ cardName: c.name, reversed: c.reversed }));
    }

    // 3. Generate the clarification text from the AI.
    const textResponse = await generateClarificationTextPrompt({
        question: input.question,
        spreadName: input.spreadName,
        initialInterpretation: input.initialInterpretation,
        followUpQuestion: input.followUpQuestion,
        cardsToInterpretJson: JSON.stringify(drawnCards),
    });

    // 4. Assemble the final structured response and return it.
    return {
        clarification: textResponse.output!.clarification,
        cardsDrawn: drawnCards,
    };
  }
);
