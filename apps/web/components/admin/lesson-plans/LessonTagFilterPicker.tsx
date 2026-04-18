"use client";

import { useMemo, useState } from "react";
import {
  buildLessonTagGroups,
  loadCustomLessonTags,
} from "./LessonTagPicker";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export default function LessonTagFilterPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customTags] = useState<string[]>(() => loadCustomLessonTags());

  const groups = useMemo(
    () => buildLessonTagGroups(customTags),
    [customTags],
  );

  const visibleGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        totalCount: group.tags.length,
        tags: group.tags.filter((tag) =>
          keyword ? tag.toLowerCase().includes(keyword) : true,
        ),
      }))
      .filter((group) => group.tags.length > 0);
  }, [groups, search]);

  const selected = useMemo(() => new Set(value), [value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onFocus={() => {
          setOpen(true);
        }}
        onChange={(event) => {
          setOpen(true);
          setSearch(event.target.value);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder="Tìm kiếm và chọn tag..."
        className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      />

      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
            >
              {tag}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border-default bg-bg-surface shadow-lg">
          {visibleGroups.map((group) => (
            <div key={group.key}>
              <div
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${group.toneClassName}`}
              >
                {group.label} ({group.totalCount})
              </div>
              {group.tags.map((tag) => {
                const active = [...selected].some(
                  (item) => item.toLowerCase() === tag.toLowerCase(),
                );
                return (
                  <button
                    key={`${group.key}-${tag}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (active) {
                        onChange(
                          value.filter(
                            (item) => item.toLowerCase() !== tag.toLowerCase(),
                          ),
                        );
                      } else {
                        onChange([...value, tag]);
                      }
                    }}
                    className={`flex w-full items-center justify-between border-t border-border-default/60 px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-text-primary hover:bg-bg-secondary/60"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="size-4 shrink-0 text-primary/70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M7 7h7l5 5-7 7-5-5V7z"
                        />
                      </svg>
                      {tag}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
