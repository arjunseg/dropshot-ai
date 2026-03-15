export interface ApiError {
  detail: string | { message: string; upgrade_required?: boolean; [key: string]: unknown };
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PresignedUrlResponse {
  upload_url: string;
  s3_key: string;
  expires_in_seconds: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
