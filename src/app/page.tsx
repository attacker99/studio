
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { suggestTarotSpread, type SuggestTarotSpreadOutput, type SingleSpreadSuggestion } from '@/ai/flows/suggest-tarot-spread';
import { interpretTarotCards, InterpretTarotCardsInput } from '@/ai/flows/interpret-tarot-cards';
import { drawCards } from '@/lib/tarot';
import { Loader } from '@/components/ui/loader';
import { TarotCard } from '@/components/tarot-card';
import { Logo } from '@/components/logo';
import { Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type Step = 'question' | 'suggestion' | 'reading';

export default function Home() {
  const [step, setStep] = useState<Step>('question');
  const [question, setQuestion] = useState('');
  const [spreadSuggestion, setSpreadSuggestion] = useState<SuggestTarotSpreadOutput | null>(null);
  const [selectedSpreadIndex, setSelectedSpreadIndex] = useState<number | null>(null);
  const [confirmedSpread, setConfirmedSpread] = useState<SingleSpreadSuggestion | null>(null);
  const [readingResult, setReadingResult] = useState<{ cards: string[]; interpretation: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      toast({ title: 'Please enter a question.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const suggestion = await suggestTarotSpread({ question });
      setSpreadSuggestion(suggestion);
      setStep('suggestion');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error suggesting spread.', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpreadConfirm = () => {
    if (selectedSpreadIndex === null || !spreadSuggestion) {
      toast({ title: 'Please select a spread.', variant: 'destructive' });
      return;
    }
    const selectedSpread = spreadSuggestion.suggestions[selectedSpreadIndex];

    if (!selectedSpread || !selectedSpread.parts?.length) {
      toast({ title: 'Invalid spread suggestion.', description: 'Could not determine the cards to draw.', variant: 'destructive' });
      return;
    };
    
    setConfirmedSpread(selectedSpread);

    startTransition(async () => {
      setIsLoading(true);
      try {
        const totalCardCount = selectedSpread.parts.reduce((sum, part) => sum + part.positions.length, 0);
        if (totalCardCount === 0) {
            toast({ title: 'Invalid spread suggestion.', description: 'Card count cannot be zero.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        const drawnCards = await drawCards(totalCardCount);
        
        const spreadPartsForInterpretation: InterpretTarotCardsInput['spreadParts'] = [];
        let cardIndex = 0;
        for (const part of selectedSpread.parts) {
          const cardsWithPositions = part.positions.map((positionLabel, indexInPart) => {
            const cardName = drawnCards[cardIndex + indexInPart];
            return { cardName, positionLabel };
          });
          spreadPartsForInterpretation.push({
            label: part.label,
            cards: cardsWithPositions,
          });
          cardIndex += part.positions.length;
        }

        const interpretationResult = await interpretTarotCards({
          question,
          spreadName: selectedSpread.suggestedSpread,
          spreadParts: spreadPartsForInterpretation,
        });

        setReadingResult({ cards: drawnCards, interpretation: interpretationResult.interpretation });
        setStep('reading');
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({ title: 'Failed to complete reading.', description: errorMessage, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleReset = () => {
    setStep('question');
    setQuestion('');
    setSpreadSuggestion(null);
    setReadingResult(null);
    setSelectedSpreadIndex(null);
    setConfirmedSpread(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    switch (step) {
      case 'question':
        return (
          <Card className="w-full max-w-2xl bg-card/70 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-3xl md:text-4xl">Ask the Universe</CardTitle>
              <CardDescription>What guidance do you seek?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <Textarea
                  placeholder="Type your question here... for example 'Should I move to a new city or stay where I am?'"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="bg-background/80"
                />
                <Button
                  onClick={handleQuestionSubmit}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get Spread Suggestion
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'suggestion':
        return (
          spreadSuggestion && (
            <Card className="w-full max-w-2xl animate-deal-card bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Suggested Spreads</CardTitle>
                <CardDescription>Choose the spread that resonates most with you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <RadioGroup
                  value={selectedSpreadIndex?.toString()}
                  onValueChange={(value) => setSelectedSpreadIndex(Number(value))}
                  className="space-y-4"
                >
                  {spreadSuggestion.suggestions.map((suggestion, index) => (
                    <Label
                      key={index}
                      htmlFor={`spread-${index}`}
                      className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4 has-[:checked]:bg-accent/20 has-[:checked]:border-accent cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <RadioGroupItem value={index.toString()} id={`spread-${index}`} />
                        <div className="flex-grow">
                          <h3 className="font-headline text-xl text-accent text-glow">{suggestion.suggestedSpread}</h3>
                          <p className="text-muted-foreground text-sm">{suggestion.reason}</p>
                        </div>
                      </div>
                      <div className="pl-8 pt-2 space-y-2">
                        {suggestion.parts.map((part, partIndex) => (
                          <div key={partIndex} className="text-sm">
                            <p className="font-semibold text-foreground">
                              {part.label} ({part.positions.length} {part.positions.length > 1 ? 'cards' : 'card'})
                            </p>
                            <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                              {part.positions.map((pos, posIndex) => <li key={posIndex}>{pos}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={handleSpreadConfirm} size="lg" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold" disabled={selectedSpreadIndex === null}>
                    Confirm & Draw Cards
                  </Button>
                  <Button onClick={handleReset} size="lg" variant="outline" className="flex-1">
                    Ask Another Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        );

      case 'reading':
        return (
          readingResult && confirmedSpread && (
            <div className="w-full max-w-6xl space-y-8 animate-deal-card">
              <div className="text-center">
                <h2 className="font-headline text-3xl md:text-4xl">Your Reading</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">&quot;{question}&quot;</p>
              </div>

              <div className="space-y-6">
                {(() => {
                  let cardDrawnIndex = 0;
                  return confirmedSpread.parts.map((part, partIndex) => {
                    const cardsForPart = readingResult.cards.slice(
                      cardDrawnIndex,
                      cardDrawnIndex + part.positions.length
                    );
                    const positionsForPart = part.positions;
                    cardDrawnIndex += part.positions.length;

                    return (
                      <div key={partIndex} className="bg-card/20 backdrop-blur-sm rounded-lg p-4 md:p-6">
                        <h3 className="font-headline text-2xl text-accent text-glow mb-4 text-center">{part.label}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 justify-center">
                          {cardsForPart.map((card, indexInPart) => {
                            return (
                              <TarotCard
                                key={card}
                                cardName={card}
                                isRevealed={true}
                                animationDelay={`${(cardDrawnIndex - cardsForPart.length + indexInPart) * 0.15}s`}
                                positionLabel={positionsForPart[indexInPart]}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <Sparkles className="text-accent"/>
                    Interpretation
                  </CardTitle>
                   <CardDescription>{confirmedSpread?.suggestedSpread}</CardDescription>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap font-body text-base">
                  {readingResult.interpretation}
                </CardContent>
              </Card>

              <div className="text-center">
                <Button onClick={handleReset} size="lg" variant="outline">
                  Start a New Reading
                </Button>
              </div>
            </div>
          )
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(103,58,183,0.3),rgba(255,255,255,0))]"></div>
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center space-y-8 p-4 md:p-8">
        <header className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-glow">
            Tarot Muse
            </h1>
            <p className="text-muted-foreground mt-2">AI-powered insights at your fingertips</p>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
