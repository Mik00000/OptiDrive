import { apiClient } from '@/lib/api-client';

export interface MediaFile {
  id: string;
  name: string;
  format: string;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  cdnUrl: string;
  workspaceId: string;
  createdAt: string;
}

export const getMediaFilesApi = async (): Promise<MediaFile[]> => {
  const response = await apiClient.get<{ data: MediaFile[] }>('/api/internal/media');
  return response.data;
};

export const deleteMediaFileApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/internal/media/${id}`);
};

export const updateMediaFileApi = async (id: string, name: string): Promise<void> => {
  const token = localStorage.getItem('optidrive_token');
  const response = await fetch(`/api/internal/media/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update file');
  }
};

export const uploadMediaFileApi = async (formData: FormData): Promise<any> => {
  const token = localStorage.getItem('optidrive_token');
  const response = await fetch('/api/internal/media/compress', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Upload failed: ${response.status}`);
  }

  return data;
};

export const downloadMediaFileClientApi = async (id: string, filename: string): Promise<void> => {
  const token = localStorage.getItem('optidrive_token');
  const response = await fetch(`/api/internal/media/download/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
};
