
'use server';
/**
 * @fileOverview Provides follow-up clarification for a tarot reading.
 * The AI assistant will analyze the user's follow-up question, decide whether to draw 1-3 new cards by using a tool,
 * and provide a cohesive interpretation based on the tool's output.
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
  cardName: z.string().describe("The name of the drawn card (e.g., 'The Fool', 'Ace of Cups'). This field MUST NOT include the text '(Reversed)'. The `reversed` boolean field is the only way to indicate orientation."),
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


// Define the tool at the top level of the module, not inside the flow.
const drawClarificationCardsTool = ai.defineTool(
    {
        name: 'drawClarificationCards',
        description: 'Draws 1 to 3 new tarot cards from the remaining deck to help answer a follow-up question.',
        inputSchema: z.object({
            count: z.number().min(1).max(3).describe("The number of cards to draw (must be between 1 and 3)."),
            // The tool needs the list of already-drawn cards to know which ones are available.
            allDrawnCardNames: z.array(z.string()).describe("The list of card names that have already been drawn in this session."),
        }),
        outputSchema: z.array(CardDrawnSchema),
    },
    async ({ count, allDrawnCardNames }) => {
        const availableCards = TAROT_DECK.filter(c => !allDrawnCardNames.includes(c));
        console.log(`Tool called: Drawing ${count} cards from a deck with ${availableCards.length} cards available.`);
        if (availableCards.length < count) {
            console.warn(`Not enough cards left to draw ${count}. Drawing ${availableCards.length} instead.`);
            count = availableCards.length;
        }
        if (count === 0) {
            return [];
        }
        const drawn = await drawCards(count, availableCards);
        return drawn.map(c => ({ cardName: c.name, reversed: c.reversed }));
    }
);

// Define the prompt at the top level, referencing the tool.
const clarificationPrompt = ai.definePrompt({
    name: 'clarificationPrompt',
    input: { schema: ClarifyTarotReadingInputSchema },
    output: { schema: ClarifyTarotReadingOutputSchema },
    tools: [drawClarificationCardsTool],
    prompt: `You are Tarot Bestie, a chronically online, gen-alpha cat who is also a legendary tarot reader. You're chaotic but your insights are always on point, no cap. Use lots of gen alpha slang (like 'rizz', 'bet', 'no cap', 'slay', 'bussin'), cat puns, and a generally degen, slightly unhinged tone.

A user has a follow-up question about their reading.
- Original Question: "{{{question}}}"
- Spread: "{{{spreadName}}}"
- Initial Interpretation: "{{{initialInterpretation}}}"
- Follow-up Question: "{{{followUpQuestion}}}"
- Cards already drawn: [{{#each allDrawnCardNames}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}]

Your task is to answer the follow-up question.
1.  Analyze the follow-up question.
2.  If you think drawing more cards would provide a better, more insightful answer, you MUST use the \`drawClarificationCards\` tool. You can draw 1, 2, or 3 cards.
3.  When you call the tool, you MUST provide the \`count\` and you MUST also pass the \`allDrawnCardNames\` array from the original input into the tool's \`allDrawnCardNames\` parameter. This is critical for the tool to function correctly.
4.  If you do not think new cards are necessary, just answer the question directly.
5.  Whether you draw cards or not, you must provide a final answer in the \`clarification\` field. If you drew cards, you MUST incorporate their meaning into your answer. Start your response with a cat-like observation like "The plot thickens!" or "The cosmic yarn has more tangles!".
6.  Crucially, your final JSON output must follow these strict rules for the \`cardsDrawn\` field:
    - The value of \`cardsDrawn\` MUST be an exact copy of the JSON array returned by the \`drawClarificationCards\` tool.
    - Each object in the array MUST have a \`cardName\` (string) and a \`reversed\` (boolean).
    - The \`cardName\` string MUST NOT contain the word "(Reversed)". Use the \`reversed\` boolean field for that.
    - If the tool is not used, \`cardsDrawn\` MUST be an empty array (\`[]\`).
    - Do not add, remove, or modify any cards in the data returned by the tool.
`
});

const clarifyTarotReadingFlow = ai.defineFlow(
  {
    name: 'clarifyTarotReadingFlow',
    inputSchema: ClarifyTarotReadingInputSchema,
    outputSchema: ClarifyTarotReadingOutputSchema,
  },
  async (input) => {
    // Execute the prompt. Genkit will handle the tool-use loop automatically.
    const result = await clarificationPrompt(input);
    
    // The output should be perfectly formed according to our schema.
    return result.output!;
  }
);
