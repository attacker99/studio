
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { suggestTarotSpread, type SuggestTarotSpreadOutput, type SingleSpreadSuggestion } from '@/ai/flows/suggest-tarot-spread';
import { interpretTarotCards, type InterpretTarotCardsInput } from '@/ai/flows/interpret-tarot-cards';
import { clarifyTarotReading } from '@/ai/flows/clarify-tarot-reading';
import { drawCards } from '@/lib/tarot';
import { cardImageMap } from '@/lib/card-images';
import { Loader } from '@/components/ui/loader';
import { TarotCard } from '@/components/tarot-card';
import { Logo } from '@/components/logo';
import { Loader2, Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';

type Step = 'question' | 'suggestion' | 'reading';
type CardWithImage = { name: string; image: string; reversed: boolean; id: string; };

export default function Home() {
  const [step, setStep] = useState<Step>('question');
  const [question, setQuestion] = useState('');
  const [spreadSuggestion, setSpreadSuggestion] = useState<SuggestTarotSpreadOutput | null>(null);
  const [selectedSpreadIndex, setSelectedSpreadIndex] = useState<number | null>(null);
  const [confirmedSpread, setConfirmedSpread] = useState<SingleSpreadSuggestion | null>(null);
  const [readingResult, setReadingResult] = useState<{ cards: CardWithImage[]; interpretation: string } | null>(null);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [clarificationHistory, setClarificationHistory] = useState<string[]>([]);
  const [isClarifying, setIsClarifying] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (step === 'reading' && readingResult && revealedCards.length < readingResult.cards.length) {
      // New cards have been added, update revealed state
      setRevealedCards(prev => [...prev, ...new Array(readingResult.cards.length - prev.length).fill(true)]);
    }
  }, [readingResult?.cards.length]);


  useEffect(() => {
    if (step === 'reading' && readingResult && revealedCards.some(c => !c)) {
      const revealTimer = setTimeout(() => {
        readingResult.cards.forEach((_, index) => {
          setTimeout(() => {
            setRevealedCards(prev => {
              const newRevealed = [...prev];
              if (!newRevealed[index]) {
                  newRevealed[index] = true;
              }
              return newRevealed;
            });
          }, index * 300);
        });
      }, 700); // Wait for deal animation to finish
      return () => clearTimeout(revealTimer);
    }
  }, [step, readingResult, revealedCards]);

  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      toast({ title: 'Please enter a question.', variant: 'destructive' });
      return;
    }
    setIsSuggesting(true);
    try {
      const suggestion = await suggestTarotSpread({ question });
      setSpreadSuggestion(suggestion);
      setStep('suggestion');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error suggesting spread.', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSuggesting(false);
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
    setReadingResult(null);
    setRevealedCards([]);

    startTransition(async () => {
      setLoadingMessage("Drawing cards, interpreting fate...");
      try {
        const totalCardCount = selectedSpread.parts.reduce((sum, part) => sum + part.positions.length, 0);
        if (totalCardCount === 0) {
            toast({ title: 'Invalid spread suggestion.', description: 'Card count cannot be zero.', variant: 'destructive' });
            return;
        }

        const drawnCardsResult = await drawCards(totalCardCount);
        setRevealedCards(new Array(drawnCardsResult.length).fill(false));
        
        const spreadPartsForInterpretation: InterpretTarotCardsInput['spreadParts'] = [];
        let cardIndex = 0;
        for (const part of selectedSpread.parts) {
          const cardsWithPositions = part.positions.map((positionLabel, indexInPart) => {
            const card = drawnCardsResult[cardIndex + indexInPart];
            return { cardName: card.name, positionLabel, reversed: card.reversed };
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
        
        const cardsWithImages: CardWithImage[] = drawnCardsResult.map((card, index) => ({
          name: card.name,
          reversed: card.reversed,
          image: cardImageMap[card.name],
          id: `initial-${index}-${card.name}`,
        }));

        setReadingResult({ cards: cardsWithImages, interpretation: interpretationResult.interpretation });
        setStep('reading');
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({ title: 'Failed to complete reading.', description: errorMessage, variant: 'destructive' });
      } finally {
        setLoadingMessage('');
      }
    });
  };

  const handleFollowUpSubmit = async () => {
    if (!followUpQuestion.trim() || !readingResult || !confirmedSpread) {
      return;
    }
    setIsClarifying(true);

    const spreadPartsForClarification: Omit<Parameters<typeof clarifyTarotReading>[0], 'newlyDrawnCard'>['spreadParts'] = [];
    let cardIndex = 0;
    for (const part of confirmedSpread.parts) {
      const cardsWithPositions = part.positions.map((positionLabel, indexInPart) => {
        const card = readingResult.cards[cardIndex + indexInPart];
        return { cardName: card.name, positionLabel, reversed: card.reversed };
      });
      spreadPartsForClarification.push({
        label: part.label,
        cards: cardsWithPositions,
      });
      cardIndex += part.positions.length;
    }

    try {
      const result = await clarifyTarotReading({
        question,
        spreadName: confirmedSpread.suggestedSpread,
        spreadParts: spreadPartsForClarification,
        initialInterpretation: readingResult.interpretation,
        followUpQuestion,
      });

      if (result.drawnCard) {
        const newCardWithImage: CardWithImage = {
          name: result.drawnCard.cardName,
          reversed: result.drawnCard.reversed,
          image: cardImageMap[result.drawnCard.cardName],
          id: `clarify-${clarificationHistory.length}-${result.drawnCard.cardName}`,
        };
        setReadingResult(prev => {
          if (!prev) return null;
          return { ...prev, cards: [...prev.cards, newCardWithImage] };
        });
      }

      setClarificationHistory(prev => [...prev, result.clarification]);
      setFollowUpQuestion('');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Failed to get clarification.', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsClarifying(false);
    }
  };


  const handleReset = () => {
    setStep('question');
    setQuestion('');
    setSpreadSuggestion(null);
    setReadingResult(null);
    setSelectedSpreadIndex(null);
    setConfirmedSpread(null);
    setLoadingMessage('');
    setRevealedCards([]);
    setFollowUpQuestion('');
    setClarificationHistory([]);
  };

  const renderContent = () => {
    if (isPending) {
      return <Loader message={loadingMessage} />;
    }

    switch (step) {
      case 'question':
        return (
          <Card className="w-full max-w-2xl bg-card/70 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-3xl md:text-4xl">Spill the Tea to the Void Kitty</CardTitle>
              <CardDescription>what's the 411, kitten? no cap.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <Textarea
                  placeholder="ask me anything, like 'is my crush giving main character energy or nah?' or 'should i ghost my job and become a catfluencer?'"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="bg-background/80"
                />
                <Button
                  onClick={handleQuestionSubmit}
                  disabled={isSuggesting}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {isSuggesting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  {isSuggesting ? 'Cooking...' : "Let's Cook"}
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
                <CardTitle className="font-headline text-3xl">Vibes from the Void Kitty</CardTitle>
                <CardDescription>pick a spread, bet.</CardDescription>
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
                  <Button onClick={handleSpreadConfirm} size="lg" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold" disabled={selectedSpreadIndex === null || isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isPending ? 'Slaying & Drawing...' : 'Slay & Draw'}
                  </Button>
                  <Button onClick={handleReset} size="lg" variant="outline" className="flex-1" disabled={isPending}>
                    New question, who dis?
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        );

      case 'reading':
        return (
          readingResult && confirmedSpread && (
            <div className="w-full max-w-6xl space-y-8">
              <div className="text-center animate-deal-card" style={{ animationDelay: '0s'}}>
                <h2 className="font-headline text-3xl md:text-4xl">The Tea Has Been Spilled</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">&quot;{question}&quot;</p>
              </div>

              <div className="flex flex-row flex-wrap gap-4 md:gap-6 justify-center">
                {(() => {
                  let cardsRendered = 0;
                  const clarifyingCards: CardWithImage[] = [];

                  // Separate initial spread cards from clarifying cards
                  const initialCardCount = confirmedSpread.parts.reduce((sum, part) => sum + part.positions.length, 0);
                  const initialCards = readingResult.cards.slice(0, initialCardCount);
                  const clarifying = readingResult.cards.slice(initialCardCount);

                  const spreadPartsJsx = confirmedSpread.parts.map((part, partIndex) => {
                    const cardsForPart = initialCards.slice(cardsRendered, cardsRendered + part.positions.length);
                    const positionsForPart = part.positions;
                    const partStartIndex = cardsRendered;
                    cardsRendered += part.positions.length;

                    return (
                      <div key={`part-${partIndex}`} className="bg-card/20 backdrop-blur-sm rounded-lg p-4 md:p-6 w-full animate-deal-card" style={{ animationDelay: '0.2s'}}>
                        <h3 className="font-headline text-2xl text-accent text-glow mb-4 text-center">{part.label}</h3>
                        <div className="flex flex-row flex-wrap gap-4 md:gap-6 justify-center">
                          {cardsForPart.map((card, indexInPart) => {
                            const overallIndex = partStartIndex + indexInPart;
                            return (
                              <TarotCard
                                key={card.id}
                                cardName={card.name}
                                imageUrl={card.image}
                                isRevealed={revealedCards[overallIndex]}
                                isReversed={card.reversed}
                                animationDelay={`${overallIndex * 0.1 + 0.3}s`}
                                positionLabel={positionsForPart[indexInPart]}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  });

                  const clarifyingJsx = clarifying.length > 0 && (
                     <div key="clarifying-cards" className="bg-card/20 backdrop-blur-sm rounded-lg p-4 md:p-6 w-full animate-deal-card" style={{ animationDelay: '0.2s'}}>
                        <h3 className="font-headline text-2xl text-accent text-glow mb-4 text-center">Clarifying Cards</h3>
                        <div className="flex flex-row flex-wrap gap-4 md:gap-6 justify-center">
                            {clarifying.map((card, index) => {
                                const overallIndex = initialCardCount + index;
                                return (
                                    <TarotCard
                                        key={card.id}
                                        cardName={card.name}
                                        imageUrl={card.image}
                                        isRevealed={true} // clarifying cards are always revealed
                                        isReversed={card.reversed}
                                        animationDelay={`${(index * 0.1) + 0.1}s`}
                                        positionLabel="Clarification"
                                    />
                                );
                            })}
                        </div>
                     </div>
                  );
                  
                  return <>{spreadPartsJsx}{clarifyingJsx}</>;
                })()}
              </div>

              {revealedCards.every(r => r) && readingResult.interpretation && (
                 <Card className="bg-card/70 backdrop-blur-sm animate-deal-card" style={{ animationDelay: `${initialCardCount * 0.1 + 0.5}s`}}>
                  <CardHeader>
                    <CardTitle className="font-headline text-3xl flex items-center gap-3">
                      <Sparkles className="text-accent"/>
                      The Lowdown
                    </CardTitle>
                    <CardDescription>{confirmedSpread?.suggestedSpread}</CardDescription>
                  </CardHeader>
                  <CardContent className="prose prose-invert max-w-none text-foreground/90 font-body text-base">
                    <ReactMarkdown>{readingResult.interpretation}</ReactMarkdown>
                  </CardContent>
                </Card>
              )}

              {clarificationHistory.length > 0 && (
                <div className="space-y-4">
                  {clarificationHistory.map((clarification, index) => (
                    <Card key={index} className="bg-card/70 backdrop-blur-sm animate-deal-card">
                       <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-3">
                          <Sparkles className="text-accent h-5 w-5"/>
                          The Plot Thickens...
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="prose prose-invert max-w-none text-foreground/90 font-body text-base">
                         <ReactMarkdown>{clarification}</ReactMarkdown>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {revealedCards.slice(0, confirmedSpread.parts.reduce((sum, part) => sum + part.positions.length, 0)).every(r => r) && readingResult.interpretation && (
                <Card className="bg-card/70 backdrop-blur-sm animate-deal-card" style={{ animationDelay: `${readingResult.cards.length * 0.1 + 0.7}s`}}>
                  <CardHeader>
                    <CardTitle className="font-headline text-xl">Go Deeper</CardTitle>
                    <CardDescription>Ask the void kitty a follow-up question, or ask it to draw a clarifying card.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid w-full gap-4">
                      <Textarea
                        placeholder="e.g., 'tell me more about the tower card' or 'draw one more card for the outcome'"
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        rows={3}
                        className="bg-background/80"
                        disabled={isClarifying}
                      />
                      <Button
                        onClick={handleFollowUpSubmit}
                        disabled={isClarifying || !followUpQuestion.trim()}
                        size="lg"
                      >
                        {isClarifying ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-5 w-5" />
                        )}
                        {isClarifying ? 'Consulting the Void...' : 'Go Deeper'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}


              <div className="text-center">
                <Button onClick={handleReset} size="lg" variant="outline">
                  Run it back
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
            Degen Tarot Cat
            </h1>
            <p className="text-muted-foreground mt-2">rizz-powered readings for the chronically online</p>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
