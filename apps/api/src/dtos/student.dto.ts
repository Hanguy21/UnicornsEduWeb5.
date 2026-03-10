export enum Gender {
    male = 'male',
    female = 'female',
}

export enum StudentStatus {
    active = 'active',
    inactive = 'inactive',
}

export interface CreateStudentDto {
    full_name: string;
    email: string;
    phone: string;
    school: string;
    province: string;
    birth_year: number;
    parent_name: string;
    parent_phone: string;
    status: StudentStatus;
    gender: Gender;
    goal: string;
    drop_out_date?: Date;
    user_id: string;
}

export interface UpdateStudentDto extends Partial<CreateStudentDto> {
    id: string;
}