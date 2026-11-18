import type { Edge } from 'ng-diagram';
import type { EdificeStateDto, StatusDto } from '../../models/edifice-state.dto';
import type { InfrastructureNodeData, ResourceKind, ResourceStatus } from '../../components/building-node/building-node.model';
import type { DistrictNodeData } from '../../components/district-node/district-node.model';
import type { FactorySeedNode } from './factory-layout';

export interface ResourceEdgeData {
  resourceType: ResourceKind;
  status: ResourceStatus | undefined;
}

export interface FactoryGraphData {
  nodes: FactorySeedNode[];
  edges: Edge<ResourceEdgeData>[];
}

export function toResourceStatus(status: StatusDto | null | undefined): ResourceStatus | undefined {
  if (!status) return undefined;
  // Названия берём из таблицы event_status; ID — резервный вариант для существующих данных.
  switch (status.name.trim().toLowerCase()) {
    case 'норма': case 'normal': return 'normal';
    case 'предупреждение': case 'warning': return 'warning';
    case 'авария': case 'emergency': return 'emergency';
    default: return undefined;
  }
}

function isResource(value: string): value is ResourceKind {
  return value === 'water' || value === 'electricity';
}

/** Перевод DTO в модель ng-diagram: районы, здания и направленные рёбра. */
export function mapEdificesToFactoryGraph(edifices: readonly EdificeStateDto[]): FactoryGraphData {
  const nodes: FactorySeedNode[] = [];
  const edges: Edge<ResourceEdgeData>[] = [];
  const buildingIds = new Set(edifices.map((edifice) => edifice.idEdifice));
  const districts = new Map<string, string>();
  const dependencyIds = new Set<number>();

  for (const edifice of edifices) {
    const districtName = edifice.district?.trim();
    if (districtName && !districts.has(districtName)) {
      // Имя не используем как ID, чтобы избежать конфликтов и спецсимволов.
      const districtId = `district-${districts.size + 1}`;
      districts.set(districtName, districtId);
      nodes.push({
        id: districtId,
        type: 'district',
        isGroup: true,
        data: { name: districtName, isCollapsed: false } satisfies DistrictNodeData,
      });
    }

    const statuses = new Map(
      (edifice.resources ?? [])
        .filter((resource) => isResource(resource.resourceType))
        .map((resource) => [resource.resourceType, toResourceStatus(resource.status)]),
    );

    // В шаблоне здания ДВЕ строки ресурсов всегда, даже без событий и связей.
    nodes.push({
      id: `edifice-${edifice.idEdifice}`,
      type: 'building',
      ...(districtName ? { groupId: districts.get(districtName) } : {}),
      data: {
        name: edifice.name,
        status: {
          water: statuses.get('water'),
          electricity: statuses.get('electricity'),
        },
      } satisfies InfrastructureNodeData,
    });
  }

  for (const edifice of edifices) {
    // Бэк включает одну связь в dependencies обоих зданий.
    // Отрисовываем её один раз по первичному ключу idDependence.
    for (const dependency of edifice.dependencies ?? []) {
      if (dependencyIds.has(dependency.idDependence)) continue;
      if (!isResource(dependency.resourceType)) continue;
      if (!buildingIds.has(dependency.sourceId) || !buildingIds.has(dependency.dependentId)) continue;
      dependencyIds.add(dependency.idDependence);
      const resourceType = dependency.resourceType;
      edges.push({
        id: `dependence-${dependency.idDependence}`,
        type: 'resource',
        source: `edifice-${dependency.sourceId}`,
        target: `edifice-${dependency.dependentId}`,
        sourcePort: `port-${resourceType}-out`,
        targetPort: `port-${resourceType}-in`,
        targetArrowhead: 'ng-diagram-arrow',
        routing: 'orthogonal',
        data: {
          resourceType,
          status: toResourceStatus(dependency.status),
        },
      });
    }
  }

  return { nodes, edges };
}
