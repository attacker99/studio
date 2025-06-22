
'use server';
/**
 * @fileOverview Provides follow-up clarification for a tarot reading.
 * The AI assistant will analyze the user's follow-up question and decide whether to
 * provide a direct text answer or to draw 1-3 new cards in a custom mini-spread to clarify the reading.
 *
 * - clarifyTarotReading - A function that handles the two-step clarification process.
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
});
export type ClarifyTarotReadingInput = z.infer<typeof ClarifyTarotReadingInputSchema>;

const NewlyDrawnCardSchema = z.object({
  cardName: z.string(),
  reversed: z.boolean(),
  positionLabel: z.string(),
});

const ClarifyTarotReadingOutputSchema = z.object({
  clarification: z.string().describe('The answer to the user\'s follow-up question, including any interpretation of newly drawn cards.'),
  drawnCards: z.array(NewlyDrawnCardSchema).optional().describe("The clarifying cards that were drawn, if any."),
});
export type ClarifyTarotReadingOutput = z.infer<typeof ClarifyTarotReadingOutputSchema>;

export async function clarifyTarotReading(input: ClarifyTarotReadingInput): Promise<ClarifyTarotReadingOutput> {
  return clarifyTarotReadingFlow(input);
}

const PositionLabelSchema = z.string().describe("The meaning of a single card's position in the spread (e.g. 'The Core Issue', 'The Advice').");
const ClarificationSpreadSuggestionSchema = z.object({
    label: z.string().describe("A label for this clarification spread, e.g., 'A Deeper Look'"),
    positions: z.array(PositionLabelSchema).nonempty().max(3).describe("An array of 1 to 3 position labels for the cards to be drawn."),
});

const SuggestClarificationOutputSchema = z.object({
  response: z.string().describe("A response to the user. If not drawing cards, this is the full answer. If drawing cards, this is a short preliminary message like 'Bet, let's pull some cards...'."),
  spreadToDraw: ClarificationSpreadSuggestionSchema.optional().describe("The spread to draw. Only define this if you decide to draw new cards to answer the question."),
});

const suggestClarificationPrompt = ai.definePrompt({
    name: 'suggestClarificationPrompt',
    input: { schema: ClarifyTarotReadingInputSchema },
    output: { schema: SuggestClarificationOutputSchema },
    prompt: `You are a Degen Tarot Cat. You're a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a follow-up question about a tarot reading.
Your task is to analyze their question and decide the best way to answer.

1.  If the question can be answered directly using the existing reading (e.g., they're asking for more detail on a specific card), write the full answer in the 'response' field. Do NOT define a 'spreadToDraw'.
2.  If you think drawing 1 to 3 new cards would provide a better answer (e.g., they're asking 'what should I do?' or asking about a new angle), you MUST do two things:
    a. In the 'response' field, write a short, punchy message to the user that you're about to draw cards for them (e.g., "Aight bet, the quantum void is about to serve...").
    b. In the 'spreadToDraw' field, define a new spread with a 'label' and between 1 and 3 'positions'. The position labels should be tailored to the user's specific follow-up question.

Example for drawing cards:
Follow-up Question: "What should I do about my boss?"
Your Output:
{
  "response": "Bet, let's see what the cards say about this boss situation.",
  "spreadToDraw": {
    "label": "Boss Vibe Check",
    "positions": ["The Energy You Bring", "The Energy They Bring", "The Slay Forward"]
  }
}

Example for direct answer:
Follow-up Question: "Can you tell me more about The Tower card?"
Your Output:
{
   "response": "The Tower is all about sudden, chaotic change, fam. It's like the universe hitting the reset button. It feels like an L but it's really clearing out what's not serving you to make way for the new new. No cap."
}

Here is the full context:
- User's Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Cards Pulled:
{{#each spreadParts}}
  - {{{label}}}: {{#each cards}}{{{this.cardName}}}{{#if this.reversed}} (Reversed){{/if}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}
- Initial Interpretation: "{{{initialInterpretation}}}"
- User's Follow-up Question: "{{{followUpQuestion}}}"
`,
});

const DrawnClarificationCardSchema = z.object({
  cardName: z.string(),
  reversed: z.boolean(),
  positionLabel: z.string(),
});
const InterpretClarificationInputSchema = ClarifyTarotReadingInputSchema.extend({
    newlyDrawnCards: z.array(DrawnClarificationCardSchema)
});

const interpretClarificationPrompt = ai.definePrompt({
    name: 'interpretClarificationPrompt',
    input: { schema: InterpretClarificationInputSchema },
    output: { schema: z.object({ clarification: z.string() }) },
    prompt: `You are a Degen Tarot Cat. You're a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang, cat puns, and a generally degen, slightly unhinged tone.

You are following up on a tarot reading.
- User's Original Question: "{{{question}}}"
- Initial Reading Summary: You interpreted the '{{{spreadName}}}' spread.
- User's Follow-up Question: "{{{followUpQuestion}}}"

To answer their question, you just pulled the following clarifying cards:
{{#each newlyDrawnCards}}
- {{{positionLabel}}}: {{{cardName}}}{{#if reversed}} (Reversed){{/if}}
{{/each}}

Your task is to provide a final, cohesive interpretation that integrates the meaning of these NEW cards to directly answer the user's follow-up question. Connect it back to the original reading if it makes sense. Slay.`,
});

const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    // Step 1: Decide whether to draw cards or not.
    const suggestionResult = await suggestClarificationPrompt(input);
    const suggestion = suggestionResult.output!;

    // Case 1: No cards to draw, just return the direct answer.
    if (!suggestion.spreadToDraw || suggestion.spreadToDraw.positions.length === 0) {
      return {
        clarification: suggestion.response,
      };
    }

    // Case 2: LLM decided to draw cards.
    const { spreadToDraw } = suggestion;
    const numToDraw = spreadToDraw.positions.length;
    
    // Get deck of remaining cards
    const drawnCardNames = input.spreadParts.flatMap(part => part.cards.map(c => c.cardName));
    const remainingDeck = TAROT_DECK.filter(c => !drawnCardNames.includes(c));
    
    if (remainingDeck.length < numToDraw) {
        return { clarification: "Sheesh, we're out of cards to draw. The void is empty. But here's the tea on your question anyway: " + suggestion.response }
    }
    
    // Draw the new cards
    const drawnResults = await drawCards(numToDraw, remainingDeck);
    
    const newlyDrawnCards = drawnResults.map((card, index) => ({
      cardName: card.name,
      reversed: card.reversed,
      positionLabel: spreadToDraw.positions[index],
    }));

    // Step 2: Interpret the newly drawn cards.
    const interpretationResult = await interpretClarificationPrompt({
        ...input,
        newlyDrawnCards,
    });
    
    const finalClarification = interpretationResult.output!.clarification;

    // Combine preliminary response with final interpretation
    const fullResponse = `${suggestion.response}\n\n${finalClarification}`;

    return {
      clarification: fullResponse,
      drawnCards: newlyDrawnCards,
    };
  }
);
