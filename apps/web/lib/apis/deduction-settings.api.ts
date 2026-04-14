import type {
  BulkUpsertStaffTaxDeductionOverridesPayload,
  BulkUpsertStaffTaxDeductionOverridesResponse,
  CreateRoleTaxDeductionRatePayload,
  CreateStaffTaxDeductionOverridePayload,
  TaxDeductionSettingsQuery,
  TaxDeductionSettingsResponse,
  UpdateRoleTaxDeductionRatePayload,
  UpdateStaffTaxDeductionOverridePayload,
} from "@/dtos/deduction-settings.dto";
import { api } from "../client";

export async function getTaxDeductionSettings(
  params: TaxDeductionSettingsQuery = {},
): Promise<TaxDeductionSettingsResponse> {
  const response = await api.get<TaxDeductionSettingsResponse>(
    "/deduction-settings/tax",
    {
      params: {
        ...(params.asOfDate ? { asOfDate: params.asOfDate } : {}),
        ...(params.roleType ? { roleType: params.roleType } : {}),
        ...(params.staffId ? { staffId: params.staffId } : {}),
      },
    },
  );

  return response.data;
}

export async function appendRoleTaxDeductionRate(
  payload: CreateRoleTaxDeductionRatePayload,
) {
  const response = await api.post(
    "/deduction-settings/tax/role-defaults",
    payload,
  );
  return response.data;
}

export async function updateRoleTaxDeductionRate(
  id: string,
  payload: UpdateRoleTaxDeductionRatePayload,
) {
  const response = await api.patch(
    `/deduction-settings/tax/role-defaults/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function appendStaffTaxDeductionOverride(
  payload: CreateStaffTaxDeductionOverridePayload,
) {
  const response = await api.post(
    "/deduction-settings/tax/staff-overrides",
    payload,
  );
  return response.data;
}

export async function updateStaffTaxDeductionOverride(
  id: string,
  payload: UpdateStaffTaxDeductionOverridePayload,
) {
  const response = await api.patch(
    `/deduction-settings/tax/staff-overrides/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function bulkUpsertStaffTaxDeductionOverrides(
  payload: BulkUpsertStaffTaxDeductionOverridesPayload,
): Promise<BulkUpsertStaffTaxDeductionOverridesResponse> {
  const response = await api.post<BulkUpsertStaffTaxDeductionOverridesResponse>(
    "/deduction-settings/tax/staff-overrides/bulk-upsert",
    payload,
  );
  return response.data;
}
