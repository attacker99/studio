
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Logo } from './logo';

type TarotCardProps = {
  cardName: string;
  isRevealed: boolean;
  animationDelay?: string;
  positionLabel?: string;
};

export function TarotCard({ cardName, isRevealed, animationDelay = '0s', positionLabel }: TarotCardProps) {
  const dataAiHint = cardName.toLowerCase().replace('the ', '').replace('of ', '');

  return (
    <div className="w-full aspect-[2/3.5] animate-deal-card" style={{ animationDelay }}>
        <div className={cn('relative w-full h-full perspective', isRevealed && 'card-flipped')}>
            <div className="card-inner">
                <div className="card-front">
                    <Card className="w-full h-full bg-primary flex flex-col items-center justify-center p-4">
                        <Logo className="w-1/2 h-auto text-primary-foreground opacity-50"/>
                    </Card>
                </div>
                <div className="card-back">
                    <Card className="w-full h-full overflow-hidden flex flex-col">
                        <CardContent className="relative flex-grow p-0">
                            <Image
                                src={`https://placehold.co/250x400.png`}
                                alt={`An artistic rendering of the ${cardName} tarot card.`}
                                width={250}
                                height={400}
                                className="object-cover w-full h-full"
                                data-ai-hint={dataAiHint}
                            />
                        </CardContent>
                        <CardFooter className="flex-shrink-0 px-2 py-3 flex-col items-center justify-center bg-background/80 backdrop-blur-sm border-t">
                            <p className="font-headline text-center text-sm leading-tight">{cardName}</p>
                             {positionLabel && <p className="text-xs text-muted-foreground text-center leading-snug">{positionLabel}</p>}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    </div>
  );
}
