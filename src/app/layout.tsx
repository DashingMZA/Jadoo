import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { ContextMenu } from "@/components/ContextMenu";
import { AppProviders } from "@/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jadoo",
  description: "Batch video logo overlay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">{children}</main>
          </div>
          <ContextMenu />
        </AppProviders>
      </body>
    </html>
  );
}
