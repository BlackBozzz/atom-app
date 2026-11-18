import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { EmployeeDto } from '../models/employee.dto';

export interface EmployeePage {
  content: EmployeeDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/employees';

  /** GET /api/employees?page=&size=&lastName=&firstName= */
  list(params: {
    page?: number;
    size?: number;
    lastName?: string;
    firstName?: string;
    sort?: string;
  } = {}): Observable<EmployeePage> {
    let httpParams = new HttpParams();
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.size != null) httpParams = httpParams.set('size', params.size);
    if (params.lastName) httpParams = httpParams.set('lastName', params.lastName);
    if (params.firstName) httpParams = httpParams.set('firstName', params.firstName);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<EmployeePage>(this.base, { params: httpParams });
  }

  /** DELETE /api/sync/employees — очистка всех загруженных сотрудников (см. backend). */
  clearAll(): Observable<void> {
    return this.http.delete<void>('/api/sync/all');
  }
}
