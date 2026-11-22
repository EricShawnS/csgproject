import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Pencil,
  KeyRound,
  Trash2,
  Search,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/ActivityLogService';
import { Badge, Button, Card, Input, Modal, Toast } from '../../components/ui';

const EMPTY_CREATE_FORM = {
  email: '',
  password: '',
  full_name: '',
  position: '',
  department: '',
  require_password_change: true,
};

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ManageOfficers() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [officers, setOfficers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Create New Profile Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [showCreatePass, setShowCreatePass] = useState(false);

  // Edit Officer Profile Modal
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    position: '',
    department: '',
    must_change_password: false,
  });

  // Change Password Modal (Direct New Password + Confirm)
  const [passTarget, setPassTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forceResetOnLogin, setForceResetOnLogin] = useState(true);
  const [showNewPass, setShowNewPass] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadOfficers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'officer')
        .order('full_name', { ascending: true });

      if (fetchErr) throw fetchErr;
      setOfficers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load CSG officer profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const invokeOfficerFunction = async (payload) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Your session has expired. Please sign out and sign in again.');
    }

    const { data, error: fnError } = await supabase.functions.invoke('manage-csg-officers', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (fnError) {
      let detail = fnError.message;
      try {
        if (fnError.context && typeof fnError.context.json === 'function') {
          const errBody = await fnError.context.json();
          if (errBody?.error) detail = errBody.error;
        }
      } catch {
        // Keep default fnError.message if response body is not JSON
      }
      throw new Error(detail);
    }

    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleOpenCreate = () => {
    setCreateForm({
      ...EMPTY_CREATE_FORM,
      password: generateTempPassword(12),
    });
    setShowCreatePass(true);
    setCreateOpen(true);
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!createForm.email.trim() || createForm.password.length < 6) {
      showToast('Provide a valid email and a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await invokeOfficerFunction({
        action: 'create_officer',
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        full_name: createForm.full_name.trim(),
        position: createForm.position.trim(),
        department: createForm.department.trim(),
        require_password_change: createForm.require_password_change,
      });

      await logActivity({
        actor,
        action: 'Created Officer Account',
        module: 'Manage Officers',
        description: `Created CSG officer profile for ${createForm.email.trim()}`,
      });

      showToast('CSG Officer account created.');
      setCreateOpen(false);
      await loadOfficers();
    } catch (err) {
      showToast(err.message || 'Failed to create CSG officer account.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditOfficer = (officer) => {
    setEditTarget(officer);
    setEditForm({
      full_name: officer.full_name || '',
      position: officer.position || '',
      department: officer.department || '',
      must_change_password: Boolean(officer.must_change_password),
    });
  };

  const handleSaveEditOfficer = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    setSubmitting(true);
    try {
      await invokeOfficerFunction({
        action: 'update_officer',
        user_id: editTarget.id,
        full_name: editForm.full_name.trim(),
        position: editForm.position.trim(),
        department: editForm.department.trim(),
        must_change_password: Boolean(editForm.must_change_password),
      });

      await logActivity({
        actor,
        action: 'Updated Officer Profile',
        module: 'Manage Officers',
        description: `Updated details for ${editTarget.email || editTarget.full_name || editTarget.id} (${editForm.position.trim() || 'CSG Officer'}, ${editForm.department.trim() || 'No Dept'})`,
      });

      showToast('Officer profile updated.');
      setEditTarget(null);
      await loadOfficers();
    } catch (err) {
      showToast(err.message || 'Failed to update officer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const openChangePassword = (officer) => {
    setPassTarget(officer);
    setNewPassword('');
    setConfirmPassword('');
    setForceResetOnLogin(true);
    setShowNewPass(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passTarget) return;
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await invokeOfficerFunction({
        action: 'change_password',
        user_id: passTarget.id,
        new_password: newPassword,
        require_password_change: forceResetOnLogin,
      });

      await logActivity({
        actor,
        action: 'Changed Officer Password',
        module: 'Manage Officers',
        description: `Updated password for officer ${passTarget.email || passTarget.full_name || passTarget.id}`,
      });

      showToast(`Password updated for ${passTarget.full_name || passTarget.email || 'officer'}.`);
      setPassTarget(null);
      await loadOfficers();
    } catch (err) {
      showToast(err.message || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await invokeOfficerFunction({
        action: 'delete_officer',
        user_id: deleteTarget.id,
      });

      await logActivity({
        actor,
        action: 'Deleted Officer Account',
        module: 'Manage Officers',
        description: `Deleted CSG officer profile ${deleteTarget.email || deleteTarget.full_name || deleteTarget.id}`,
      });

      showToast('Officer profile deleted.');
      setDeleteTarget(null);
      await loadOfficers();
    } catch (err) {
      showToast(err.message || 'Failed to delete officer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOfficers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return officers;
    return officers.filter((o) =>
      [o.full_name, o.email, o.position, o.department]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [officers, search]);

  const pendingResetCount = useMemo(
    () => officers.filter((o) => Boolean(o.must_change_password)).length,
    [officers]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink dark:text-white">Manage Officers</h1>
            <p className="text-xs text-mut dark:text-slate-400">
              Accounts with the <span className="font-semibold text-indigo-400">officer</span> role in{' '}
              <code className="text-[11px]">profiles</code>.
            </p>
          </div>
        </div>

        <Button onClick={handleOpenCreate}>
          <UserPlus className="h-4 w-4" />
          Create New Profile
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-mut dark:text-slate-400">Total CSG Officers</p>
          <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{officers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-mut dark:text-slate-400">
            Pending Password Change
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{pendingResetCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-mut dark:text-slate-400">Role Scope</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            CSG Officers Only (role = officer)
          </p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search officer name, email, or position..."
            className="w-full rounded-xl border border-line bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder:text-mut focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={loadOfficers} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {/* Officers Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-sm text-mut">Loading CSG officer accounts...</p>
        ) : filteredOfficers.length === 0 ? (
          <p className="p-6 text-center text-sm text-mut">
            No CSG officer profiles found matching your filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-soft/60 text-[11px] uppercase tracking-wider text-mut dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Position / Dept</th>
                  <th className="px-4 py-3">Password Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 dark:divide-slate-800">
                {filteredOfficers.map((officer) => (
                  <tr
                    key={officer.id}
                    className="hover:bg-soft/40 dark:hover:bg-slate-800/35"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink dark:text-white">
                        {officer.full_name || 'Unnamed Officer'}
                      </p>
                      <p className="text-[11px] text-mut dark:text-slate-400">
                        {officer.email || officer.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="Published">{officer.role || 'officer'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-mut dark:text-slate-300">
                      <div>{officer.position || 'CSG Officer'}</div>
                      {officer.department && (
                        <div className="text-[11px] text-mut dark:text-slate-400">
                          {officer.department}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {officer.must_change_password ? (
                        <Badge tone="Pending">Must Change on Login</Badge>
                      ) : (
                        <Badge tone="Published">Up to Date</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditOfficer(officer)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openChangePassword(officer)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Change Password
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(officer)}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal 1: Create New Officer Profile */}
      <Modal
        open={createOpen}
        title="Create New CSG Officer Profile"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-officer-form" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Officer Account'}
            </Button>
          </>
        }
      >
        <form id="create-officer-form" onSubmit={handleCreateOfficer} className="space-y-3">
          <p className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-[11px] text-indigo-300">
            This creates an account restricted to the <strong>officer</strong> role. Set a default
            password—the officer can change it once logged in.
          </p>

          <Input
            label="Email Address"
            id="officer-email"
            type="email"
            required
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="officer.name@school.edu.ph"
          />

          <div className="space-y-1">
            <label
              htmlFor="officer-default-password"
              className="block text-xs font-medium text-ink dark:text-slate-200"
            >
              Default Password
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  id="officer-default-password"
                  type={showCreatePass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Enter default password"
                  className="w-full rounded-lg border border-line bg-white/80 py-2 pl-3 pr-9 text-xs text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePass((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mut hover:text-ink dark:hover:text-white"
                  title={showCreatePass ? 'Hide password' : 'Show password'}
                >
                  {showCreatePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCreateForm({ ...createForm, password: generateTempPassword(12) })
                }
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Full Name (Optional)"
              id="officer-fullname"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              placeholder="Juan Dela Cruz"
            />
            <Input
              label="Officer Position (Optional)"
              id="officer-position"
              value={createForm.position}
              onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
              placeholder="Secretary / Treasurer"
            />
          </div>

          <Input
            label="Department / Course (Optional)"
            id="officer-department"
            value={createForm.department}
            onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
            placeholder="BSCS / College of Engineering"
          />

          <label className="flex items-center gap-2 pt-1 text-xs text-ink dark:text-slate-200">
            <input
              type="checkbox"
              checked={createForm.require_password_change}
              onChange={(e) =>
                setCreateForm({ ...createForm, require_password_change: e.target.checked })
              }
            />
            Require officer to change password on first login
          </label>
        </form>
      </Modal>

      {/* Modal 2: Edit Officer Name, Position, Department */}
      <Modal
        open={Boolean(editTarget)}
        title={`Edit Officer — ${editTarget?.full_name || editTarget?.email || 'Officer'}`}
        onClose={() => setEditTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-officer-form" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form id="edit-officer-form" onSubmit={handleSaveEditOfficer} className="space-y-3">
          <Input
            label="Email Address"
            id="edit-officer-email"
            value={editTarget?.email || ''}
            disabled
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Full Name"
              id="edit-officer-fullname"
              required
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              placeholder="Juan Dela Cruz"
            />
            <Input
              label="Officer Position"
              id="edit-officer-position"
              value={editForm.position}
              onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
              placeholder="Secretary / Treasurer"
            />
          </div>

          <Input
            label="Department / Course"
            id="edit-officer-department"
            value={editForm.department}
            onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            placeholder="BSIT / College of Engineering"
          />

          <label className="flex items-center gap-2 pt-1 text-xs text-ink dark:text-slate-200">
            <input
              type="checkbox"
              checked={editForm.must_change_password}
              onChange={(e) =>
                setEditForm({ ...editForm, must_change_password: e.target.checked })
              }
            />
            Require officer to change password on next login
          </label>
        </form>
      </Modal>

      {/* Modal 3: Direct Change Password (New Password + Confirm) */}
      <Modal
        open={Boolean(passTarget)}
        title={`Change Password — ${passTarget?.full_name || passTarget?.email || 'Officer'}`}
        onClose={() => setPassTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPassTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" form="admin-change-pass-form" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Password'}
            </Button>
          </>
        }
      >
        <form id="admin-change-pass-form" onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="admin-new-password"
              className="block text-xs font-medium text-ink dark:text-slate-200"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="admin-new-password"
                type={showNewPass ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-line bg-white/80 py-2 pl-3 pr-9 text-xs text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPass((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mut hover:text-ink dark:hover:text-white"
              >
                {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Input
            label="Confirm New Password"
            id="admin-confirm-password"
            type={showNewPass ? 'text' : 'password'}
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />

          <label className="flex items-center gap-2 pt-1 text-xs text-ink dark:text-slate-200">
            <input
              type="checkbox"
              checked={forceResetOnLogin}
              onChange={(e) => setForceResetOnLogin(e.target.checked)}
            />
            Allow/require officer to change their password again upon next login
          </label>
        </form>
      </Modal>

      {/* Modal 4: Delete Confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        title="Confirm Delete Officer Profile"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={submitting}
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {submitting ? 'Deleting...' : 'Delete Profile'}
            </Button>
          </>
        }
      >
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                Are you sure you want to delete{' '}
                <span className="underline">
                  {deleteTarget?.full_name || deleteTarget?.email || 'this officer'}
                </span>
                ?
              </p>
              <p className="mt-1 text-[11px] text-red-200/80">
                This removes their CSG officer profile and account access. This action cannot be
                undone.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}