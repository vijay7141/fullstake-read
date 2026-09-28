import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'WhatsApp CRM | Meta WhatsApp Business Cloud API',
  description: 'Production-ready WhatsApp CRM web application using Next.js and official Meta WhatsApp Business Cloud API',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
