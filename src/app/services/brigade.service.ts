import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { BrigadesResponseDto } from '../models/brigade.dto';

@Injectable({ providedIn: 'root' })
export class BrigadeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/brigades';

  /** Получить все бригады с сотрудниками и событиями. */
    list(): Observable<BrigadesResponseDto> {
    return this.http.get<BrigadesResponseDto>(this.apiUrl);
  }
}
