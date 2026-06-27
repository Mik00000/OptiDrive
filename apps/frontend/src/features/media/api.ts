import { apiClient } from '@/lib/api-client';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

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
  folderId?: string | null;
  path?: string;
  tags?: Tag[];
}

export interface Folder {
  id: string;
  name: string;
  color?: string | null;
  parentId: string | null;
  workspaceId: string;
  createdAt: string;
  _count?: {
    files: number;
    children: number;
  };
  size?: number;
  originalSize?: number;
  optimizedSize?: number;
  path?: string;
  tags?: Tag[];
}

export interface MediaLibraryContent {
  files: MediaFile[];
  folders: Folder[];
}

export const getMediaFilesApi = async (folderId?: string | null, search?: string): Promise<MediaLibraryContent> => {
  let url = '/api/internal/media';
  const params = new URLSearchParams();
  if (folderId) params.append('folderId', folderId);
  if (search) params.append('search', search);
  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await apiClient.get<{ data: MediaLibraryContent }>(url);
  return response.data;
};

export const getFoldersApi = async (all?: boolean): Promise<Folder[]> => {
  const url = all ? '/api/internal/folders?all=true' : '/api/internal/folders';
  const response = await apiClient.get<{ data: Folder[] }>(url);
  return response.data;
};

export const createFolderApi = async (name: string, parentId?: string | null, color?: string | null): Promise<Folder> => {
  const response = await apiClient.post<{ data: Folder }>('/api/internal/folders', { name, parentId, color });
  return response.data;
};

export const renameFolderApi = async (id: string, name: string, color?: string | null): Promise<Folder> => {
  const response = await apiClient.patch<{ data: Folder }>(`/api/internal/folders/${id}`, { name, color });
  return response.data;
};

export const deleteFolderApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/internal/folders/${id}`);
};

export const moveItemsApi = async (folderIds: string[], fileIds: string[], targetFolderId: string | null): Promise<void> => {
  await apiClient.post('/api/internal/folders/move', { folderIds, fileIds, targetFolderId });
};

export const getFolderNavigationPathApi = async (id: string): Promise<{ id: string; name: string }[]> => {
  const response = await apiClient.get<{ data: { id: string; name: string }[] }>(`/api/internal/folders/${id}/path`);
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

export const downloadFolderClientApi = async (id: string, name: string): Promise<void> => {
  const token = localStorage.getItem('optidrive_token');
  const response = await fetch(`/api/internal/folders/${id}/download`, {
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
  link.download = `${name}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
};
