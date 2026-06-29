'use client';

import { useState, useEffect, use } from 'react';
import { Icon } from '@iconify/react';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import { getPublicShareInfoApi } from '@/features/share/api';
import Image from 'next/image';

export default function SharedLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);
  
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    fetchInfo();
  }, [slug]);

  const fetchInfo = async (pwd?: string) => {
    setLoading(true);
    setError(null);
    setPwdError('');
    try {
      const data = await getPublicShareInfoApi(slug, pwd);
      setInfo(data);
      setRequirePassword(false);
    } catch (err: any) {
      if (err.status === 401 && err.requirePassword) {
        setRequirePassword(true);
      } else if (err.status === 403) {
        setPwdError('Incorrect password');
      } else {
        setError(err.error || 'Failed to load link');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      fetchInfo(password);
    }
  };

  const handleDownload = () => {
    let url = `/api/public/share/${slug}/download`;
    if (password) {
      url += `?password=${encodeURIComponent(password)}`;
    }
    
    // Create an invisible anchor tag to trigger download without fetching via JS
    const link = document.createElement('a');
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20">
            <Icon icon="lucide:alert-triangle" width={32} />
          </div>
          <h1 className="text-xl font-bold text-text-light">Link Unavailable</h1>
          <p className="text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (requirePassword) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4">
        <form onSubmit={handlePasswordSubmit} className="flex w-full max-w-sm flex-col gap-6 bg-card border border-border p-8 rounded-2xl shadow-xl">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-2">
              <Icon icon="lucide:lock" width={24} />
            </div>
            <h1 className="text-xl font-bold text-text-light">Protected Link</h1>
            <p className="text-sm text-text-muted">Enter the password to access this shared content.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              autoFocus 
              className="w-full text-center"
            />
            {pwdError && <span className="text-xs text-red-500 text-center">{pwdError}</span>}
          </div>
          
          <Button variant="accent" type="submit" className="w-full justify-center">
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  if (info) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="flex h-16 items-center justify-between border-b border-border px-6 md:px-12 bg-card/50">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.svg" alt="OptiDrive Logo" width={32} height={32} />
            <span className="font-headings font-bold text-lg text-text-light tracking-tight">OptiDrive</span>
          </div>
          <div className="text-sm text-text-muted">
            Shared from <span className="font-semibold text-text-light">{info.workspaceName}</span>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center p-6 py-12">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            {/* Preview Section */}
            {info.isFolder ? (
              <div className="flex flex-col border-b border-border bg-slate-900/40">
                <div className="flex flex-col items-center justify-center py-12">
                  <Icon icon="lucide:folder-open" width={64} className="text-accent/80 mb-4" />
                  <h2 className="text-2xl font-bold text-text-light">{info.name}</h2>
                  <p className="text-text-muted mt-2">Shared Folder (Download as ZIP)</p>
                </div>
                
                {info.children && (info.children.folders.length > 0 || info.children.files.length > 0) && (
                  <div className="flex flex-col px-6 md:px-8 pb-8">
                    <h3 className="text-sm font-semibold text-text-light uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
                      Folder Contents ({info.children.folders.length + info.children.files.length})
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {info.children.folders.map((f: any) => (
                        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg border border-border/50">
                          <Icon icon="lucide:folder" width={20} className="text-accent/70 shrink-0" />
                          <span className="text-sm font-medium text-text-light truncate">{f.name}</span>
                        </div>
                      ))}
                      {info.children.files.map((f: any) => (
                        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg border border-border/50">
                          <Icon icon="lucide:file" width={20} className="text-text-muted shrink-0" />
                          <span className="text-sm font-medium text-text-light truncate flex-1">{f.name}</span>
                          <span className="text-xs text-text-muted font-mono">{formatBytes(f.optimizedSize)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-950/80 border-b border-border">
                {info.cdnUrl ? (
                  <div className="w-full h-[400px] flex items-center justify-center p-4">
                    <img 
                      src={info.cdnUrl} 
                      alt={info.name} 
                      className="max-w-full max-h-full object-contain rounded-lg drop-shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <Icon icon="lucide:file" width={64} className="text-text-muted/50 mb-4" />
                    <span className="text-lg font-medium text-text-light">{info.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Info and Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8">
              <div className="flex flex-col w-full min-w-0 text-center md:text-left">
                <h2 className="text-xl font-semibold text-text-light truncate" title={info.name}>{info.name}</h2>
                {!info.isFolder && (
                  <div className="flex items-center justify-center md:justify-start gap-3 mt-2 text-sm text-text-muted font-mono">
                    <span className="uppercase font-bold tracking-wider">{info.format}</span>
                    <span>•</span>
                    <span>{formatBytes(info.size)}</span>
                  </div>
                )}
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Button variant="accent" onClick={handleDownload} className="w-full md:w-auto justify-center h-12 px-8 text-base shadow-lg shadow-accent/20">
                  <Icon icon="lucide:download" width={20} className="mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
