import { UserRole, UserStatus } from "generated/enums";


export interface CreateUserDto {
    email: string;
    phone: string;
    password: string;
    name: string;
    roleType: UserRole;
    province: string;
    accountHandle: string;
}

export interface UserInfoDto {
    email?: string;
    phone?: string;
    name?: string;
    roleType?: UserRole;
    status?: UserStatus;
    linkId?: string;
    province?: string;
    accountHandle?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    refreshToken?: string;
}

export interface UpdateUserDto extends UserInfoDto {
    id: string;
}