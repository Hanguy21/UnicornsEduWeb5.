"use client";

import type { ReactNode } from "react";

export function RolePolicySaveButton({
  label,
  onClick,
  disabled,
  isSaving,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  isSaving: boolean;
  variant?: "primary" | "outline";
}) {
  const variantClassName =
    variant === "primary"
      ? "bg-primary text-text-inverse hover:opacity-90"
      : "border border-border-default text-text-primary hover:bg-bg-secondary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto ${variantClassName}`}
    >
      {isSaving ? "Đang lưu…" : label}
    </button>
  );
}

export function RolePolicySettingsCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  /** Nút lưu (có thể nhiều nút cho các trục lưu độc lập). */
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
            {actions}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
