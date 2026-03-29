"use client";

import { Navbar } from "@/components/Navbar";
import { StudentAccessGate } from "@/components/student";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentAccessGate>
      <div className="min-h-screen bg-bg-primary">
        <Navbar showHomeMenu={false} />
        <div
          className="pointer-events-none fixed inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at top left, color-mix(in srgb, var(--ue-primary) 14%, transparent) 0, transparent 34%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--ue-info) 12%, transparent) 0, transparent 28%)",
          }}
        />
        <main className="relative mx-auto w-full max-w-6xl px-3 pb-8 pt-4 sm:px-6 sm:pt-6">
          {children}
        </main>
      </div>
    </StudentAccessGate>
  );
}
