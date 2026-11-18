import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  calculatePlan(): void {
    this.http.get(`${this.apiUrl}/calculate`).subscribe({
      next: () => console.log('Запрос на расчет успешно отправлен'),
      error: (err) => console.error('Ошибка при вызове расчета:', err),
    });
  }
}
