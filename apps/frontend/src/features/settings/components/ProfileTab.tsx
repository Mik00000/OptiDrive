"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { Icon } from '@iconify/react';
import { ConfirmModal } from './ConfirmModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { UserAvatar } from '@/components/UserAvatar';
import { 
  updateUserProfileApi, 
  confirmEmailChangeApi,
  uploadAvatarApi, 
  deleteAvatarApi, 
  deleteUserAccountApi 
} from '../api';

export const ProfileTab = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user, login, logout } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Email verification state
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isEmailVerifyModalOpen, setIsEmailVerifyModalOpen] = useState(false);
  
  const [isRemovePictureModalOpen, setIsRemovePictureModalOpen] = useState(false);
  const [isSaveChangesModalOpen, setIsSaveChangesModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUploadPictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    e.target.value = '';
    
    try {
      showFeedback('Uploading avatar...', 'info');
      const data = await uploadAvatarApi(file);
      const token = localStorage.getItem('optidrive_token') || '';
      login(token, { ...user, avatarUrl: data.avatarUrl } as any, true);
      showFeedback('Avatar updated successfully');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to upload avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await deleteAvatarApi();
      const token = localStorage.getItem('optidrive_token') || '';
      login(token, { ...user, avatarUrl: null } as any, true);
      setIsRemovePictureModalOpen(false);
      showFeedback('Avatar removed');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to remove avatar');
      setIsRemovePictureModalOpen(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Name and Email are required.');
      setIsSaveChangesModalOpen(false);
      return;
    }
    
    try {
      setIsSaving(true);
      setErrorMessage('');
      const result = await updateUserProfileApi(name.trim(), email.trim());
      
      if (result.requiresEmailVerification && result.pendingEmail) {
        // Email змінено — потрібна верифікація
        setPendingEmail(result.pendingEmail);
        setEmailVerifyCode('');
        setIsEmailVerifyModalOpen(true);
        setIsSaveChangesModalOpen(false);
        showFeedback(`Verification code sent to ${result.pendingEmail}`, 'info');
        // Оновлюємо ім'я в контексті одразу (email ще не підтверджений)
        const token = localStorage.getItem('optidrive_token') || '';
        login(token, { ...user, name: name.trim() } as any, true);
      } else if (result.data) {
        // Тільки ім'я змінилось
        const token = localStorage.getItem('optidrive_token') || '';
        login(token, { ...user, name: result.data.name || '', email: result.data.email } as any, true);
        setIsSaveChangesModalOpen(false);
        showFeedback('Profile saved successfully');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to save changes');
      setIsSaveChangesModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!emailVerifyCode.trim()) return;
    try {
      setIsVerifyingEmail(true);
      const result = await confirmEmailChangeApi(emailVerifyCode.trim());
      const token = localStorage.getItem('optidrive_token') || '';
      login(token, { ...user, email: result.data.email } as any, true);
      setIsEmailVerifyModalOpen(false);
      setPendingEmail(null);
      setEmailVerifyCode('');
      showFeedback('Email updated successfully! ✓');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.message || 'Invalid verification code');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteUserAccountApi();
      setIsDeleteAccountModalOpen(false);
      logout();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to delete account');
      setIsDeleteAccountModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasChanges = name.trim() !== (user?.name || '') || email.trim() !== (user?.email || '');

  return (
    <div className="flex max-w-4xl flex-col gap-6 pb-8 lg:gap-8 relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleAvatarChange}
      />
      
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Profile Information
          </span>
          <p className="text-text-muted mt-1 text-sm">
            Update your personal details and account settings.
          </p>
        </div>

        {/* Avatar Section */}
        <div className="border-border border-b p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="relative flex shrink-0 items-center justify-center">
              <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size={80} />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="bordered"
                  className="w-full justify-center sm:w-auto"
                  onClick={handleUploadPictureClick}
                >
                  <Icon icon="lucide:upload" width={14} height={14} className="mr-2" />
                  Upload new picture
                </Button>
                {user?.avatarUrl && (
                  <Button
                    variant="ghost"
                    className="text-text-muted hover:text-text-light/90 w-full justify-center sm:w-auto"
                    onClick={() => setIsRemovePictureModalOpen(true)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <span className="text-text-muted text-center text-xs sm:text-left">
                Recommended size: 256×256px. Max 2MB. JPG, PNG, WebP.
              </span>
            </div>
          </div>
        </div>

        {/* Inputs Section */}
        <div className="border-border flex flex-col gap-5 border-b p-4 sm:p-6">
          <div className="flex w-full flex-col gap-5 sm:flex-row sm:gap-6">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="name" className="fz-13 fw-500 text-text-light">
                Full Name
              </label>
              <Input
                variant="text"
                name="name"
                id="name"
                className="rounded-lg"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="email" className="fz-13 fw-500 text-text-light">
                Email Address
              </label>
              <div className="relative">
                <Input
                  variant="text"
                  name="email"
                  id="email"
                  className="rounded-lg"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {email !== user?.email && email.includes('@') && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-400">
                    <Icon icon="lucide:mail-check" width={14} />
                    <span className="text-xs">Requires verification</span>
                  </div>
                )}
              </div>
              {pendingEmail && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <Icon icon="lucide:clock" width={12} />
                  Pending confirmation: <strong>{pendingEmail}</strong>
                  <button
                    className="ml-1 underline hover:text-amber-300"
                    onClick={() => { setIsEmailVerifyModalOpen(true); }}
                  >
                    Enter code
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6">
          <Button 
            variant="accent" 
            className="w-full justify-center sm:w-auto" 
            onClick={() => setIsSaveChangesModalOpen(true)}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-error/30 bg-error/5 flex flex-col overflow-hidden rounded-2xl border">
        <div className="flex items-center gap-2 p-4 pb-2 sm:p-6 sm:pb-4">
          <Icon
            icon="lucide:triangle-alert"
            className="text-error shrink-0"
            width="18"
            height="18"
          />
          <span className="text-error text-lg font-semibold">
            Security &amp; Danger Zone
          </span>
        </div>
        
        <div className="flex flex-col">
          {user?.hasPassword && (
            <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="text-text-light text-base font-medium">
                  Change Password
                </span>
                <p className="text-text-muted text-sm">
                  Update your password to keep your account secure.
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full shrink-0 justify-center sm:w-auto"
                onClick={() => setIsChangePasswordModalOpen(true)}
              >
                Change Password
              </Button>
            </div>
          )}

          <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="text-text-light text-base font-medium">
                Delete Account
              </span>
              <p className="text-text-muted text-sm">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full shrink-0 justify-center sm:w-auto"
              onClick={() => setIsDeleteAccountModalOpen(true)}
            >
              <Icon
                icon="lucide:trash-2"
                width="16"
                height="16"
                className="mr-2"
              />
              Delete Account
            </Button>
          </div>
        </div>
      </div>
      
      {/* Email Verification Modal */}
<Modal
        isOpen={isEmailVerifyModalOpen}
        onClose={() => setIsEmailVerifyModalOpen(false)}
        title="Verify New Email"
        icon="lucide:mail-check"
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-300 flex items-start gap-3">
            <Icon icon="lucide:info" width={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-0.5">Confirmation required</p>
              <p className="text-amber-400/80">
                We sent a 6-digit code to <strong className="text-amber-300">{pendingEmail}</strong>.
                Enter it below to complete the email change.
              </p>
            </div>
          </div>

          {/* НОВИЙ БЛОК ВВЕДЕННЯ КОДУ */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Verification Code
            </label>
            <div 
              className="flex justify-between gap-2"
              onPaste={(e) => {
                // Обробка вставки тексту (Ctrl+V / Cmd+V)
                e.preventDefault();
                const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                if (pasted) setEmailVerifyCode(pasted);
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={emailVerifyCode[index] || ''}
                  placeholder="-"
                  className="w-full h-14 text-center text-xl font-mono font-semibold rounded-lg bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-600"
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val) return;
                    
                    // Оновлюємо конкретну цифру
                    const newCode = emailVerifyCode.split('');
                    newCode[index] = val.slice(-1);
                    setEmailVerifyCode(newCode.join(''));

                    // Автофокус на наступний інпут
                    if (index < 5) {
                      const next = e.target.nextElementSibling;
                      if (next) next.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace') {
                      e.preventDefault();
                      const newCode = emailVerifyCode.split('');
                      newCode[index] = '';
                      setEmailVerifyCode(newCode.join(''));

                      // Автофокус на попередній інпут при стиранні
                      if (index > 0) {
                        const prev = e.target.previousElementSibling;
                        if (prev) prev.focus();
                      }
                    } else if (e.key === 'Enter' && emailVerifyCode.length === 6) {
                      handleConfirmEmailChange();
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="text-error text-sm flex items-center gap-1">
              <Icon icon="lucide:alert-circle" width={14} />
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button 
              variant="bordered" 
              onClick={() => { setIsEmailVerifyModalOpen(false); setErrorMessage(''); }}
              disabled={isVerifyingEmail}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleConfirmEmailChange}
              disabled={emailVerifyCode.length !== 6 || isVerifyingEmail}
            >
              {isVerifyingEmail ? (
                <><Icon icon="lucide:loader-2" className="animate-spin mr-2" width={16} />Verifying...</>
              ) : 'Confirm Email Change'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <ConfirmModal
        isOpen={isRemovePictureModalOpen}
        onClose={() => setIsRemovePictureModalOpen(false)}
        onConfirm={handleRemoveAvatar}
        title="Remove Profile Picture"
        description="Are you sure you want to remove your profile picture? It will be replaced with a default avatar."
        confirmText="Remove"
        variant="danger"
        icon="lucide:trash-2"
      />
      
      <ConfirmModal
        isOpen={isSaveChangesModalOpen}
        onClose={() => setIsSaveChangesModalOpen(false)}
        onConfirm={handleSaveChanges}
        title="Save Changes"
        description={
          email.trim() !== (user?.email || '')
            ? `Saving will send a verification code to "${email.trim()}". Your current email remains active until verified.`
            : "Are you sure you want to save the new profile settings?"
        }
        confirmText={isSaving ? "Saving..." : "Save"}
        variant="accent"
        icon="lucide:save"
      />
      
      <ConfirmModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone. All your data and files will be permanently deleted."
        confirmText={isDeleting ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        icon="lucide:triangle-alert"
        requiredInputText="DELETE ACCOUNT"
      />
      
      <ConfirmModal
        isOpen={!!errorMessage && !isEmailVerifyModalOpen}
        onClose={() => setErrorMessage('')}
        onConfirm={() => setErrorMessage('')}
        title="Error"
        description={errorMessage}
        confirmText="OK"
        cancelText=""
        variant="danger"
        icon="lucide:alert-circle"
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : feedback.type === 'info' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={feedback.type === 'success' ? 'lucide:check-circle' : feedback.type === 'info' ? 'lucide:info' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
