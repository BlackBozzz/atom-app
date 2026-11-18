import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService, MessageService } from 'primeng/api';

import { EmployeeService } from '../../services/employee.service';
import type { EmployeeDto } from '../../models/employee.dto';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TabsModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './employee-page.html',
  styleUrl: './employee-page.scss',
})
export class EmployeesPage implements OnInit {
  private readonly service = inject(EmployeeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly loading = signal(false);
  readonly employees = signal<EmployeeDto[]>([]);

  // ✅ Исправлено: тип теперь включает undefined
  readonly activeTab = signal<string | number | undefined>(0);

  readonly filterTabel = signal('');
  readonly filterLastName = signal('');
  readonly filterFirstName = signal('');
  readonly filterMiddleName = signal('');

  readonly filteredEmployees = computed(() => {
    const t = this.filterTabel().trim().toLowerCase();
    const ln = this.filterLastName().trim().toLowerCase();
    const fn = this.filterFirstName().trim().toLowerCase();
    const mn = this.filterMiddleName().trim().toLowerCase();

    return this.employees().filter((e) => {
      if (t && !String(e.tabel).toLowerCase().includes(t)) return false;
      if (ln && !e.lastName.toLowerCase().includes(ln)) return false;
      if (fn && !e.firstName.toLowerCase().includes(fn)) return false;
      if (mn && !(e.middleName ?? '').toLowerCase().includes(mn)) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.service
      .list({ page: 0, size: 1000, sort: 'lastName,asc' })
      .subscribe({
        next: (page) => {
          if (this.destroyRef.destroyed) return;
          this.employees.set(page.content);
          this.loading.set(false);
        },
        error: () => {
          if (this.destroyRef.destroyed) return;
          this.loading.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: 'Не удалось загрузить рабочих',
          });
        },
      });
  }

  clearAll(): void {
    this.confirm.confirm({
      header: 'Очистка данных',
      message:
        'Удалить всех сотрудников и их квалификации из локальной БД? Курсоры синхронизации будут сброшены.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Очистить',
      rejectLabel: 'Отмена',
      accept: () => {
        this.loading.set(true);
        this.service.clearAll().subscribe({
          next: () => {
            if (this.destroyRef.destroyed) return;
            this.employees.set([]);
            this.loading.set(false);
            this.messages.add({
              severity: 'success',
              summary: 'Готово',
              detail: 'Данные по сотрудникам очищены',
            });
          },
          error: () => {
            if (this.destroyRef.destroyed) return;
            this.loading.set(false);
            this.messages.add({
              severity: 'error',
              summary: 'Ошибка',
              detail: 'Не удалось очистить данные',
            });
          },
        });
      },
    });
  }

  resetFilters(): void {
    this.filterTabel.set('');
    this.filterLastName.set('');
    this.filterFirstName.set('');
    this.filterMiddleName.set('');
  }

  resourceSeverity(
    resourceType: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (resourceType) {
      case 'water':
        return 'info';
      case 'electricity':
        return 'warn';
      default:
        return 'success';
    }
  }
}
