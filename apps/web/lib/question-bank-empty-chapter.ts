export type QuestionBankEmptyChapterCopy = {
  title: string;
  body: string;
  actionLabel: string | null;
};

/**
 * Copy when a course has zero chapters. Gating uses
 * `canViewContentTab` from `resolveCourseWorkspaceCapabilities` — not a
 * second role matrix. Lesson-plan members cannot create chapters, so they
 * get a contact-assistant path instead of a dead-end form.
 */
export function resolveQuestionBankEmptyChapterCopy(
  canViewContentTab: boolean,
): QuestionBankEmptyChapterCopy {
  if (canViewContentTab) {
    return {
      title: "Chưa có chương",
      body: "Mọi câu hỏi phải thuộc một chương. Hãy tạo chương ở tab Nội dung rồi quay lại đây.",
      actionLabel: "Mở tab Nội dung",
    };
  }
  return {
    title: "Chưa có chương",
    body: "Khoá học này chưa có chương nên chưa thể tạo câu hỏi. Liên hệ trợ lí để tạo chương trước.",
    actionLabel: null,
  };
}
