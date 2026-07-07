export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount?: number;
}

export interface Paginated<T> {
  data: T[];
  pageInfo: PageInfo;
}
