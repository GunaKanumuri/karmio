import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/Providers';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';

export const metadata: Metadata = {
  title: 'Karmio - Your career co-pilot',
  description: 'All-in-one job search platform. Verified jobs, AI resume tailoring, smart networking, pipeline tracking, and interview prep.',
  keywords: ['job search', 'resume builder', 'career', 'job tracker', 'ATS', 'networking'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        </Providers>
      </body>
    </html>
  );
}
