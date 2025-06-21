'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { suggestTarotSpread, type SuggestTarotSpreadOutput } from '@/ai/flows/suggest-tarot-spread';
import { interpretTarotCards } from '@/ai/flows/interpret-tarot-cards';
import { drawCards, getSpreadCardCount } from '@/lib/tarot';
import { Loader } from '@/components/ui/loader';
import { TarotCard } from '@/components/tarot-card';
import { Logo } from '@/components/logo';
import { Sparkles } from 'lucide-react';

type Step = 'question' | 'suggestion' | 'reading';

export default function Home() {
  const [step, setStep] = useState<Step>('question');
  const [question, setQuestion] = useState('');
  const [spreadSuggestion, setSpreadSuggestion] = useState<SuggestTarotSpreadOutput | null>(null);
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
    if (!spreadSuggestion) return;
    
    startTransition(async () => {
      setIsLoading(true);
      try {
        const cardCount = getSpreadCardCount(spreadSuggestion.suggestedSpread);
        const drawnCards = drawCards(cardCount);
        
        const interpretationResult = await interpretTarotCards({
          question,
          spreadName: spreadSuggestion.suggestedSpread,
          cards: drawnCards,
        });

        setReadingResult({ cards: drawnCards, interpretation: interpretationResult.interpretation });
        setStep('reading');
      } catch (error) {
        console.error(error);
        toast({ title: 'Error interpreting cards.', description: 'Please try again.', variant: 'destructive' });
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
                  placeholder="Type your question here..."
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
                <CardTitle className="font-headline text-3xl">Suggested Spread</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                  <h3 className="font-headline text-2xl text-accent text-glow">{spreadSuggestion.suggestedSpread}</h3>
                  <p className="text-muted-foreground">{spreadSuggestion.reason}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={handleSpreadConfirm} size="lg" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
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
          readingResult && (
            <div className="w-full max-w-6xl space-y-8 animate-deal-card">
              <div className="text-center">
                <h2 className="font-headline text-3xl md:text-4xl">Your Reading</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">&quot;{question}&quot;</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 justify-center">
                {readingResult.cards.map((card, index) => (
                  <TarotCard
                    key={card}
                    cardName={card}
                    isRevealed={true}
                    animationDelay={`${index * 0.2}s`}
                    positionLabel={`Card ${index + 1}`}
                  />
                ))}
              </div>

              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <Sparkles className="text-accent"/>
                    Interpretation
                  </CardTitle>
                   <CardDescription>{spreadSuggestion?.suggestedSpread}</CardDescription>
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
