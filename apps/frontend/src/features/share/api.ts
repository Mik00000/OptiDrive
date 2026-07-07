export interface ShareLink {
  id: string;
  slug: string;
  isFolder: boolean;
  fileId: string | null;
  folderId: string | null;
  password?: string | null;
  expiresAt: string | null;
  downloads: number;
  createdAt: string;
}

export const createShareLinkApi = async (data: { fileId?: string; folderId?: string; password?: string; expiresInDays?: string; transformationParams?: string }) => {
  const token = localStorage.getItem('optidrive_token');
  const response = await fetch('/api/internal/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create share link');
  }

  const result = await response.json();
  return result.data as ShareLink;
};

export const getShareLinksApi = async (params: { fileId?: string; folderId?: string }) => {
  const token = localStorage.getItem('optidrive_token');
  const url = new URL(window.location.origin + '/api/internal/share');
  if (params.fileId) url.searchParams.append('fileId', params.fileId);
  if (params.folderId) url.searchParams.append('folderId', params.folderId);

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch share links');
  }

  const result = await response.json();
  return result.data as ShareLink[];
};

export const deleteShareLinkApi = async (id: string) => {
  const token = localStorage.getItem('optidrive_token');
  const response = await fetch(`/api/internal/share/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete share link');
  }

  return response.json();
};

export const getPublicShareInfoApi = async (slug: string, password?: string) => {
  const response = await fetch(`/api/public/share/${slug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw { status: response.status, ...error };
  }

  const result = await response.json();
  return result.data;
};
