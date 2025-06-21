
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TAROT_DECK } from '@/lib/tarot';
import { Loader2, Sparkles, Terminal } from 'lucide-react';
import { generateTarotCardImage } from '@/ai/flows/generate-tarot-card-image';
import Image from 'next/image';
import { slugify } from '@/lib/card-images';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ImageGeneratorPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<{ cardName: string; imageUrl: string; }[]>([]);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const { toast } = useToast();

    const handleGenerateAll = async () => {
        setIsGenerating(true);
        setGeneratedImages([]);
        setGenerationProgress(0);
        setProgressMessage('');

        const results: { cardName: string; imageUrl: string; }[] = [];

        try {
            for (let i = 0; i < TAROT_DECK.length; i++) {
                const cardName = TAROT_DECK[i];
                const progressPercentage = Math.round(((i + 1) / TAROT_DECK.length) * 100);
                
                setProgressMessage(`Generating card ${i + 1} of ${TAROT_DECK.length}: ${cardName}`);
                setGenerationProgress(progressPercentage);
                
                // Delay to respect the API rate limit (10 requests/minute).
                // 7 seconds is a safe buffer.
                await new Promise(resolve => setTimeout(resolve, 7000));

                const result = await generateTarotCardImage({ cardName });
                
                const newImage = { cardName, imageUrl: result.imageUrl };
                // Add to results and update the displayed grid immediately
                results.push(newImage);
                setGeneratedImages([...results]); 
            }
            setProgressMessage('All 78 cards have been generated!');
        } catch (error) {
            console.error(error);
            let description = 'An error occurred. Please check the console for details.';
            if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
                description = "You've likely hit the API's daily rate limit (100 images/day). Please try again tomorrow or check your billing plan.";
            }
            
            toast({ 
                title: "Error during bulk generation.", 
                description: description,
                variant: "destructive",
                duration: 9000 
            });
            setProgressMessage('An error occurred. Some cards may have failed.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <main className="relative z-10 flex min-h-screen flex-col items-center space-y-8 p-4 md:p-8 bg-background">
            <Card className="w-full max-w-6xl">
                <CardHeader>
                    <CardTitle className="font-headline text-3xl">Tarot Card Image Generator</CardTitle>
                    <CardDescription>
                        Generate the artwork for your Degen Tarot Cat deck.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Heads Up! Important API Limits</AlertTitle>
                        <AlertDescription>
                            The free tier for the image generation API has a rate limit of **10 images per minute** and a daily limit of **100 images**. Generating all 78 cards at once will take about 9 minutes and use most of your daily quota.
                        </AlertDescription>
                    </Alert>
                    
                    <Button onClick={handleGenerateAll} disabled={isGenerating} size="lg" className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        {isGenerating ? 'Generating...' : 'Generate All 78 Cards'}
                    </Button>

                    {isGenerating && (
                         <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg space-y-4">
                            <Progress value={generationProgress} className="w-full" />
                            <p className="text-muted-foreground">{progressMessage}</p>
                         </div>
                    )}

                    {generatedImages.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-headline text-2xl">Generated Cards</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {generatedImages.map((image) => (
                                    <Card key={image.cardName}>
                                        <CardHeader>
                                            <CardTitle>{image.cardName}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center gap-4">
                                            <Image 
                                                src={image.imageUrl}
                                                alt={`Generated image for ${image.cardName}`}
                                                width={250}
                                                height={440}
                                                className="rounded-lg border shadow-lg aspect-[25/44] object-cover"
                                            />
                                            <div className="w-full p-2 bg-muted rounded-md text-sm">
                                                <p>1. Save image as:</p>
                                                <code className="bg-background text-xs px-1 py-0.5 rounded break-all">{slugify(image.cardName)}.png</code>
                                                <p className="mt-2">2. Place in folder:</p>
                                                <code className="bg-background text-xs px-1 py-0.5 rounded">public/images/tarot/</code>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
