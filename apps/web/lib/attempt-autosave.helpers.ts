import type { AttemptQuestionDto } from "@/dtos/attempt.dto";

export function isAttemptQuestionUnanswered(q: AttemptQuestionDto): boolean {
  if (q.type === "single_choice") return q.choiceIndex == null;
  return !q.essayAnswer?.trim();
}

export function unansweredQuestionNumbers(
  questions: AttemptQuestionDto[],
): number[] {
  return questions.flatMap((q, i) =>
    isAttemptQuestionUnanswered(q) ? [i + 1] : [],
  );
}

export function answersSignature(questions: AttemptQuestionDto[]): string {
  return JSON.stringify(
    questions.map((q) => ({
      id: q.questionId,
      c: q.choiceIndex,
      e: q.essayAnswer ?? "",
    })),
  );
}

export function formatSavedAt(at: Date): string {
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
