import { Component, computed, input } from '@angular/core';
import {
  NgDiagramGroupHighlightedDirective,
  NgDiagramGroupNodeTemplate,
  NgDiagramModelService,
  NgDiagramNodeResizeAdornmentComponent,
  NgDiagramNodeSelectedDirective, NgDiagramPortComponent,
} from 'ng-diagram';
import { DistrictNodeData } from './district-node.model';

// Вспомогательный тип, чтобы TypeScript не ругался на кастомные поля в data ребра
type EdgeDataWithHistory = Record<string, any> & {
  originalSource?: string;
  originalTarget?: string;
};

@Component({
  selector: 'app-district-node',
  templateUrl: './district-node.html',
  styleUrl: './district-node.scss',
  standalone: true,
  imports: [
    NgDiagramNodeResizeAdornmentComponent,
    NgDiagramGroupHighlightedDirective,
    NgDiagramNodeSelectedDirective,
    NgDiagramPortComponent,
  ],
  host: {
    '[class.is-highlighted]': 'isHighlighted()',
  },
})
export class DistrictNode implements NgDiagramGroupNodeTemplate<DistrictNodeData> {
  node = input.required<any>();
  nodeData = computed(() => this.node().data as DistrictNodeData);
  isHighlighted = computed(() => Boolean(this.nodeData().isHighlighted));
  isCollapsed = computed(() => Boolean(this.nodeData().isCollapsed));

  constructor(private modelService: NgDiagramModelService) {}

  async toggleCollapse(event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Предотвращаем начало перетаскивания при клике

    const currentNode = this.node();
    const data = this.nodeData();
    const nextCollapsed = !this.isCollapsed();

    const currentSize = currentNode.size ?? { width: 680, height: 390 };
    const expandedSize = data.expandedSize ?? currentSize;

    const allNodes = this.modelService.nodes();
    const childIds = new Set(allNodes.filter((n) => n.groupId === currentNode.id).map((n) => n.id));

    const allEdges = this.modelService.edges();

    if (nextCollapsed) {
      // 1. Скрываем дочерние узлы
      if (childIds.size > 0) {
        await this.modelService.updateNodes(
          Array.from(childIds).map((id) => ({ id, hidden: true })),
        );
      }

      // 2. Перенаправляем внешние связи на группу
      const edgesToUpdate = allEdges
        .filter((edge) => {
          const isSourceChild = childIds.has(edge.source);
          const isTargetChild = childIds.has(edge.target);
          // Нас интересуют только связи, где один конец внутри, а другой снаружи
          return (isSourceChild || isTargetChild) && !(isSourceChild && isTargetChild);
        })
        .map((edge) => {
          const isSourceChild = childIds.has(edge.source);
          const edgeData = edge.data as EdgeDataWithHistory;

          return {
            id: edge.id,
            source: isSourceChild ? currentNode.id : edge.source,
            target: !isSourceChild ? currentNode.id : edge.target,
            // Порт не меняем! Он совпадет с портом группы
            data: {
              ...edgeData,
              originalSource: isSourceChild ? edge.source : edgeData.originalSource,
              originalTarget: !isSourceChild ? edge.target : edgeData.originalTarget,
            },
          };
        });

      if (edgesToUpdate.length > 0) {
        await this.modelService.updateEdges(edgesToUpdate);
      }
    } else {
      // 3. Разворачивание: восстанавливаем оригинальные связи
      const edgesToRestore = allEdges
        .filter((edge) => {
          const edgeData = edge.data as EdgeDataWithHistory;
          return edgeData.originalSource || edgeData.originalTarget;
        })
        .map((edge) => {
          const edgeData = edge.data as EdgeDataWithHistory;
          return {
            id: edge.id,
            source: edgeData.originalSource || edge.source,
            target: edgeData.originalTarget || edge.target,
            data: {
              ...edgeData,
              originalSource: undefined,
              originalTarget: undefined,
            },
          };
        });

      if (edgesToRestore.length > 0) {
        await this.modelService.updateEdges(edgesToRestore);
      }

      // 4. Показываем дочерние узлы
      if (childIds.size > 0) {
        await this.modelService.updateNodes(
          Array.from(childIds).map((id) => ({ id, hidden: false })),
        );
      }
    }

    // 5. Обновляем размер и состояние самой группы
    await this.modelService.updateNode(currentNode.id, {
      size: nextCollapsed ? { width: 280, height: 44 } : expandedSize,
      data: {
        ...data,
        isCollapsed: nextCollapsed,
        expandedSize,
      },
    });
  }
}
