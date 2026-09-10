import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { invalidateCoursePracticeTopicQueries } from "@/lib/query-invalidation";
import { courseKeys, examLibraryKeys } from "@/lib/query-keys";

describe("invalidateCoursePracticeTopicQueries", () => {
  it("invalidates exam-library and knowledge-tree keys for the same course", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateCoursePracticeTopicQueries(queryClient, "course-1");

    expect(spy).toHaveBeenCalledWith({
      queryKey: examLibraryKeys.course("course-1"),
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: courseKeys.chapters("course-1"),
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: courseKeys.topicsPrefix("course-1"),
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: courseKeys.knowledgeTree("course-1"),
    });
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
