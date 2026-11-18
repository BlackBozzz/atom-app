export interface QualificationItemDto {
  idQualification: number;
  resourceType: string;        // 'water' | 'electricity'
  proff: number;                // 0.0 .. 10.0
}

export interface EmployeeDto {
  tabel: number;
  lastName: string;
  firstName: string;
  middleName: string | null;
  startDateExperience: string | null;   // ISO date 'YYYY-MM-DD'
  qualifications: QualificationItemDto[];
}
