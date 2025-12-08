import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import SearchBox from "./_components/search";
import { HydrateClient } from "~/trpc/server";
import Cupon from "./_components/Cupon";

export const metadata: Metadata = {
  title: "JYSK-Search",
  description: "Meklēšanas rīks",
  icons: [
    {
      rel: "icon",
      url: "https://www.jysk.lv/media/logo/default/jysk-logo-outline.png",
    },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lv" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <HydrateClient>
            <div className="grid min-h-screen grid-rows-[auto_1fr]">
              <header>
                <SearchBox />
              </header>
              <main>{children}</main>
              <footer className="border-t border-gray-200 px-4 py-16">
                <p className="font-semibold">Vitālijs Vlads Juhno</p>
                <p>2025</p>
                <p>Beta 1.2.1</p>
              </footer>
              <Cupon />
            </div>
          </HydrateClient>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
