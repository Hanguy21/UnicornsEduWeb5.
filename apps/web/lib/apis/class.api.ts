import {
  ClassListItem,
  ClassListResponse,
  ClassStatus,
  ClassTeacher,
  ClassTeacherPayload,
  ClassType,
} from '@/dtos/class.dto';
import {
  ClassDetail,
  CreateClassPayload,
  UpdateClassBasicInfoPayload,
  UpdateClassPayload,
  UpdateClassSchedulePayload,
  UpdateClassStudentsPayload,
  UpdateClassTeachersPayload,
} from '@/dtos/class.dto';
import { api } from "../client";

function normalizeOperatingDeductionRatePercent(
  teacher: Record<string, unknown>,
): number | null | undefined {
  const rawValue =
    teacher.operatingDeductionRatePercent ??
    teacher.taxRatePercent ??
    teacher.operating_deduction_rate_percent ??
    teacher.tax_rate_percent;

  if (rawValue == null) {
    return null;
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  return numericValue;
}

function normalizeClassTeacher(teacher: unknown): ClassTeacher {
  const source = (teacher ?? {}) as Record<string, unknown>;
  const operatingDeductionRatePercent =
    normalizeOperatingDeductionRatePercent(source);

  return {
    ...(source as unknown as ClassTeacher),
    ...(operatingDeductionRatePercent !== undefined
      ? {
          operatingDeductionRatePercent,
          taxRatePercent: operatingDeductionRatePercent,
        }
      : {}),
  };
}

function normalizeClassRecord<T extends ClassListItem>(record: T): T {
  if (!Array.isArray(record.teachers)) {
    return record;
  }

  return {
    ...record,
    teachers: record.teachers.map((teacher) => normalizeClassTeacher(teacher)),
  };
}

function normalizeClassTeacherPayload(
  teacher: ClassTeacherPayload,
): ClassTeacherPayload {
  const operatingDeductionRatePercent =
    teacher.operating_deduction_rate_percent ?? teacher.tax_rate_percent;

  if (operatingDeductionRatePercent == null) {
    return teacher;
  }

  return {
    ...teacher,
    operating_deduction_rate_percent: operatingDeductionRatePercent,
    tax_rate_percent: operatingDeductionRatePercent,
  };
}

function normalizeTeachersPayload<T extends { teachers?: ClassTeacherPayload[] }>(
  payload: T,
): T {
  if (!Array.isArray(payload.teachers)) {
    return payload;
  }

  return {
    ...payload,
    teachers: payload.teachers.map((teacher) =>
      normalizeClassTeacherPayload(teacher),
    ),
  };
}

export async function getClasses(params: {
  page: number;
  limit: number;
  search?: string;
  status?: "" | ClassStatus;
  type?: "" | ClassType;
}): Promise<ClassListResponse> {
  const response = await api.get("/class", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
    },
  });

  const payload = response.data as ClassListResponse;
  return {
    data: Array.isArray(payload?.data)
      ? payload.data.map((item) => normalizeClassRecord(item))
      : [],
    meta: {
      total: payload?.meta?.total ?? 0,
      page: payload?.meta?.page ?? params.page,
      limit: payload?.meta?.limit ?? params.limit,
    },
  };
}

export async function getClassById(id: string): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.get(`/class/${safeId}`);
  return normalizeClassRecord(response.data as ClassDetail);
}

export async function createClass(data: CreateClassPayload): Promise<ClassDetail> {
  const response = await api.post('/class', normalizeTeachersPayload(data));
  return normalizeClassRecord(response.data as ClassDetail);
}

export async function deleteClassById(id: string) {
  const safeId = encodeURIComponent(id);
  const response = await api.delete(`/class/${safeId}`);
  return response.data;
}

export async function updateClass(data: UpdateClassPayload): Promise<ClassDetail> {
  const response = await api.patch("/class", normalizeTeachersPayload(data));
  return normalizeClassRecord(response.data as ClassDetail);
}

export async function updateClassBasicInfo(
  id: string,
  data: UpdateClassBasicInfoPayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/basic-info`, data);
  return response.data;
}

export async function updateClassTeachers(
  id: string,
  data: UpdateClassTeachersPayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(
    `/class/${safeId}/teachers`,
    normalizeTeachersPayload(data),
  );
  return normalizeClassRecord(response.data as ClassDetail);
}

export async function updateClassSchedule(
  id: string,
  data: UpdateClassSchedulePayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/schedule`, data);
  return response.data;
}

export async function updateClassStudents(
  id: string,
  data: UpdateClassStudentsPayload,
): Promise<ClassDetail> {
  const safeId = encodeURIComponent(id);
  const response = await api.patch(`/class/${safeId}/students`, data);
  return response.data;
}
