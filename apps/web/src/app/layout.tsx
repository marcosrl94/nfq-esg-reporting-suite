import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEShop · GSV",
  description:
    "Mega suite ESG bajo la marca GSV — Green Strategic Value. Mide tu huella, planifica tu descarbonización y publica tus disclosures CSRD.",
  icons: {
    icon: "/branding/geshop-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
