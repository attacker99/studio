
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Logo } from './logo';

type TarotCardProps = {
  cardName: string;
  imageUrl: string;
  isRevealed: boolean;
  isReversed: boolean;
  animationDelay?: string;
  positionLabel?: string;
};

export function TarotCard({ cardName, imageUrl, isRevealed, isReversed, animationDelay = '0s', positionLabel }: TarotCardProps) {
  const displayName = isReversed ? `Reversed ${cardName}` : cardName;

  return (
    <div className="w-48 aspect-[25/44] animate-deal-card flex-shrink-0" style={{ animationDelay }}>
        <div className={cn('relative w-full h-full perspective', isRevealed && 'card-flipped')}>
            <div className="card-inner">
                <div className="card-front">
                    <Card className="w-full h-full bg-primary flex flex-col items-center justify-center p-4">
                        <Logo className="w-1/2 h-auto text-primary-foreground opacity-50"/>
                    </Card>
                </div>
                <div className="card-back">
                    <Card className="w-full h-full overflow-hidden flex flex-col">
                        <CardContent className="relative flex-grow p-0 min-h-0">
                            <Image
                                src={imageUrl}
                                alt={`An artistic rendering of the ${displayName} tarot card.`}
                                width={250}
                                height={440}
                                className={cn("object-cover w-full h-full transition-transform duration-500", isReversed && "rotate-180")}
                                priority
                            />
                        </CardContent>
                        <CardFooter className="flex-shrink-0 py-2 px-2 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm border-t">
                            <p className="font-headline text-center text-sm leading-tight">{displayName}</p>
                             {positionLabel && <p className="text-xs text-muted-foreground text-center mt-1 leading-snug">{positionLabel}</p>}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    </div>
  );
}
