'use client';

import { useState, useEffect, use, useCallback } from 'react';
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

  const fetchInfo = useCallback(async (pwd?: string) => {
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
  }, [slug]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

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
      <div className="flex h-screen flex-col overflow-hidden bg-[#070b13] text-text-light">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 md:px-12 bg-[#0c1222]/60 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.svg" alt="OptiDrive Logo" width={32} height={32} />
            <span className="font-headings font-bold text-lg text-text-light tracking-tight">OptiDrive</span>
          </div>
          <div className="text-sm text-text-muted">
            Shared from <span className="font-semibold text-text-light">{info.workspaceName}</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 items-center justify-center p-4 md:p-6 bg-[#03060c] relative overflow-hidden">
          {info.isFolder ? (
            /* Folder View Card */
            <div className="w-full max-w-2xl bg-[#0c1222]/85 border border-border/60 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col my-auto max-h-[70vh]">
              <div className="flex flex-col items-center justify-center py-10 px-6 border-b border-border/50 bg-slate-900/30 shrink-0">
                <div className="h-16 w-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-4">
                  <Icon icon="lucide:folder-open" width={36} />
                </div>
                <h2 className="text-xl font-bold text-text-light text-center truncate max-w-full">{info.name}</h2>
                <p className="text-xs text-text-muted mt-1.5 font-medium">Shared Folder • Download content as ZIP archive</p>
              </div>
              
              {info.children && (info.children.folders.length > 0 || info.children.files.length > 0) ? (
                <div className="flex flex-col px-6 md:px-8 py-6 overflow-y-auto custom-scrollbar flex-1">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 border-b border-border/40 pb-1.5">
                    Folder Contents ({info.children.folders.length + info.children.files.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {info.children.folders.map((f: any) => (
                      <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-bg/50 border border-border/30 hover:border-accent/40 transition-colors">
                        <Icon icon="lucide:folder" width={18} className="text-accent/80 shrink-0" />
                        <span className="text-sm font-medium text-text-light truncate">{f.name}</span>
                      </div>
                    ))}
                    {info.children.files.map((f: any) => (
                      <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-bg/50 border border-border/30 hover:border-accent/40 transition-colors">
                        <Icon icon="lucide:file" width={18} className="text-text-muted shrink-0" />
                        <span className="text-sm font-medium text-text-light truncate flex-1">{f.name}</span>
                        <span className="text-xs text-text-muted font-mono">{formatBytes(f.optimizedSize)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-text-muted flex-1 flex flex-col items-center justify-center">
                  <Icon icon="lucide:folder" className="opacity-30 mb-2" width={32} />
                  This folder is empty.
                </div>
              )}
            </div>
          ) : (
            /* Fullscreen Image Preview */
            <div className="w-full h-full flex items-center justify-center">
              {info.cdnUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={info.cdnUrl} 
                  alt={info.name} 
                  className="max-w-full max-h-full object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.85)] select-none transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-white/5 border border-border/40 text-text-muted/60 rounded-full flex items-center justify-center mb-4">
                    <Icon icon="lucide:file" width={32} />
                  </div>
                  <span className="text-lg font-medium text-text-light">{info.name}</span>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Gorgeous Bottom Bar */}
        <footer className="w-full border-t border-border/40 bg-[#0c1222]/85 backdrop-blur-lg px-6 md:px-12 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-3.5 w-full md:w-auto min-w-0">
            <div className="h-10 w-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent shrink-0">
              <Icon icon={info.isFolder ? "lucide:folder" : "lucide:image"} width={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm md:text-base font-semibold text-text-light truncate max-w-sm md:max-w-xl" title={info.name}>
                {info.name}
              </h2>
              {!info.isFolder && (
                <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted font-mono uppercase tracking-wider">
                  <span className="font-bold text-accent/80 bg-accent/5 px-1.5 py-0.5 border border-accent/15 rounded">
                    {info.format}
                  </span>
                  <span>•</span>
                  <span>{formatBytes(info.size)}</span>
                </div>
              )}
              {info.isFolder && (
                <span className="text-[11px] text-text-muted font-medium mt-1">
                  Folder containing {info.children?.folders.length + info.children?.files.length} item(s)
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Button 
              variant="accent" 
              onClick={handleDownload} 
              className="w-full md:w-auto justify-center h-11 px-8 text-sm font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-300"
            >
              <Icon icon="lucide:download" width={18} className="mr-2" />
              Download
            </Button>
          </div>
        </footer>
      </div>
    );
  }

  return null;
}
