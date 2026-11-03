import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Monn",
    template: "%s · Monn",
  },
  description: "Monns arbeidsrom for ansatte og kunder.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
