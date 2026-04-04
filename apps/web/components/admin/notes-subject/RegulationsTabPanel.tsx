"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { RulePostFormValues, RulePostItem } from "./RulePostFormPopup";
import RulePostEditTable from "./RulePostEditTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  rulePosts: RulePostItem[];
  onUpdateRule: (id: string, values: RulePostFormValues) => void;
};

function truncate(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function RegulationsTabPanel({
  rulePosts,
  onUpdateRule,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRule = selectedId
    ? rulePosts.find((r) => r.id === selectedId) ?? null
    : null;

  const handleRowActivate = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleSave = useCallback(
    (values: RulePostFormValues) => {
      if (!selectedId) return;
      onUpdateRule(selectedId, values);
      toast.success("Đã cập nhật quy định");
    },
    [onUpdateRule, selectedId],
  );

  const handleDiscard = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (rulePosts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface py-16 text-center">
        <p className="text-base font-medium text-text-primary">
          Chưa có bài quy định nào.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Tạo bài đầu tiên bằng nút thêm ở góc trên.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-border-default bg-bg-secondary/60 px-3 py-2 text-sm text-text-secondary">
        {rulePosts.length} quy định — chọn một dòng để mở bảng chỉnh sửa.
      </div>

      <div className="rounded-xl border border-border-default bg-bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 tabular-nums">STT</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead className="hidden min-w-[12rem] md:table-cell">
                Mô tả
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rulePosts.map((post, index) => {
              const isSelected = selectedId === post.id;
              return (
                <TableRow
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`Quy định: ${post.title}. ${isSelected ? "Đang chọn" : "Nhấn để chỉnh sửa"}`}
                  onClick={() => handleRowActivate(post.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowActivate(post.id);
                    }
                  }}
                  className={`cursor-pointer border-l-4 border-l-transparent ${
                    isSelected
                      ? "border-l-primary bg-primary/8 hover:bg-primary/10"
                      : ""
                  }`}
                >
                  <TableCell className="tabular-nums text-text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="max-w-[12rem] font-medium text-text-primary whitespace-normal sm:max-w-none">
                    {post.title}
                  </TableCell>
                  <TableCell className="hidden max-w-xl text-text-secondary whitespace-normal md:table-cell">
                    {post.description
                      ? truncate(post.description, 120)
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="min-h-[4rem]">
        {selectedRule ? (
          <RulePostEditTable
            key={selectedRule.id}
            rule={selectedRule}
            onSave={handleSave}
            onDiscard={handleDiscard}
          />
        ) : (
          <div
            className="rounded-lg border border-dashed border-border-default bg-bg-secondary/30 px-4 py-8 text-center text-sm text-text-muted"
            role="status"
          >
            Chọn một quy định trong bảng phía trên để hiển thị bảng chỉnh sửa.
          </div>
        )}
      </div>
    </div>
  );
}
