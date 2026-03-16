export type StudentStatus = "active" | "inactive";

/** Item from GET /student list (backend returns array) */
export interface StudentListItem {
  id: string;
  fullName: string;
  email?: string | null;
  school?: string | null;
  province?: string | null;
  status?: StudentStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Detail from GET /student/:id */
export interface StudentDetail extends StudentListItem {}
