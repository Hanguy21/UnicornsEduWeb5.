import { StaffRole } from "generated/enums";


export interface CreateStaffDto {
    full_name: string;
    birth_date: Date;
    university: string;
    high_school: string;
    specialization: string;
    bank_account: string;
    bank_qr_link: string;
    roles: StaffRole[];
    user_id: string;
}

export interface UpdateStaffDto extends Partial<CreateStaffDto> {
    id: string;
}