import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { EdificeStateDto } from '../models/edifice-state.dto';

@Injectable({ providedIn: 'root' })
export class EdificeStatusService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/edifices/status';

  getCurrent(): Observable<EdificeStateDto[]> {
    return this.http.get<EdificeStateDto[]>(`${this.url}/current`);
  }

  getAt(at: string): Observable<EdificeStateDto[]> {
    return this.http.get<EdificeStateDto[]>(`${this.url}/at`, { params: { at } });
  }
}
