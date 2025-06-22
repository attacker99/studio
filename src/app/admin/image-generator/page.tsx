
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck2 } from 'lucide-react';

export default function ImageGeneratorPage() {
    return (
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center space-y-8 p-4 md:p-8 bg-background">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <FileCheck2 className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-3xl mt-4">Image Set Complete</CardTitle>
                    <CardDescription>
                        This application is configured to use the tarot card images located in the <code>public/images/tarot/</code> directory. No further image generation is required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        If you need to change or update the card artwork, you can replace the files directly in that folder.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
