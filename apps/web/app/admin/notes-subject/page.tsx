"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import RulePostFormPopup, {
  type RulePostFormValues,
  type RulePostItem,
} from "@/components/admin/notes-subject/RulePostFormPopup";
import DocsTab from "@/components/admin/notes-subject/DocsTab";

const INITIAL_MOCK_RULE_POSTS: RulePostItem[] = [
  {
    id: "1",
    title: "Quy định nộp bài",
    description: "Hướng dẫn và thời hạn nộp bài",
    content:
      "Học viên cần nộp bài **đúng thời hạn**. Bài nộp trễ sẽ bị trừ điểm.\n\nVí dụ: nếu bài được chấm theo thang điểm \\(10\\), nộp trễ 1 ngày trừ \\(1\\) điểm.",
  },
  {
    id: "2",
    title: "Quy định điểm danh",
    description: "Cách thức điểm danh và vắng có phép",
    content:
      "Điểm danh trước **15 phút** sau giờ học. Vắng có phép cần báo trước *24h*.\n\nCông thức minh họa: $$\\text{Tỉ lệ chuyên cần} = \\frac{\\text{số buổi có mặt}}{\\text{tổng số buổi}} \\times 100\\%.$$",
  },
];

type TabId = "quy-dinh" | "tai-lieu";

const TAB_LABELS: Record<TabId, string> = {
  "quy-dinh": "Quy định",
  "tai-lieu": "Tài liệu",
};

export default function AdminNotesSubjectPage() {
  const [activeTab, setActiveTab] = useState<TabId>("quy-dinh");
  const [rulePosts, setRulePosts] = useState<RulePostItem[]>(INITIAL_MOCK_RULE_POSTS);
  const [formPopupOpen, setFormPopupOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const existing = document.getElementById("katex-styles");
    if (existing) return;

    const link = document.createElement("link");
    link.id = "katex-styles";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }, []);

  const handleAddRulePost = (values: RulePostFormValues) => {
    const newPost: RulePostItem = {
      id: crypto.randomUUID(),
      title: values.title,
      description: values.description,
      content: values.content,
    };

    setRulePosts((prev) => [newPost, ...prev]);
    toast.success("Đã thêm bài quy định");
    setFormPopupOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-16 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative">
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Ghi chú môn học</h1>


            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <nav
                className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border border-border-default bg-bg-surface/90 p-1.5 shadow-sm lg:w-auto"
                role="tablist"
                aria-label="Các tab"
              >
                {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => {
                  const isActive = activeTab === tabId;

                  return (
                    <button
                      key={tabId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tabId}`}
                      id={`tab-${tabId}`}
                      onClick={() => setActiveTab(tabId)}
                      className={`min-h-11 min-w-fit rounded-[0.9rem] px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${isActive
                        ? "bg-primary font-medium text-text-inverse"
                        : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                        }`}
                    >
                      {TAB_LABELS[tabId]}
                    </button>
                  );
                })}
              </nav>

              {activeTab === "quy-dinh" ? (
                <button
                  type="button"
                  onClick={() => setFormPopupOpen(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus lg:w-auto"
                >
                  <svg
                    className="size-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm bài quy định
                </button>
              ) : (
                <div className="rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-secondary shadow-sm">
                  Chọn group rồi mở contest để xem tutorial.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          {activeTab === "quy-dinh" && (
            <section
              id="panel-quy-dinh"
              role="tabpanel"
              aria-labelledby="tab-quy-dinh"
              className="space-y-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="rounded-md border border-border-default bg-bg-secondary/60 px-3 py-2 text-sm text-text-secondary">
                  {rulePosts.length} bài quy định
                </div>
              </div>

              {rulePosts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface py-16 text-center">
                  <p className="text-base font-medium text-text-primary">Chưa có bài quy định nào.</p>
                  <p className="mt-2 text-sm text-text-muted">
                    Tạo bài đầu tiên để bắt đầu xây dựng nội dung cho môn học này.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {rulePosts.map((post, index) => (
                    <article
                      key={post.id}
                      className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:border-border-focus hover:bg-bg-elevated sm:p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary ring-1 ring-border-default">
                          Bài {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <h2 className="mt-4 text-xl font-semibold text-text-primary">{post.title}</h2>
                      {post.description ? (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                          {post.description}
                        </p>
                      ) : null}

                      <div className="prose prose-sm mt-4 max-w-none text-text-secondary [&_.katex-display]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[[rehypeKatex, { strict: "ignore" }]]}
                        >
                          {post.content}
                        </ReactMarkdown>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "tai-lieu" && (
            <section
              id="panel-tai-lieu"
              role="tabpanel"
              aria-labelledby="tab-tai-lieu"
              className="space-y-4"
            >

              <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
                <DocsTab />
              </div>
            </section>
          )}
        </div>
      </div>

      <RulePostFormPopup
        open={formPopupOpen}
        onClose={() => setFormPopupOpen(false)}
        onSubmit={handleAddRulePost}
      />
    </div>
  );
}
