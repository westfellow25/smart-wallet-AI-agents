import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentVault — Control Tower",
  description: "Corporate wallet for AI agents — spending policies, approvals, audit trail",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
