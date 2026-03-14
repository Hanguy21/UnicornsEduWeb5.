"use client";

import { useState } from "react";
import { toast } from "sonner";
import RulePostFormPopup, {
  type RulePostFormValues,
  type RulePostItem,
} from "@/components/admin/notes-subject/RulePostFormPopup";
import DocsTab from "@/components/admin/notes-subject/DocsTab";

const INITIAL_MOCK_RULES: RulePostItem[] = [
  {
    id: "1",
    title: "Quy định nộp bài",
    description: "Hướng dẫn nộp bài đúng hạn",
    content: "<p>Học viên cần nộp bài trước 23h59 ngày quy định. Bài nộp trễ sẽ bị trừ điểm.</p>",
  },
  {
    id: "2",
    title: "Quy định điểm danh",
    description: "Cách ghi nhận điểm danh",
    content: "<p>Điểm danh được thực hiện tại đầu mỗi buổi học. Vắng quá 3 buổi không phép sẽ bị cảnh cáo.</p>",
  },
];

export default function AdminNotesSubjectPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "docs">("rules");
  const [rules, setRules] = useState<RulePostItem[]>(INITIAL_MOCK_RULES);
  const [popupOpen, setPopupOpen] = useState(false);

  const handleAddRule = (values: RulePostFormValues) => {
    const newRule: RulePostItem = {
      id: crypto.randomUUID(),
      title: values.title,
      description: values.description,
      content: values.content,
    };
    setRules((prev) => [newRule, ...prev]);
    toast.success("Đã thêm bài quy định.");
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-semibold text-text-primary md:text-2xl">
        Ghi chú môn học
      </h1>

      <div className="mb-6 flex gap-1 rounded-lg border border-border-default bg-bg-secondary p-1">
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
            activeTab === "rules"
              ? "bg-primary text-text-inverse"
              : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          }`}
        >
          Quy định
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("docs")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
            activeTab === "docs"
              ? "bg-primary text-text-inverse"
              : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          }`}
        >
          Tài liệu
        </button>
      </div>

      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Các bài quy định môn học, hướng dẫn cho học viên.
            </p>
            <button
              type="button"
              onClick={() => setPopupOpen(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Thêm bài quy định
            </button>
          </div>

          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="rounded-xl border border-border-default bg-bg-surface p-8 text-center text-text-muted">
                Chưa có bài quy định nào. Nhấn &quot;Thêm bài quy định&quot; để tạo.
              </div>
            ) : (
              rules.map((rule) => (
                <article
                  key={rule.id}
                  className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-shadow hover:shadow-md md:p-5"
                >
                  <h3 className="mb-1 text-base font-semibold text-text-primary">
                    {rule.title}
                  </h3>
                  {rule.description && (
                    <p className="mb-3 text-sm text-text-muted">{rule.description}</p>
                  )}
                  <div
                    className="prose prose-sm max-w-none text-text-secondary [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                    dangerouslySetInnerHTML={{ __html: rule.content }}
                  />
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "docs" && <DocsTab />}

      <RulePostFormPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSubmit={handleAddRule}
      />
    </div>
  );
}
