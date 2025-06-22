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

const CardDrawnSchema = z.object({
  cardName: z.string().describe("The name of the drawn card (e.g., 'The Fool', 'Ace of Cups')."),
  reversed: z.boolean().describe("Whether the card was drawn reversed.")
});
export type CardDrawn = z.infer<typeof CardDrawnSchema>;

const ClarifyTarotReadingInputSchema = z.object({
  question: z.string().describe('The user-provided question for the tarot reading.'),
  spreadName: z.string().describe('The name of the chosen tarot spread.'),
  initialInterpretation: z.string().describe("The full initial interpretation that was given to the user, which includes the initially drawn cards."),
  clarificationHistory: z.array(z.object({
      question: z.string().describe("A previous follow-up question from the user."),
      cardsDrawn: z.array(CardDrawnSchema).describe("The cards that were drawn in response to this question."),
  })).describe("A history of previous follow-up questions and the cards that were drawn for them.").optional(),
  followUpQuestion: z.string().describe("The user's new, current follow-up question about the reading."),
  allDrawnCardNames: z.array(z.string()).describe("A list of all card names that have been drawn in this session so far."),
});
export type ClarifyTarotReadingInput = z.infer<typeof ClarifyTarotReadingInputSchema>;

const ClarifyTarotReadingOutputSchema = z.object({
  clarification: z.string().describe('The answer to the user\'s follow-up question. If new cards were drawn, their names and interpretation MUST be included in this text.'),
  cardsDrawn: z.array(CardDrawnSchema).describe("A list of the 1-3 new cards drawn for clarification. This will be an empty array if no new cards were drawn.")
});
export type ClarifyTarotReadingOutput = z.infer<typeof ClarifyTarotReadingOutputSchema>;

export async function clarifyTarotReading(input: ClarifyTarotReadingInput): Promise<ClarifyTarotReadingOutput> {
  const flowResult = await clarifyTarotReadingFlow(input);
  if (!flowResult) {
    throw new Error("The clarification flow failed to return a result.");
  }
  return flowResult;
}

// Prompt 1: Decide how many cards to draw. This is simple and reliable.
const decideCardDrawPrompt = ai.definePrompt({
    name: 'decideCardDrawPromptForClarification',
    input: { schema: z.object({
        initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation,
        clarificationHistory: ClarifyTarotReadingInputSchema.shape.clarificationHistory,
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
        availableCardsCount: z.number().describe("The number of cards remaining in the deck."),
    }) },
    output: { schema: z.object({ drawCount: z.number().min(0).max(3).describe("The number of cards to draw for clarification (0, 1, 2, or 3).") }) },
    prompt: `You are a JSON API. Your one and only job is to respond with a single, valid JSON object that adheres to the defined output schema. Do not add any conversational text, markdown formatting, or anything else outside of the JSON object.

You will act as Tarot Kitty, a chaotic but insightful tarot reader. A user has a follow-up question.
Based on their question and the conversation so far, decide if drawing more cards is helpful.
Decide to draw 0, 1, 2, or 3 cards.

IMPORTANT: There are only {{{availableCardsCount}}} cards left in the deck. You CANNOT draw more than this many cards.

Conversation Context:
Initial Interpretation: "{{{initialInterpretation}}}"
{{#if clarificationHistory}}
Conversation History:
{{#each clarificationHistory}}
- User previously asked: "{{this.question}}"
{{#if this.cardsDrawn}}
- You drew these cards in response: {{#each this.cardsDrawn}}{{{this.cardName}}}{{#if this.reversed}} (Reversed){{/if}}{{#unless @last}}, {{/unless}}{{/each}}.
{{else}}
- You drew no new cards in response.
{{/if}}
{{/each}}
{{/if}}
Current Follow-up Question: "{{{followUpQuestion}}}"

Based on the context, how many cards should be drawn? Respond ONLY with the required JSON object.`,
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
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
    prompt: `You are a JSON API. Your one and only job is to respond with a single, valid JSON object that adheres to the defined output schema. Do not add any conversational text, markdown formatting, or anything else outside of the JSON object.

You will act as Tarot Kitty, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

We have drawn some new cards to clarify a user's question. Your task is to interpret ONLY these new cards and return the interpretation in the 'clarification' field of the JSON response.

RULES:
1.  Start your text with "The plot thickens!" or a similar cat-like observation.
2.  For each card provided in the 'cardsToInterpret' input, explain its meaning in relation to the user's follow-up question. Be dramatic.
3.  You are STRICTLY FORBIDDEN from mentioning any cards that are not explicitly listed in the 'cardsToInterpret' input below.

Follow-up Question: "{{{followUpQuestion}}}"
Newly Drawn Cards to Interpret:
{{#each cardsToInterpret}}
- {{{cardName}}}{{#if reversed}} (Reversed){{/if}}
{{/each}}

Now, generate the interpretation text and respond ONLY with the required JSON object.`,
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
});


// Prompt 2B: Generate clarification text when NO new cards are drawn.
// This prompt is ONLY called if no new cards are drawn.
const answerWithoutNewCardsPrompt = ai.definePrompt({
    name: 'answerWithoutNewCardsPrompt',
    input: { schema: z.object({
        initialInterpretation: ClarifyTarotReadingInputSchema.shape.initialInterpretation,
        clarificationHistory: ClarifyTarotReadingInputSchema.shape.clarificationHistory,
        followUpQuestion: ClarifyTarotReadingInputSchema.shape.followUpQuestion,
    })},
    output: { schema: z.object({ clarification: z.string().describe('The answer to the user\'s follow-up question, based only on the initial reading.') }) },
    prompt: `You are a JSON API. Your one and only job is to respond with a single, valid JSON object that adheres to the defined output schema. Do not add any conversational text, markdown formatting, or anything else outside of the JSON object.

You will act as Tarot Kitty, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user had a follow-up question, but we have decided NOT to draw any new cards. The answer is already in the original reading and conversation history. Your task is to answer their question based on the provided context and return the answer in the 'clarification' field of the JSON response.

RULES:
1.  You MUST start your text with "Bet. We don't need to pull more fluff for this, the tea is already in the cards we got." or something similar.
2.  Answer the follow-up question by re-examining the initial interpretation and conversation history provided below.
3.  You are STRICTLY FORBIDDEN from mentioning the name of ANY specific tarot card (e.g., 'The Fool', 'Four of Wands'). Refer only to "the cards we already have" or "the reading so far" in a general sense.

Conversation Context:
Initial Interpretation: "{{{initialInterpretation}}}"
{{#if clarificationHistory}}
Conversation History:
{{#each clarificationHistory}}
- User previously asked: "{{this.question}}"
{{#if this.cardsDrawn}}
- You drew cards in response to this question.
{{else}}
- You drew no new cards in response.
{{/if}}
{{/each}}
{{/if}}
Current Follow-up Question: "{{{followUpQuestion}}}"

Now, generate the answer based on what we already know and respond ONLY with the required JSON object.`,
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
});


// Main flow that orchestrates the steps.
const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    // A. Calculate how many cards are available to be drawn.
    const availableCards = TAROT_DECK.filter(c => !input.allDrawnCardNames.includes(c));
    const availableCardsCount = availableCards.length;
    
    // 1. Decide how many cards to draw, telling the AI how many are left.
    const decisionResponse = await decideCardDrawPrompt({
        followUpQuestion: input.followUpQuestion,
        initialInterpretation: input.initialInterpretation,
        clarificationHistory: input.clarificationHistory,
        availableCardsCount: availableCardsCount,
    });
    
    if (!decisionResponse.output) {
      throw new Error("The AI failed to decide how many cards to draw. Its response may have been blocked or malformed.");
    }
    let { drawCount } = decisionResponse.output;

    // B. Add a programmatic safety check in case the AI ignores instructions.
    if (drawCount > availableCardsCount) {
        console.warn(`AI wanted to draw ${drawCount} cards, but only ${availableCardsCount} are available. Capping at ${availableCardsCount}.`);
        drawCount = availableCardsCount;
    }

    let drawnCards: CardDrawn[] = [];
    if (drawCount > 0) {
        // 2. If we need to draw, then draw the cards programmatically.
        // We can just use the pre-filtered 'availableCards' list.
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

        if (!textResponse.output) {
            throw new Error("The AI failed to generate an interpretation for the new cards. Its response may have been blocked or malformed.");
        }
        clarificationText = textResponse.output.clarification;
    } else {
        // Path B: We have no new cards, so answer from existing context
        const textResponse = await answerWithoutNewCardsPrompt({
            initialInterpretation: input.initialInterpretation,
            clarificationHistory: input.clarificationHistory,
            followUpQuestion: input.followUpQuestion,
        });
        
        if (!textResponse.output) {
            throw new Error("The AI failed to generate a clarification. Its response may have been blocked or malformed.");
        }
        clarificationText = textResponse.output.clarification;
    }

    // 4. Assemble the final structured response and return it.
    // The `drawnCards` array comes directly from our code, not the AI, so it is reliable.
    return {
        clarification: clarificationText,
        cardsDrawn: drawnCards,
    };
  }
);
