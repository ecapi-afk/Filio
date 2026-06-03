// app/layout.tsx
import type { Metadata } from 'next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n/context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Filio - UK Accounting Document Management',
  description: 'Manage client document uploads synced to Xero',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster richColors position="top-right" />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
