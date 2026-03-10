export interface UserAuthDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}
