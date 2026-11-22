import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Select, Toast } from '../../components/ui';

const PREFS_KEY = 'csg_admin_settings_v1';

export default function Settings() {
  const { user, profile, role } = useAuth();

  const [fullName, setFullName] = useState('');
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

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile]);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id || !fullName.trim()) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
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
      <Card title="Profile Settings" subtitle="Update your display name and review account role.">
        <form onSubmit={handleSaveProfile} className="space-y-3">
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
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-mut">
              Role: <strong className="uppercase text-ink dark:text-white">{role || 'admin'}</strong>
            </span>
            <Button type="submit" disabled={savingProfile}>
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