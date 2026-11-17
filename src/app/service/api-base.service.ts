import { inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Page, PageQuery } from '../models/page.model';

/**
 * Базовый класс: общие утилиты для REST-запросов к Spring Data.
 * Не DI-сервис (без @Injectable) — расширяется конкретными сервисами.
 */
export abstract class ApiBaseService {
  protected readonly http = inject(HttpClient);

  /** Собирает HttpParams из объекта, отбрасывая null/undefined/пустые строки. */
  protected buildParams(query: Record<string, unknown> = {}): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value)) {
        for (const v of value) params = params.append(key, String(v));
      } else {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  /** Разворачивает PageQuery в плоский объект параметров. */
  protected pageParams(page: PageQuery = {}): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (page.page !== undefined) out['page'] = page.page;
    if (page.size !== undefined) out['size'] = page.size;
    if (page.sort !== undefined) out['sort'] = page.sort;
    return out;
  }

  /** Обёртка над GET с Page<T> и обработкой ошибок. */
  protected getPage<T>(url: string, query: Record<string, unknown>): Observable<Page<T>> {
    return this.http
      .get<Page<T>>(url, { params: this.buildParams(query) })
      .pipe(catchError(this.handleError));
  }

  protected getOne<T>(url: string, query: Record<string, unknown> = {}): Observable<T> {
    return this.http
      .get<T>(url, { params: this.buildParams(query) })
      .pipe(catchError(this.handleError));
  }

  protected handleError(err: HttpErrorResponse): Observable<never> {
    const message =
      err.status === 0
        ? 'Сервер недоступен'
        : err.status === 404
          ? 'Не найдено'
          : err.error?.message ?? err.message ?? `Ошибка ${err.status}`;
    return throwError(() => new ApiError(err.status, message, err.error));
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
