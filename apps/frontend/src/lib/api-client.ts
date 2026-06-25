/**
 * Універсальний клієнт для роботи з API OptiDrive.
 * Автоматично додає JWT токен до заголовків та обробляє помилки.
 */

class ApiClient {
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
    const response = await fetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
      headers: this.getHeaders((options.headers as Record<string, string>) || {}),
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
