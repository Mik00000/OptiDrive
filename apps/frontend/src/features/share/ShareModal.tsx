'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { createShareLinkApi, getShareLinksApi, deleteShareLinkApi, ShareLink } from './api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: 'file' | 'folder' | null;
  targetName: string;
}

export function ShareModal({ isOpen, onClose, targetId, targetType, targetName }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('7'); // Default 7 days
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && targetId && targetType) {
      loadLinks();
    } else {
      setLinks([]);
      setPassword('');
      setExpiresIn('7');
      setErrorMsg(null);
      setDeleteId(null);
    }
  }, [isOpen, targetId, targetType]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await getShareLinksApi(
        targetType === 'file' ? { fileId: targetId! } : { folderId: targetId! }
      );
      setLinks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setErrorMsg(null);
    try {
      const payload = {
        [targetType === 'file' ? 'fileId' : 'folderId']: targetId,
        ...(password ? { password } : {}),
        ...(expiresIn !== '0' ? { expiresInDays: expiresIn } : {})
      };
      await createShareLinkApi(payload);
      setPassword('');
      setExpiresIn('7');
      await loadLinks();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteShareLinkApi(deleteId);
      setLinks(links.filter(l => l.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete link');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share ${targetType === 'folder' ? 'Folder' : 'File'}`} icon="lucide:share-2">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-text-light">
          Create public links to share <strong className="font-semibold">{targetName}</strong> with anyone.
        </p>

        <div className="flex flex-col gap-4 border border-border bg-card p-4 rounded-xl">
          <h4 className="text-sm font-medium text-text-light flex items-center gap-2">
            <Icon icon="lucide:link-2" />
            Create New Link
          </h4>
          
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs text-text-muted">Password (Optional)</label>
              <Input 
                type="text" 
                placeholder="Leave blank for public access" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs text-text-muted">Expiration</label>
              <Input 
                variant="select" 
                value={expiresIn}
                onChange={(val) => setExpiresIn(val)}
                options={[
                  { label: "Never expire", value: "0" },
                  { label: "1 Day", value: "1" },
                  { label: "7 Days", value: "7" },
                  { label: "30 Days", value: "30" },
                ]}
              />
            </div>
          </div>
          
          {errorMsg && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-start gap-2">
              <Icon icon="lucide:alert-triangle" className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button variant="accent" onClick={handleCreate} disabled={creating} className="w-full justify-center">
            {creating ? <Icon icon="lucide:loader-2" className="animate-spin" /> : 'Generate Link'}
          </Button>
        </div>

        {loading ? (
          <div className="py-4 text-center text-text-muted"><Icon icon="lucide:loader-2" className="animate-spin mx-auto text-xl" /></div>
        ) : links.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-medium text-text-light">Active Links ({links.length})</h4>
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
              {links.map(link => (
                <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-bg border border-border rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono text-text-light">{window.location.host}/s/{link.slug}</span>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                      {link.password && <span className="flex items-center gap-1"><Icon icon="lucide:lock" width={12} /> Protected</span>}
                      {link.expiresAt && <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={12} /> Expires {new Date(link.expiresAt).toLocaleDateString()}</span>}
                      <span className="flex items-center gap-1"><Icon icon="lucide:download" width={12} /> {link.downloads}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="bordered" mobileBehavior="icon-only" onClick={() => handleCopy(link.slug)}>
                      {copiedSlug === link.slug ? (
                        <Icon icon="lucide:check" className="text-green-500" />
                      ) : (
                        <Icon icon="lucide:copy" />
                      )}
                    </Button>
                    <Button variant="ghost" className="text-error hover:bg-error/10" mobileBehavior="icon-only" onClick={() => setDeleteId(link.id)}>
                      <Icon icon="lucide:trash-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-text-muted border border-dashed border-border rounded-lg">
            No active share links.
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Revoke Link" icon="lucide:alert-triangle">
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            Are you sure you want to delete this share link? Anyone with this link will immediately lose access.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="bordered" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
