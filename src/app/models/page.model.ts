export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;      // текущая страница (0-based)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
  sort?: SortInfo;
  pageable?: PageableInfo;
}

export interface SortInfo {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface PageableInfo {
  pageNumber: number;
  pageSize: number;
  offset: number;
  paged: boolean;
  unpaged: boolean;
  sort?: SortInfo;
}

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string | string[];
}
