export type CostStatus = "paid" | "pending";
export type CostUpsertMode = "create" | "edit";

export interface CostListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface CostBaseFields {
  month?: string | null;
  category?: string | null;
  amount?: number | null;
  date?: string | null;
  status?: CostStatus | null;
}

export interface CostListItem extends CostBaseFields {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CostDetailResponse = CostListItem;

export interface CreateCostPayload {
  month?: string;
  category?: string;
  amount?: number;
  date?: string;
  status?: CostStatus;
}

export interface UpdateCostPayload {
  id: string;
  month?: string | null;
  category?: string;
  amount?: number;
  date?: string | null;
  status?: CostStatus;
}

export interface BulkUpdateCostStatusPayload {
  costIds: string[];
  status: CostStatus;
}

export interface BulkUpdateCostStatusResult {
  requestedCount: number;
  updatedCount: number;
}

export interface CostListResponse {
  data: CostListItem[];
  meta: CostListMeta;
}
