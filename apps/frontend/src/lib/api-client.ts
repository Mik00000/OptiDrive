/**
 * Універсальний клієнт для роботи з API OptiDrive.
 * Автоматично додає JWT токен до заголовків та обробляє помилки.
 */

class ApiClient {
  private getHeaders(customHeaders: Record<string, string> = {}, skipContentType = false): Record<string, string> {
    const headers: Record<string, string> = {
      ...(skipContentType ? {} : { 'Content-Type': 'application/json' }),
      ...customHeaders,
    };

    // Отримуємо токен з localStorage (якщо ми на стороні клієнта)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('optidrive_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: unknown;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('optidrive_token');
        localStorage.removeItem('optidrive_user');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
      }

      // Якщо сервер повернув об'єкт помилки, використовуємо його повідомлення
      const errorMessage = data && typeof data === 'object' && 'error' in data && typeof (data as Record<string, unknown>).error === 'string'
        ? (data as Record<string, string>).error 
        : `Помилка запиту: ${response.status} ${response.statusText}`;
      
      const errorObj = new Error(errorMessage);
      (errorObj as any).data = data;
      throw errorObj;
    }

    return data as T;
  }

  public async get<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      ...options,
      headers: this.getHeaders((options.headers as Record<string, string>) || {}),
    });
    return this.handleResponse<T>(response);
  }

  public async post<T>(url: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const isFormData = body instanceof FormData;
    const response = await fetch(url, {
      method: 'POST',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      ...options,
      // Для FormData не виставляємо Content-Type — браузер сам додасть boundary
      headers: this.getHeaders((options.headers as Record<string, string>) || {}, isFormData),
    });
    return this.handleResponse<T>(response);
  }

  public async put<T>(url: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
      headers: this.getHeaders((options.headers as Record<string, string>) || {}),
    });
    return this.handleResponse<T>(response);
  }

  public async patch<T>(url: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
      headers: this.getHeaders((options.headers as Record<string, string>) || {}),
    });
    return this.handleResponse<T>(response);
  }

  public async delete<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      ...options,
      headers: this.getHeaders((options.headers as Record<string, string>) || {}),
    });
    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
