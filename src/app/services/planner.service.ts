import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable} from 'rxjs';
import type {BrigadesResponseDto} from '../models/brigade.dto';

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private readonly apiUrl = '/api/planner';

  constructor(private http: HttpClient) {}

  /**
   * Запускает расчет на бэкенде.
   * Ничего не возвращает, так как результат пока не требуется на фронте.
   */
  calculatePlan(): Observable<BrigadesResponseDto> {
    return this.http.get<BrigadesResponseDto>(`${this.apiUrl}/calculate`);
  }
}
