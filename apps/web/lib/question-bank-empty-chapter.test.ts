import { describe, expect, it } from "vitest";
import { resolveQuestionBankEmptyChapterCopy } from "@/lib/question-bank-empty-chapter";

describe("resolveQuestionBankEmptyChapterCopy", () => {
  it("points managers at the content tab", () => {
    const copy = resolveQuestionBankEmptyChapterCopy(true);
    expect(copy.actionLabel).toBe("Mở tab Nội dung");
    expect(copy.body).toMatch(/tab Nội dung/);
  });

  it("asks lesson-plan members to contact an assistant", () => {
    const copy = resolveQuestionBankEmptyChapterCopy(false);
    expect(copy.actionLabel).toBeNull();
    expect(copy.body).toMatch(/trợ lí/i);
  });
});
