import type { EmployeeDto } from './employee.dto';
import type { EventDto } from './event.dto';

export interface BrigadeDto {
  brigade_id: number;
  employees: EmployeeDto[];
  event_order: EventDto[];
}

export interface BrigadesResponseDto {
  brigades: BrigadeDto[];
}
