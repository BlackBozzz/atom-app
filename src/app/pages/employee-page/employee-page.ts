import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api'; // ✅ TreeNode отсюда
import { EmployeeService } from '../../services/employee.service';
import { PlannerService } from '../../services/planner.service';
import type { EmployeeDto } from '../../models/employee.dto';
import type { BrigadeDto } from '../../models/brigade.dto';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TreeTableModule,
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
  readonly calculating = signal(false);
  readonly loadingBrigades = signal(false);
  readonly employees = signal<EmployeeDto[]>([]);
  readonly brigades = signal<BrigadeDto[]>([]);
  readonly brigadeTree = signal<TreeNode[]>([]);

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

  /** Считаем общее количество событий без pipe — через computed. */
  readonly totalEventsCount = computed(() =>
    this.brigades().reduce((sum, b) => sum + (b.event_order?.length ?? 0), 0),
  );

  constructor(private plannerService: PlannerService) {}

  ngOnInit(): void {
    this.reload();
    this.loadBrigades();
  }

  runCalculation(): void {
    this.calculating.set(true);
    this.plannerService.calculatePlan().subscribe({
      next: (res) => {
        if (this.destroyRef.destroyed) return;
        const list = res?.brigades ?? [];
        this.brigades.set(list);
        this.brigadeTree.set(this.buildTree(list));
        this.calculating.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Расчёт завершён',
          detail: `Сформировано бригад: ${list.length}`,
        });
      },
      error: () => {
        if (this.destroyRef.destroyed) return;
        this.calculating.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось выполнить расчёт',
        });
      },
    });
  }

  loadBrigades(): void {
    this.loadingBrigades.set(true);
    this.plannerService.calculatePlan().subscribe({
      next: (res) => {
        if (this.destroyRef.destroyed) return;
        const list = res?.brigades ?? [];
        this.brigades.set(list);
        this.brigadeTree.set(this.buildTree(list));
        this.loadingBrigades.set(false);
      },
      error: () => {
        if (this.destroyRef.destroyed) return;
        this.loadingBrigades.set(false);
      },
    });
  }

  private buildTree(brigades: BrigadeDto[]): TreeNode[] {
    return brigades.map((b) => ({
      key: `brigade-${b.brigade_id}`,
      expanded: true,
      data: {
        kind: 'brigade',
        name: `Бригада №${b.brigade_id}`,
        resourceType: '—',
        edificeName: `${b.employees?.length ?? 0} чел.`,
        statusName: `${b.event_order?.length ?? 0} событий`,
        occurredAt: null,
        employeesCount: b.employees?.length ?? 0,
        eventsCount: b.event_order?.length ?? 0,
      },
      children: (b.event_order ?? []).map((ev, idx) => ({
        key: `event-${b.brigade_id}-${ev.idEvent}`,
        data: {
          kind: 'event',
          name: `№${idx + 1}`,
          resourceType: ev.resourceType,
          edificeName: ev.edificeName,
          statusName: ev.statusName,
          occurredAt: ev.occurredAt,
          idEvent: ev.idEvent,
        },
      })),
    }));
  }

  reload(): void {
    this.loading.set(true);
    this.service.list({ page: 0, size: 1000, sort: 'lastName,asc' }).subscribe({
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
    resourceType: string,
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

  statusSeverity(
    statusName: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const s = (statusName ?? '').toLowerCase();
    if (s.includes('закрыт') || s.includes('выполн')) return 'success';
    if (s.includes('в работе') || s.includes('актив')) return 'info';
    if (s.includes('ожид')) return 'warn';
    if (s.includes('отмен') || s.includes('ошибк')) return 'danger';
    return 'secondary';
  }

  formatDateTime(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
