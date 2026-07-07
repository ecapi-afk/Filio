'use client'

import { PauseCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PortalPausedPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-emerald-600">
            F
          </div>
          <div>
            <p className="text-sm font-bold">Filio</p>
            <p className="text-[10px] text-muted-foreground">Client Document Portal</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-amber-50">
              <PauseCircle className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">Portal paused</CardTitle>
            <CardDescription>
              Your document portal has been temporarily paused. Please contact your accountant for more information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
