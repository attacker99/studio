
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

// Step 1: LLM decides how many cards to draw.
const drawDecisionSchema = z.object({
    cardsToDraw: z.number().min(0).max(3).describe("The number of cards to draw (0-3). Choose 0 if no new cards are needed to answer the question."),
    reason: z.string().describe("A brief, cat-like reason for the decision. e.g., 'The vibes are telling me we need more tea.' or 'Nah, we got this, fam.'"),
});

const decideToDrawPrompt = ai.definePrompt({
    name: 'decideToDrawPrompt',
    input: { schema: ClarifyTarotReadingInputSchema },
    output: { schema: drawDecisionSchema },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader.
A user has a follow-up question. Your first job is to decide if drawing more cards is the move, and if so, how many (1-3).

Analyze the user's question. If it asks for a new perspective, about the future, or 'what should I do?', drawing cards is a total slay. If they just want more detail on an existing card, you probably don't need to draw any new cards (cardsToDraw should be 0).

**Reading Context:**
- User's Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation & Cards: "{{{initialInterpretation}}}"
- User's Follow-up Question: "{{{followUpQuestion}}}"

Your decision, make it quick, kitten:`
});

// Step 2: LLM interprets the drawn cards (or just answers the question).
const CardInterpretationInputSchema = ClarifyTarotReadingInputSchema.extend({
    newlyDrawnCards: z.array(CardDrawnSchema).describe("The new cards that were just drawn for clarification. Empty if no cards were drawn.")
});

const SingleCardInterpretationSchema = z.object({
    cardName: z.string(),
    interpretation: z.string().describe("The specific, cat-like, gen-alpha interpretation for this single card in the context of the user's follow-up question."),
});

const InterpretationOutputSchema = z.object({
    overallInterpretation: z.string().describe("A cohesive summary that ties the interpretations of the individual cards together to answer the user's follow-up question. This should be written in a cat-like, gen-alpha tone. IMPORTANT: You MUST NOT mention any tarot card names in this field. All specific card interpretations must be in the 'cardInterpretations' field."),
    cardInterpretations: z.array(SingleCardInterpretationSchema).describe("An array containing the interpretation for EACH newly drawn card provided in the input. The length of this array MUST match the length of the 'newlyDrawnCards' input array.")
});

const interpretationPrompt = ai.definePrompt({
    name: 'interpretationPrompt',
    input: { schema: CardInterpretationInputSchema },
    output: { schema: InterpretationOutputSchema },
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user had a follow-up question: "{{{followUpQuestion}}}"

{{#if newlyDrawnCards}}
To get the tea, you just pulled these cards:
{{#each newlyDrawnCards}}
- {{{cardName}}}{{#if reversed}} (Reversed){{/if}}
{{/each}}

Your job is to interpret EACH of these cards and then give an overall summary.
For each card in the \`newlyDrawnCards\` input, you MUST create a corresponding entry in the \`cardInterpretations\` output array.
Then, write a final \`overallInterpretation\` that puts it all together to answer their question.
IMPORTANT: Do NOT mention any card names in the \`overallInterpretation\` field. That field is only for the summary. Slay.
{{else}}
You decided not to draw any new cards. Just answer their question directly in the \`overallInterpretation\` field based on the original reading. The \`cardInterpretations\` array should be empty. Keep it real.
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
    // Step 1: Decide how many cards to draw
    const decisionResult = await decideToDrawPrompt(input);
    const decision = decisionResult.output!;

    let newlyDrawnCards: z.infer<typeof CardDrawnSchema>[] = [];

    // Step 2: If the decision is to draw, then draw them from the remaining deck.
    if (decision.cardsToDraw > 0) {
        const availableCards = TAROT_DECK.filter(c => !input.allDrawnCardNames.includes(c));
        if (availableCards.length >= decision.cardsToDraw) {
            const drawn = await drawCards(decision.cardsToDraw, availableCards);
            newlyDrawnCards = drawn.map(c => ({ cardName: c.name, reversed: c.reversed }));
        }
    }
    
    // Step 3: Get structured interpretation for the results (with or without new cards)
    const interpretationResult = await interpretationPrompt({
        ...input,
        newlyDrawnCards,
    });
    const interpretation = interpretationResult.output!;

    // Step 4: Assemble the final human-readable response from the structured data.
    // This process ensures the text matches the data.
    let finalClarification = interpretation.overallInterpretation;

    if (interpretation.cardInterpretations && interpretation.cardInterpretations.length > 0) {
        const cardDetails = interpretation.cardInterpretations.map(ci => {
            // Find the original card data to check if it was reversed
            const card = newlyDrawnCards.find(c => c.cardName === ci.cardName);
            const displayName = card?.reversed ? `${ci.cardName} (Reversed)` : ci.cardName;
            return `\n\n**${displayName}**: ${ci.interpretation}`;
        }).join('');

        const preamble = "The plot thickens! To get more tea, I pulled these cards for you:";
        finalClarification = `${preamble}${cardDetails}\n\n**The Lowdown:** ${interpretation.overallInterpretation}`;
    }

    // Step 5: Return the final, structured result for the frontend.
    return {
        clarification: finalClarification,
        cardsDrawn: newlyDrawnCards
    };
  }
);
