
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

// Prompt 1: Decide how many cards to draw. This is simple and reliable.
const decideCardDrawPrompt = ai.definePrompt({
    name: 'decideCardDrawPromptForClarification',
    input: { schema: z.object({ followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion, initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation }) },
    output: { schema: z.object({ drawCount: z.number().min(0).max(3).describe("The number of cards to draw for clarification (0, 1, 2, or 3).") }) },
    prompt: `You are Tarot Bestie, a chaotic but insightful tarot reader. A user has a follow-up question about their reading.
Based on their question and the original reading, decide if drawing more cards would be helpful.
Decide to draw 0, 1, 2, or 3 cards.

Initial Interpretation: "{{{initialInterpretation}}}"
Follow-up Question: "{{{followUpQuestion}}}"

How many cards should be drawn to clarify?`,
});


// Prompt 2A: Generate clarification text for NEWLY DRAWN cards.
// This prompt is ONLY called if new cards are actually drawn.
const interpretNewCardsPrompt = ai.definePrompt({
    name: 'interpretNewCardsForClarificationPrompt',
    input: { schema: z.object({
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
        cardsToInterpret: z.array(CardDrawnSchema).describe("The new cards that were just drawn for clarification. This will never be an empty array."),
    })},
    output: { schema: z.object({ clarification: z.string().describe('The interpretation of the newly drawn cards in the context of the follow-up question.') }) },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user had a follow-up question, and we've drawn some new cards to clarify. Your task is to generate ONLY the interpretation for these new cards.

-   Start your text with "The plot thickens!" or a similar cat-like observation.
-   Then, for each card provided, explain its meaning in relation to the user's follow-up question. Be dramatic.
-   Your interpretation text MUST focus exclusively on the cards provided in the 'cardsToInterpret' input. Do not mention any other cards.

Follow-up Question: "{{{followUpQuestion}}}"
Newly Drawn Cards to Interpret:
{{#each cardsToInterpret}}
- {{{cardName}}}{{#if reversed}} (Reversed){{/if}}
{{/each}}

Now, spill the tea, what do these new cards mean?`,
});


// Prompt 2B: Generate clarification text when NO new cards are drawn.
// This prompt is ONLY called if no new cards are drawn.
const answerWithoutNewCardsPrompt = ai.definePrompt({
    name: 'answerWithoutNewCardsPrompt',
    input: { schema: z.object({
        initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation,
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
    })},
    output: { schema: z.object({ clarification: z.string().describe('The answer to the user\'s follow-up question, based only on the initial reading.') }) },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user had a follow-up question, but we've decided not to draw any new cards to answer it. The answer is already in the original reading.

Your task is to generate ONLY the clarification text.
-   You MUST start your text with "Bet. We don't need to pull more fluff for this, the tea is already in the cards we got." or something similar.
-   Then, answer the follow-up question by re-examining the initial interpretation provided below.
-   You MUST NOT mention drawing any new cards.

Initial Interpretation: "{{{initialInterpretation}}}"
Follow-up Question: "{{{followUpQuestion}}}"

Now, what's the tea based on what we already know?`,
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

    // 3. Generate clarification text using the appropriate prompt
    let clarificationText = '';
    if (drawnCards.length > 0) {
        // Path A: We have new cards to interpret
        const textResponse = await interpretNewCardsPrompt({
            followUpQuestion: input.followUpQuestion,
            cardsToInterpret: drawnCards,
        });
        clarificationText = textResponse.output!.clarification;
    } else {
        // Path B: We have no new cards, so answer from existing context
        const textResponse = await answerWithoutNewCardsPrompt({
            initialInterpretation: input.initialInterpretation,
            followUpQuestion: input.followUpQuestion,
        });
        clarificationText = textResponse.output!.clarification;
    }

    // 4. Assemble the final structured response and return it.
    // The `drawnCards` array comes directly from our code, not the AI, so it is reliable.
    return {
        clarification: clarificationText,
        cardsDrawn: drawnCards,
    };
  }
);
