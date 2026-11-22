import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, X, FileCheck2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { fetchExcuseRequests, decideExcuseRequest } from '../../services/excuseRequestsService';
import { Badge, Button, Card, Textarea, Toast } from '../../components/ui';

const TABS = ['Pending', 'Approved', 'Rejected', 'All'];
const EVIDENCE_BUCKETS = ['excuse-evidence', 'excuse_documents', 'documents', 'avatars'];

function getRawEvidenceRef(reqItem) {
  return (
    reqItem?.document_url ||
    reqItem?.evidence_url ||
    reqItem?.attachment_url ||
    reqItem?.file_url ||
    reqItem?.storage_path ||
    ''
  );
}

function getEvidenceLabel(reqItem) {
  if (reqItem?.document_name) return reqItem.document_name;
  const raw = getRawEvidenceRef(reqItem);
  if (!raw) return '';
  const clean = raw.split('?')[0];
  return decodeURIComponent(clean.split('/').pop() || 'Attached Evidence');
}

function isImageFile(nameOrUrl = '') {
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(nameOrUrl);
}

function EvidenceAttachment({ reqItem }) {
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);

  const rawRef = getRawEvidenceRef(reqItem);
  const label = getEvidenceLabel(reqItem);

  useEffect(() => {
    let cancelled = false;
    setResolvedUrl('');

    if (!rawRef) return;

    if (/^https?:\/\//i.test(rawRef)) {
      setResolvedUrl(rawRef);
      return;
    }

    setLoadingUrl(true);
    (async () => {
      for (const bucket of EVIDENCE_BUCKETS) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(rawRef, 60 * 15);
        if (!cancelled && !error && data?.signedUrl) {
          setResolvedUrl(data.signedUrl);
          break;
        }
      }
      if (!cancelled) setLoadingUrl(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [rawRef]);

  if (!label && !rawRef) return null;

  const showImage = isImageFile(label || resolvedUrl || rawRef);

  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-line bg-soft/40 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-ink dark:text-slate-200">
          <FileCheck2 className="h-4 w-4 shrink-0 text-admin-active" />
          <span>Supporting Document: {label || 'Attached File'}</span>
        </div>

        {resolvedUrl ? (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-soft dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-700"
          >
            View Evidence
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : loadingUrl ? (
          <span className="text-[11px] text-mut dark:text-slate-400">Loading file...</span>
        ) : (
          <span className="text-[11px] text-mut dark:text-slate-400">
            No file link attached on record
          </span>
        )}
      </div>

      {resolvedUrl && showImage && (
        <div className="overflow-hidden rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-900">
          <img
            src={resolvedUrl}
            alt={label || 'Excuse evidence'}
            className="max-h-72 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

export default function ExcuseRequests() {
  const { refreshPendingCount } = useOutletContext() || {};
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [tab, setTab] = useState('Pending');
  const [requests, setRequests] = useState([]);
  const [remarksById, setRemarksById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchExcuseRequests();
      setRequests(data);
      const initialRemarks = {};
      data.forEach((r) => {
        initialRemarks[r.id] = r.remarks || '';
      });
      setRemarksById(initialRemarks);
    } catch (err) {
      setError(err.message || 'Failed to load excuse requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDecision = async (reqItem, decision) => {
    setBusyId(reqItem.id);
    try {
      await decideExcuseRequest(reqItem, decision, remarksById[reqItem.id], actor);
      showToast(`Excuse request #${reqItem.id} marked ${decision}.`);
      await load();
      refreshPendingCount?.();
    } catch (err) {
      showToast(err.message || 'Failed to record decision.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered =
    tab === 'All' ? requests : requests.filter((r) => (r.status || 'Pending') === tab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-line bg-soft/60 p-1 dark:border-slate-800 dark:bg-slate-900">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                tab === t
                  ? 'bg-admin-active text-white'
                  : 'text-mut hover:text-ink dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-mut dark:text-slate-400">
        Requests stay Pending until a decision is recorded. Approved excuses update attendance to Excused and prevent penalties; Rejected excuses stay Absent.
      </p>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading excuse requests...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-mut">
            No {tab === 'All' ? '' : tab.toLowerCase()} excuse requests found.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((reqItem) => {
            const currentStatus = reqItem.status || 'Pending';
            const studentName = reqItem.students?.full_name || reqItem.student_id;
            const courseLabel = reqItem.students?.course
              ? `${reqItem.students.course} · ${reqItem.students.year_level || ''} ${reqItem.students.section || ''}`.trim()
              : reqItem.student_id;

            return (
              <Card key={reqItem.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink dark:text-white">{studentName}</span>
                      <span className="text-xs text-mut">({courseLabel})</span>
                      <Badge>{currentStatus}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-mut dark:text-slate-400">
                      Event: <strong className="text-ink dark:text-slate-200">{reqItem.events?.name || 'General'}</strong> &middot; Reason: <strong className="text-ink dark:text-slate-200">{reqItem.reason || '—'}</strong>
                    </p>
                  </div>

                  {reqItem.decided_by && (
                    <div className="text-right text-xs text-mut">
                      <p>Decided by {reqItem.decided_by}</p>
                      {reqItem.decided_on && <p>{reqItem.decided_on}</p>}
                    </div>
                  )}
                </div>

                {reqItem.explanation && (
                  <p className="mt-2.5 rounded-lg bg-soft/60 p-2.5 text-xs text-ink dark:bg-slate-800 dark:text-slate-200">
                    {reqItem.explanation}
                  </p>
                )}

                <EvidenceAttachment reqItem={reqItem} />

                <div className="mt-3">
                  <Textarea
                    label="Reviewer Remarks"
                    id={`remarks-${reqItem.id}`}
                    rows={2}
                    value={remarksById[reqItem.id] ?? ''}
                    onChange={(e) =>
                      setRemarksById((prev) => ({ ...prev, [reqItem.id]: e.target.value }))
                    }
                    placeholder="Add notes or decision remarks..."
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === reqItem.id}
                    onClick={() => handleDecision(reqItem, 'Approved')}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyId === reqItem.id}
                    onClick={() => handleDecision(reqItem, 'Rejected')}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}