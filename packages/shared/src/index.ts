// Спільні типи, схеми та утиліти для OptiDrive
// Експортуй звідси всі публічні типи та схеми

// ---------------------------------------------------------------------------
// Зображення
// ---------------------------------------------------------------------------

/** Результат оптимізації зображення, який повертає API */
export interface OptimizedImage {
  id: string;
  originalName: string;
  optimizedUrl: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  /** Скільки байт вдалося заощадити */
  savedBytes: number;
  /** Відсоток стиснення (0–100) */
  compressionPercent: number;
  createdAt: string; // ISO 8601
}

/** Параметри запиту на оптимізацію */
export interface OptimizeImageRequest {
  quality?: number; // 1–100, за замовчуванням 80
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
}

// ---------------------------------------------------------------------------
// API-відповіді (загальний конверт)
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
