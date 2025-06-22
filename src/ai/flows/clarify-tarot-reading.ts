
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

// Prompt 2A: Interpret the NEWLY drawn cards.
const interpretClarificationWithCardsPrompt = ai.definePrompt({
    name: 'interpretClarificationWithCardsPrompt',
    input: { schema: z.object({
        question: ClarifyTarotReadingInputSchema.shape.question,
        spreadName: ClarifyTarotReadingInputSchema.shape.spreadName,
        initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation,
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
        cardsToInterpret: z.array(CardDrawnSchema).describe("The new cards that were just drawn for clarification."),
    })},
    output: { schema: z.object({ clarification: ClarifyTarotReadingOutputSchema.shape.clarification }) },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a follow-up question. Based on this question, we have programmatically drawn the cards listed below. Your ENTIRE task is to interpret these cards in the context of the user's question and the initial reading.

- Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation: "{{{initialInterpretation}}}"
- Follow-up Question: "{{{followUpQuestion}}}"

---
CARDS TO INTERPRET:
{{#each cardsToInterpret}}
- {{{this.cardName}}}{{#if this.reversed}} (Reversed){{/if}}
{{/each}}
---
Your interpretation MUST focus *exclusively* on the cards listed above. Start your response with a cat-like observation like "The plot thickens!" or "The cosmic yarn has more tangles!". Then, for each card, explain its meaning in relation to the question. Conclude with a summary. DO NOT mention any other cards.
`
});

// Prompt 2B: Answer the follow-up question WITHOUT drawing new cards.
const answerFollowUpWithoutCardsPrompt = ai.definePrompt({
    name: 'answerFollowUpWithoutCardsPrompt',
    input: { schema: z.object({
        question: ClarifyTarotReadingInputSchema.shape.question,
        spreadName: ClarifyTarotReadingInputSchema.shape.spreadName,
        initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation,
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
    })},
    output: { schema: z.object({ clarification: ClarifyTarotReadingOutputSchema.shape.clarification }) },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a follow-up question about their tarot reading. You have decided NOT to draw any new cards.
Your task is to answer their follow-up question using ONLY the information from the initial reading provided below.
DO NOT invent new information. DO NOT suggest drawing cards. DO NOT mention any cards that were not in the initial interpretation. Simply provide a clarifying answer based on what has already been said.

- Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation: "{{{initialInterpretation}}}"
- Follow-up Question: "{{{followUpQuestion}}}"
`
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

    // 3. Interpret the result by calling the appropriate prompt.
    let clarification = '';
    if (drawnCards.length > 0) {
      const interpretationResponse = await interpretClarificationWithCardsPrompt({
          ...input,
          cardsToInterpret: drawnCards,
      });
      clarification = interpretationResponse.output!.clarification;
    } else {
      const interpretationResponse = await answerFollowUpWithoutCardsPrompt({
          ...input,
      });
      clarification = interpretationResponse.output!.clarification;
    }

    // 4. Assemble and return the final, structured response.
    // `cardsDrawn` is guaranteed to be correct because it was generated by our code.
    // The `clarification` text is now guaranteed to be consistent with the cards drawn.
    return {
        clarification,
        cardsDrawn: drawnCards,
    };
  }
);
