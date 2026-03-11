import { api } from '../client';

interface CreateUserPayload {
    email: string;
    phone: string;
    password: string;
    name: string;
    roleType: string;
    province: string;
    accountHandle: string;
}

interface UpdateUserPayload {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
    roleType?: string;
    status?: string;
    linkId?: string;
    province?: string;
    accountHandle?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
}

export async function getUsers() {
    const response = await api.get('/users');
    return response.data;
}

export async function getUserById(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data;
}

export async function createUser(data: CreateUserPayload) {
    const response = await api.post('/users', data);
    return response.data;
}

export async function updateUser(data: UpdateUserPayload) {
    const response = await api.patch('/users', data);
    return response.data;
}

export async function deleteUser(id: string) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
}

/** StaffInfo list (bảng staff_info): GET /staff */
export async function getStaff() {
    const response = await api.get("/staff");
    return response.data;
}

/** Chi tiết một nhân sự: GET /staff/:id */
export async function getStaffById(id: string) {
    const response = await api.get(`/staff/${id}`);
    return response.data;
}

/** Xóa bản ghi staff (StaffInfo) theo id */
export async function deleteStaffById(id: string) {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
}
