import type { StudentDetail, StudentListItem } from "@/dtos/student.dto";
import { api } from "../client";

/**
 * GET /student – list students with optional search by full name.
 * Backend returns a plain array (no meta).
 */
export async function getStudents(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<StudentListItem[]> {
  const response = await api.get<StudentListItem[]>("/student", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    },
  });
  const data = response.data;
  return Array.isArray(data) ? data : [];
}

/**
 * GET /student/:id – get student by ID.
 */
export async function getStudentById(id: string): Promise<StudentDetail | null> {
  const safeId = encodeURIComponent(id);
  const response = await api.get<StudentDetail>(`/student/${safeId}`);
  return response.data ?? null;
}
