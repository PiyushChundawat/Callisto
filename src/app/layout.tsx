import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/ui/Navbar";
import TickerStrip from "@/components/ui/TickerStrip";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { mockStocks } from "@/lib/mockStocks";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"], variable: "--font-space-grotesk", weight: ["400", "500", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <SessionProviderWrapper>
          <Navbar />
          <main className="pt-16">
            <TickerStrip stocks={mockStocks} />
            {children}
          </main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}