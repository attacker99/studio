'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TAROT_DECK } from '@/lib/tarot';
import { Loader2, Sparkles } from 'lucide-react';
import { generateTarotCardImage } from '@/ai/flows/generate-tarot-card-image';
import Image from 'next/image';
import { slugify } from '@/lib/card-images';

export default function ImageGeneratorPage() {
    const [selectedCard, setSelectedCard] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const { toast } = useToast();

    const handleGenerate = async () => {
        if (!selectedCard) {
            toast({ title: "Please select a card.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        setGeneratedImageUrl(null);
        try {
            const result = await generateTarotCardImage({ cardName: selectedCard });
            setGeneratedImageUrl(result.imageUrl);
        } catch (error) {
            console.error(error);
            toast({ title: "Error generating image.", description: "Please try again.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const fileName = selectedCard ? `${slugify(selectedCard)}.png` : '';

    return (
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center space-y-8 p-4 md:p-8 bg-background">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="font-headline text-3xl">Tarot Card Image Generator</CardTitle>
                    <CardDescription>Generate the artwork for your Degen Tarot Cat deck, one card at a time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="font-medium">Select a Card</label>
                        <Select value={selectedCard} onValueChange={setSelectedCard}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a tarot card..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TAROT_DECK.map(card => (
                                    <SelectItem key={card} value={card}>{card}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleGenerate} disabled={isGenerating || !selectedCard} size="lg" className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        {isGenerating ? 'Generating...' : 'Generate Image'}
                    </Button>

                    {isGenerating && (
                         <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="mt-4 text-muted-foreground">The AI is creating your masterpiece... this can take a moment.</p>
                         </div>
                    )}

                    {generatedImageUrl && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Generated: {selectedCard}</CardTitle>
                                <CardDescription>Right-click the image to save it.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <Image 
                                    src={generatedImageUrl}
                                    alt={`Generated image for ${selectedCard}`}
                                    width={250}
                                    height={440}
                                    className="rounded-lg border shadow-lg"
                                />
                                <div className="w-full p-4 bg-muted rounded-md text-sm">
                                    <p>1. Save the image above as <code className="bg-background px-1 py-0.5 rounded">{fileName}</code></p>
                                    <p className="mt-2">2. Place the file in the <code className="bg-background px-1 py-0.5 rounded">public/images/tarot/</code> folder in your project.</p>
                                    <p className="mt-2">3. The card will now appear correctly in your app!</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
