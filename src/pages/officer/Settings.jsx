import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Select, Toast } from '../../components/ui';

const OFFICER_PREFS_KEY = 'csg_officer_settings_v1';

const DEFAULT_PREFS = {
  notifications: true,
  excuseNotif: true,
  eventNotif: true,
  announcementNotif: true,
  paymentNotif: true,
  systemNotif: true,
  appearance: 'light',
  density: 'comfortable',
  timeFormat: '12',
};

export default function Settings() {
  const { user, profile, role, refreshProfile } = useAuth();

  const [liveProfile, setLiveProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [prefs, setPrefs] = useState(() => {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(OFFICER_PREFS_KEY) || '{}') };
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const activeProfile = liveProfile || profile;

  const fetchLatestProfile = useCallback(
    async (showFeedback = false) => {
      if (!user?.id) return;
      if (showFeedback) setSyncingProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setLiveProfile(data);
        }
        if (typeof refreshProfile === 'function') {
          await refreshProfile();
        }
        if (showFeedback) showToast('Profile synced.');
      } catch {
        if (showFeedback) showToast('Could not sync profile.');
      } finally {
        if (showFeedback) setSyncingProfile(false);
      }
    },
    [user?.id, refreshProfile]
  );

  useEffect(() => {
    fetchLatestProfile(false);
  }, [fetchLatestProfile]);

  useEffect(() => {
    setFullName(activeProfile?.full_name || '');
  }, [activeProfile]);

  const applyTheme = (mode) => {
    const isDark =
      mode === 'dark' ||
      (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const updatePref = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(OFFICER_PREFS_KEY, JSON.stringify(next));
      if (patch.appearance) applyTheme(patch.appearance);
      return next;
    });
    showToast('Settings updated.');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id || !fullName.trim()) return;
    setSavingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      if (data) setLiveProfile(data);
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }
      setEditingProfile(false);
      showToast('Profile saved.');
    } catch (err) {
      showToast(err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      const { data: updated } = await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          password_updated_at: nowIso,
        })
        .eq('id', user.id)
        .select('*')
        .single();

      if (updated) setLiveProfile(updated);
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.');
    } catch (err) {
      showToast(err.message || 'Could not update password.');
    } finally {
      setSavingPw(false);
    }
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    localStorage.setItem(OFFICER_PREFS_KEY, JSON.stringify(DEFAULT_PREFS));
    applyTheme(DEFAULT_PREFS.appearance);
    showToast('Settings reset to defaults.');
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card title="Account Settings" subtitle="View your assigned officer position and update your profile details">
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Name"
                id="off-name"
                value={fullName}
                disabled={!editingProfile}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Officer Full Name"
              />
              <Input
                label="Email"
                id="off-email"
                value={user?.email || activeProfile?.email || 'officer@csg.com'}
                disabled
              />
              <Input
                label="Position"
                id="off-position"
                value={activeProfile?.position || 'CSG Officer'}
                disabled
              />
              <Input
                label="Department / Course"
                id="off-department"
                value={activeProfile?.department || '—'}
                disabled
              />
            </div>
            <div className="mt-5 flex flex-col gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFullName(activeProfile?.full_name || '');
                  setEditingProfile((prev) => !prev);
                }}
              >
                {editingProfile ? 'Cancel' : 'Edit Profile'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={syncingProfile}
                onClick={() => fetchLatestProfile(true)}
              >
                {syncingProfile ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="rounded-full border border-line bg-soft px-3 py-0.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
              {role || activeProfile?.role || 'officer'}
            </span>
            {editingProfile && (
              <Button type="submit" size="sm" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Change Password" subtitle="Keep your account secure by updating your password regularly.">
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <Input
            label="New Password"
            id="off-pw1"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New Password"
          />
          <Input
            label="Confirm Password"
            id="off-pw2"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
          />
          <Button type="submit" size="sm" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </Card>

      <Card title="Application Settings" subtitle="Customize how the system works for you">
        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between font-semibold">
            <span>Notifications</span>
            <input
              type="checkbox"
              checked={prefs.notifications}
              onChange={(e) => updatePref({ notifications: e.target.checked })}
            />
          </label>

          {[
            { key: 'excuseNotif', label: 'Excuse requests' },
            { key: 'eventNotif', label: 'Events' },
            { key: 'announcementNotif', label: 'Announcements' },
            { key: 'paymentNotif', label: 'Payments' },
            { key: 'systemNotif', label: 'System updates' },
          ].map((sub) => (
            <label key={sub.key} className="flex items-center justify-between pl-4 text-mut">
              <span>{sub.label}</span>
              <input
                type="checkbox"
                checked={prefs[sub.key]}
                disabled={!prefs.notifications}
                onChange={(e) => updatePref({ [sub.key]: e.target.checked })}
              />
            </label>
          ))}

          <div className="flex items-center justify-between pt-1">
            <span>Appearance</span>
            <div className="w-40">
              <Select
                id="off-app"
                value={prefs.appearance}
                onChange={(e) => updatePref({ appearance: e.target.value })}
              >
                <option value="light">Light mode</option>
                <option value="dark">Dark mode</option>
                <option value="auto">Auto</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Interface density</span>
            <div className="w-40">
              <Select
                id="off-den"
                value={prefs.density}
                onChange={(e) => updatePref({ density: e.target.value })}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
                <option value="cozy">Cozy</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Time format</span>
            <div className="w-40">
              <Select
                id="off-time"
                value={prefs.timeFormat}
                onChange={(e) => updatePref({ timeFormat: e.target.value })}
              >
                <option value="12">12-hour</option>
                <option value="24">24-hour</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-3 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        </div>
      </Card>

      <Toast message={toast} />
    </div>
  );
}