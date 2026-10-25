import Navbar from "@/components/ui/Navbar";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <Navbar />
          <main className="pt-16">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}