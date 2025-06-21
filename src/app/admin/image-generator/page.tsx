'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TAROT_DECK } from '@/lib/tarot';
import { generateTarotCardImage, GenerateTarotCardImageOutput } from '@/ai/flows/generate-tarot-card-image';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ImageGeneratorPage() {
  const [selectedCard, setSelectedCard] = useState<string>(TAROT_DECK[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateTarotCardImageOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    try {
      const cardName = selectedCard as typeof TAROT_DECK[number];
      const generationResult = await generateTarotCardImage({ cardName });
      setResult(generationResult);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error generating image',
        description: 'The AI might be having a moment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (result?.imageUrl) {
      navigator.clipboard.writeText(`'${result.cardName}': '${result.imageUrl}',`);
      toast({
        title: 'Copied to clipboard!',
        description: 'You can now paste this into card-images.ts',
      });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tarot Card Image Generator</CardTitle>
          <CardDescription>
            A tool to generate the 78 unique images for your tarot deck.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="card-select">Select a Card</Label>
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger id="card-select">
                <SelectValue placeholder="Select a card" />
              </SelectTrigger>
              <SelectContent>
                {TAROT_DECK.map(card => (
                  <SelectItem key={card} value={card}>
                    {card}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </Button>

          {result && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Result for {result.cardName}</h3>
              <div className="flex justify-center bg-muted/20 p-4 rounded-lg">
                 <Image
                    src={result.imageUrl}
                    alt={`Generated image for ${result.cardName}`}
                    width={250}
                    height={440}
                    className="rounded-lg border shadow-md"
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-url">Image Data URI (Formatted)</Label>
                <Textarea
                    id="image-url"
                    readOnly
                    value={`'${result.cardName}': '${result.imageUrl}',`}
                    rows={5}
                    className="font-mono text-xs bg-muted"
                />
                <Button onClick={handleCopyToClipboard} variant="outline" size="sm" className="w-full">
                    Copy to Clipboard
                </Button>
              </div>
              <p className="text-muted-foreground text-xs text-center">
                Paste the copied line into the `cardImageMap` object in <code>src/lib/card-images.ts</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Button asChild variant="link" className="mt-6">
        <Link href="/">Back to the Tarot App</Link>
      </Button>
    </main>
  );
}
