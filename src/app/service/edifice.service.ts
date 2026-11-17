import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiBaseService } from './api-base.service';
import { EdificeDto, EdificeQuery } from '../models/edifice.model';
import { Page, PageQuery } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class EdificeService extends ApiBaseService {
  private readonly baseUrl = '/api/legacy/edifices';

  /** Кэш всех загруженных объектов (id → DTO). */
  private readonly cache = signal<Map<number, EdificeDto>>(new Map());

  readonly all = computed(() => Array.from(this.cache().values()));

  /** GET /api/legacy/edifices — постранично, с фильтрами. */
  page(query: EdificeQuery = {}, page: PageQuery = {}): Observable<Page<EdificeDto>> {
    return this.getPage<EdificeDto>(this.baseUrl, { ...query, ...this.pageParams(page) }).pipe(
      tap((res) => this.remember(res.content)),
    );
  }

  /**
   * Загружает ВСЕ страницы последовательно (для диаграммы нужен весь набор).
   * size=200 — компромисс между числом запросов и объёмом.
   */
  loadAll(query: EdificeQuery = {}, size = 200): Observable<EdificeDto[]> {
    const first = this.page(query, { page: 0, size, sort: 'idEdifice' });
    return new Observable<EdificeDto[]>((subscriber) => {
      const acc: EdificeDto[] = [];
      const sub = first.subscribe({
        next: (p) => {
          acc.push(...p.content);
          const rest = p.totalPages > 1 ? this.fetchRemaining(query, size, p.totalPages) : [];
          if (!rest.length) {
            this.remember(acc);
            subscriber.next(acc);
            subscriber.complete();
            return;
          }
          let done = 0;
          for (const obs of rest) {
            obs.subscribe({
              next: (page) => {
                acc.push(...page.content);
                if (++done === rest.length) {
                  this.remember(acc);
                  subscriber.next(acc);
                  subscriber.complete();
                }
              },
              error: (e) => subscriber.error(e),
            });
          }
        },
        error: (e) => subscriber.error(e),
      });
      return () => sub.unsubscribe();
    });
  }

  private fetchRemaining(
    query: EdificeQuery,
    size: number,
    totalPages: number,
  ): Observable<Page<EdificeDto>>[] {
    return Array.from({ length: totalPages - 1 }, (_, i) =>
      this.page(query, { page: i + 1, size, sort: 'idEdifice' }),
    );
  }

  getById(id: number): Observable<EdificeDto> {
    // Если бэкенд не отдаёт GET /{id}, используем кэш
    const cached = this.cache().get(id);
    if (cached) return new Observable((s) => { s.next(cached); s.complete(); });
    // fallback: ищем через page по district/street — не надёжно, поэтому
    // в реальном проекте добавьте эндпоинт GET /api/legacy/edifices/{id}
    throw new Error(`Edifice ${id} не в кэше; добавьте эндпоинт GET /{id} на бэке`);
  }

  private remember(list: EdificeDto[]): void {
    const map = new Map(this.cache());
    for (const e of list) map.set(e.idEdifice, e);
    this.cache.set(map);
  }
}
