import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from '@/dtos/Auth.dto';
import { api } from '../client';

export async function logIn(LoginDto: LoginDto) {
    const response = await api.post('/auth/login', LoginDto);
    return response.data;
}

export async function register(RegisterDto: RegisterDto) {
    const response = await api.post('/auth/register', RegisterDto);
    return response.data;
}

export async function forgotPassword(ForgotPasswordDto: ForgotPasswordDto) {
    const response = await api.post('/auth/forgot-password', ForgotPasswordDto);
    return response.data;
}

export async function resetPassword(ResetPasswordDto: ResetPasswordDto) {
    const response = await api.post('/auth/reset-password', ResetPasswordDto);
    return response.data;
}

export async function verifyEmail(token: string) {
    const response = await api.get(`/auth/verify?token=${token}`);
    return response.data;
}

export async function getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
}

export async function logout() {
    const response = await api.post('/auth/logout');
    return response.data;
}