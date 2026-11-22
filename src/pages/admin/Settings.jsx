import { useCallback, useEffect, useState } from 'react';
import { Camera, Trash2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Select, Toast } from '../../components/ui';

const PREFS_KEY = 'csg_admin_settings_v1';

export default function Settings() {
  const { user, profile, role, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      return {
        theme: saved.theme || (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
        notifyExcuses: saved.notifyExcuses ?? true,
        notifyEvents: saved.notifyEvents ?? true,
        notifyAnnouncements: saved.notifyAnnouncements ?? true,
      };
    } catch {
      return {
        theme: 'light',
        notifyExcuses: true,
        notifyEvents: true,
        notifyAnnouncements: true,
      };
    }
  });

  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const syncFromDb = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      setFullName(data.full_name || '');
      setPosition(data.position || '');
      setDepartment(data.department || '');
      setAvatarUrl(data.avatar_url || '');
    }

    if (typeof refreshProfile === 'function') {
      await refreshProfile();
    }
  }, [user?.id, refreshProfile]);

  useEffect(() => {
    if (profile) {
      setFullName((prev) => prev || profile.full_name || '');
      setPosition((prev) => prev || profile.position || '');
      setDepartment((prev) => prev || profile.department || '');
      setAvatarUrl((prev) => prev || profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    syncFromDb();
  }, [syncFromDb]);

  const applyTheme = (themeValue) => {
    const isDark =
      themeValue === 'dark' ||
      (themeValue === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const updatePref = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      if (patch.theme) applyTheme(patch.theme);
      return next;
    });
    showToast('Preferences saved.');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be 2 MB or smaller.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { data: updatedRow, error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select('avatar_url')
        .single();

      if (dbError) throw dbError;
      if (!updatedRow?.avatar_url) {
        throw new Error('Profile row was not updated. Check RLS policy on profiles.');
      }

      setAvatarUrl(updatedRow.avatar_url);
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }
      showToast('Profile picture saved.');
    } catch (err) {
      showToast(err.message || 'Could not upload profile picture.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setAvatarUrl('');
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }
      showToast('Profile picture removed.');
    } catch (err) {
      showToast(err.message || 'Could not remove profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id || !fullName.trim()) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          position: position.trim() || null,
          department: department.trim() || null,
          avatar_url: avatarUrl || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }
      showToast('Profile updated.');
    } catch (err) {
      showToast(err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.');
    } catch (err) {
      showToast(err.message || 'Could not update password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card
        title="Profile Settings"
        subtitle="Customize your profile picture, display name, position, and department."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 border-b border-line pb-4 dark:border-slate-800">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-line bg-soft dark:border-slate-700 dark:bg-slate-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || 'Admin profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-mut dark:text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                  <Camera className="h-3.5 w-3.5" />
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>

                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-mut dark:text-slate-400">
                JPG, PNG, or WebP up to 2 MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Full Name"
              id="set-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email"
              id="set-email"
              value={user?.email || profile?.email || ''}
              disabled
            />
            <Input
              label="Position"
              id="set-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., System Administrator / Adviser"
            />
            <Input
              label="Department"
              id="set-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., CSG / BSIT"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-mut">
              Role:{' '}
              <strong className="uppercase text-ink dark:text-white">
                {role || profile?.role || 'admin'}
              </strong>
            </span>
            <Button type="submit" disabled={savingProfile || uploadingAvatar}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Change Password" subtitle="Set a new password for your account.">
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="New Password"
              id="set-pw1"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              id="set-pw2"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Card>

      <Card title="Notification &amp; Appearance Preferences">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold">Theme Mode</span>
            <div className="w-40">
              <Select
                id="set-theme"
                value={prefs.theme}
                onChange={(e) => updatePref({ theme: e.target.value })}
              >
                <option value="light">Light mode</option>
                <option value="dark">Dark mode</option>
                <option value="auto">System auto</option>
              </Select>
            </div>
          </div>

          <label className="flex items-center justify-between text-xs">
            <span>Excuse request alerts</span>
            <input
              type="checkbox"
              checked={prefs.notifyExcuses}
              onChange={(e) => updatePref({ notifyExcuses: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between text-xs">
            <span>Event schedule updates</span>
            <input
              type="checkbox"
              checked={prefs.notifyEvents}
              onChange={(e) => updatePref({ notifyEvents: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between text-xs">
            <span>Announcement publications</span>
            <input
              type="checkbox"
              checked={prefs.notifyAnnouncements}
              onChange={(e) => updatePref({ notifyAnnouncements: e.target.checked })}
            />
          </label>
        </div>
      </Card>

      <Toast message={toast} />
    </div>
  );
}