import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Trophy,
  Music,
  GraduationCap,
  HeartHandshake,
  Gamepad2,
  Mic,
  PartyPopper,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  X,
  ExternalLink,
  ImagePlus,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEvents,
} from '../../services/eventsService';
import { Badge, Button, Card, Input, Modal, Select, Table, Textarea, Toast } from '../../components/ui';

const ICON_PRESETS = [
  {
    key: 'trophy',
    label: 'Sports',
    Icon: Trophy,
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    key: 'gamepad',
    label: 'Esports',
    Icon: Gamepad2,
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    key: 'music',
    label: 'Music / Band',
    Icon: Music,
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
  {
    key: 'academic',
    label: 'Academic',
    Icon: GraduationCap,
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  {
    key: 'outreach',
    label: 'Outreach',
    Icon: HeartHandshake,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    key: 'stage',
    label: 'Stage / Mic',
    Icon: Mic,
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
  {
    key: 'social',
    label: 'Social / Party',
    Icon: PartyPopper,
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
  {
    key: 'calendar',
    label: 'General',
    Icon: CalendarDays,
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
];

const EMPTY_FORM = {
  id: null,
  name: '',
  description: '',
  instructions: '',
  event_date: '',
  event_time: '',
  venue: '',
  status: 'Upcoming',
  icon_key: 'auto',
  banner_url: '',
  bannerFile: null,
  attendance_required: true,
  late_tracking: true,
  penalty_tracking: true,
  accept_excuse: true,
  show_on_calendar: true,
  late_fee: 0,
  absent_fee: 0,
};

const DEFAULT_CROP = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function detectIconKeyFromText(event) {
  const text = `${event?.name || ''} ${event?.description || ''}`.toLowerCase();

  if (
    /\b(sport|sports|intramural|intrams|tournament|basketball|volleyball|football|soccer|badminton|chess|athletic|run|marathon|liga|palaro)\b/.test(
      text
    )
  ) {
    return 'trophy';
  }

  if (
    /\b(esport|esports|gaming|game|mlbb|valorant|hackathon|coding|tech|lan|controller)\b/.test(
      text
    )
  ) {
    return 'gamepad';
  }

  if (
    /\b(band|bands|music|concert|jam|sing|song|acoustic|choir|battle of the bands|gig|festival|dj|dance)\b/.test(
      text
    )
  ) {
    return 'music';
  }

  if (
    /\b(seminar|workshop|orientation|assembly|symposium|lecture|quiz|academic|graduation|recognition)\b/.test(
      text
    )
  ) {
    return 'academic';
  }

  if (
    /\b(outreach|charity|donation|clean|volunteer|community|tree planting|blood)\b/.test(text)
  ) {
    return 'outreach';
  }

  if (/\b(pageant|talent|open mic|debate|speaking|host)\b/.test(text)) {
    return 'stage';
  }

  if (/\b(party|acquaintance|celebration|year-end|christmas|halloween|foundation)\b/.test(text)) {
    return 'social';
  }

  return 'calendar';
}

function getEventIconMeta(eventOrKey) {
  const explicitKey =
    typeof eventOrKey === 'string'
      ? eventOrKey
      : eventOrKey?.icon_key && eventOrKey.icon_key !== 'auto'
        ? eventOrKey.icon_key
        : null;

  const resolvedKey =
    explicitKey && explicitKey !== 'auto'
      ? explicitKey
      : typeof eventOrKey === 'object' && eventOrKey
        ? detectIconKeyFromText(eventOrKey)
        : 'calendar';

  return ICON_PRESETS.find((item) => item.key === resolvedKey) || ICON_PRESETS[7];
}

function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeCoverLayout(imgW, imgH, boxW, boxH, zoom, offsetX, offsetY) {
  const baseScale = Math.max(boxW / imgW, boxH / imgH);
  const scale = baseScale * zoom;
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const maxPanX = Math.max(0, (drawW - boxW) / 2);
  const maxPanY = Math.max(0, (drawH - boxH) / 2);
  const x = (boxW - drawW) / 2 + offsetX * maxPanX;
  const y = (boxH - drawH) / 2 + offsetY * maxPanY;
  return { x, y, drawW, drawH };
}

async function renderCroppedBannerFile(sourceUrl, crop, fileNameBase = 'event-banner') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const outW = 1200;
      const outH = 420;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize banner canvas.'));
        return;
      }

      const { x, y, drawW, drawH } = computeCoverLayout(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        outW,
        outH,
        crop.zoom,
        crop.offsetX,
        crop.offsetY
      );

      ctx.drawImage(img, x, y, drawW, drawH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to crop banner image.'));
            return;
          }
          const safeName = `${fileNameBase.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()}-${Date.now()}.jpg`;
          resolve(new File([blob], safeName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
      );
    };
    img.onerror = () => reject(new Error('Unable to load image for cropping.'));
    img.src = sourceUrl;
  });
}

function DiscordBannerAdjuster({
  rawSource,
  crop,
  onCropChange,
  onChangeFile,
  onRemove,
}) {
  const frameRef = useRef(null);
  const [frameSize, setFrameSize] = useState({ width: 420, height: 150 });
  const [naturalSize, setNaturalSize] = useState({ width: 1200, height: 675 });
  const dragStateRef = useRef(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rawSource]);

  const handleImageLoad = (e) => {
    setNaturalSize({
      width: e.currentTarget.naturalWidth || 1200,
      height: e.currentTarget.naturalHeight || 675,
    });
  };

  const clampPan = (val) => Math.max(-1, Math.min(1, val));

  const handlePointerDown = (e) => {
    if (!frameRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = frameRef.current.getBoundingClientRect();
    const baseScale = Math.max(rect.width / naturalSize.width, rect.height / naturalSize.height);
    const scale = baseScale * crop.zoom;
    const drawW = naturalSize.width * scale;
    const drawH = naturalSize.height * scale;
    const maxPanX = Math.max(1, (drawW - rect.width) / 2);
    const maxPanY = Math.max(1, (drawH - rect.height) / 2);

    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: crop.offsetX,
      startOffsetY: crop.offsetY,
      maxPanX,
      maxPanY,
    };
  };

  const handlePointerMove = (e) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    onCropChange({
      ...crop,
      offsetX: clampPan(drag.startOffsetX + dx / drag.maxPanX),
      offsetY: clampPan(drag.startOffsetY + dy / drag.maxPanY),
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  const layout = computeCoverLayout(
    naturalSize.width,
    naturalSize.height,
    frameSize.width,
    frameSize.height,
    crop.zoom,
    crop.offsetX,
    crop.offsetY
  );

  return (
    <div className="space-y-2.5 rounded-xl border border-line bg-soft/40 p-3 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink dark:text-slate-200">
          <Move className="h-3.5 w-3.5 text-indigo-400" />
          Adjust Banner Position
        </span>
        <span className="text-[11px] text-mut dark:text-slate-400">
          Drag image to reposition
        </span>
      </div>

      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-36 w-full cursor-grab select-none touch-none overflow-hidden rounded-lg border border-indigo-500/40 bg-slate-950 active:cursor-grabbing"
      >
        <img
          src={rawSource}
          alt="Banner framing preview"
          onLoad={handleImageLoad}
          draggable={false}
          style={{
            position: 'absolute',
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            width: `${layout.drawW}px`,
            height: `${layout.drawH}px`,
            maxWidth: 'none',
          }}
          className="pointer-events-none select-none"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/80 to-transparent px-2.5 py-1.5 text-[10px] text-slate-200">
          <span>Banner Preview Frame</span>
          <span>{Math.round(crop.zoom * 100)}%</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <div className="flex min-w-[180px] flex-1 items-center gap-2">
          <ZoomOut className="h-3.5 w-3.5 text-mut" />
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.05"
            value={crop.zoom}
            onChange={(e) =>
              onCropChange({
                ...crop,
                zoom: Number(e.target.value),
              })
            }
            className="h-1.5 w-full cursor-pointer accent-indigo-500"
          />
          <ZoomIn className="h-3.5 w-3.5 text-mut" />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCropChange(DEFAULT_CROP)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft/70 px-2 py-1 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Reset position and zoom"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>

          <label className="cursor-pointer rounded-lg border border-line bg-soft/70 px-2 py-1 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Change
            <input
              type="file"
              accept="image/*"
              onChange={onChangeFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600/90 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventManagement() {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bannerSource, setBannerSource] = useState('');
  const [bannerCrop, setBannerCrop] = useState(DEFAULT_CROP);
  const [hasBannerModified, setHasBannerModified] = useState(false);
  const [toast, setToast] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTargets, setDeleteTargets] = useState([]); // array of event objects to delete
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEvents();
      setEvents(data);
      setSelectedIds((prev) => prev.filter((id) => data.some((ev) => ev.id === id)));
      if (data.length > 0) {
        setSelectedEventId((prev) =>
          prev && data.some((ev) => String(ev.id) === String(prev)) ? prev : data[0].id
        );
      } else {
        setSelectedEventId(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = (prefillDate = '') => {
    setForm({
      ...EMPTY_FORM,
      event_date: typeof prefillDate === 'string' ? prefillDate : '',
    });
    setBannerSource('');
    setBannerCrop(DEFAULT_CROP);
    setHasBannerModified(false);
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setForm({
      id: ev.id,
      name: ev.name || '',
      description: ev.description || '',
      instructions: ev.instructions || '',
      event_date: ev.event_date || '',
      event_time: ev.event_time || '',
      venue: ev.venue || '',
      status: ev.status || 'Upcoming',
      icon_key: ev.icon_key || 'auto',
      banner_url: ev.banner_url || '',
      bannerFile: null,
      attendance_required: Boolean(ev.attendance_required),
      late_tracking: Boolean(ev.late_tracking),
      penalty_tracking: Boolean(ev.penalty_tracking),
      accept_excuse: Boolean(ev.accept_excuse),
      show_on_calendar: Boolean(ev.show_on_calendar),
      late_fee: ev.late_fee ?? 0,
      absent_fee: ev.absent_fee ?? 0,
    });
    setBannerSource(ev.banner_url || '');
    setBannerCrop(DEFAULT_CROP);
    setHasBannerModified(false);
    setModalOpen(true);
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, bannerFile: file }));
    setBannerSource(objectUrl);
    setBannerCrop(DEFAULT_CROP);
    setHasBannerModified(true);
  };

  const handleCropChange = (nextCrop) => {
    setBannerCrop(nextCrop);
    setHasBannerModified(true);
  };

  const handleRemoveBanner = () => {
    setForm((prev) => ({ ...prev, banner_url: '', bannerFile: null }));
    setBannerSource('');
    setBannerCrop(DEFAULT_CROP);
    setHasBannerModified(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let finalBannerFile = form.bannerFile;
      if (bannerSource && (form.bannerFile || hasBannerModified)) {
        finalBannerFile = await renderCroppedBannerFile(
          bannerSource,
          bannerCrop,
          form.name || 'event-banner'
        );
      }

      const payloadToSend = {
        ...form,
        bannerFile: finalBannerFile,
      };

      if (form.id) {
        const updated = await updateEvent(form.id, payloadToSend, actor);
        showToast('Event updated and synced.');
        if (updated?.id) setSelectedEventId(updated.id);
      } else {
        const created = await createEvent({ ...payloadToSend, source: 'admin' }, actor);
        showToast('Event created and published to CSG Tracker.');
        if (created?.id) setSelectedEventId(created.id);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmDelete = async () => {
    if (deleteTargets.length === 0) return;
    setDeleting(true);
    try {
      if (deleteTargets.length === 1) {
        await deleteEvent(deleteTargets[0], actor);
        showToast(`Deleted "${deleteTargets[0].name}".`);
      } else {
        await deleteEvents(deleteTargets, actor);
        showToast(`Deleted ${deleteTargets.length} selected events.`);
      }
      setDeleteTargets([]);
      setSelectedIds([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to delete event(s).');
    } finally {
      setDeleting(false);
    }
  };

  const summaryCounts = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter((e) => e.status === 'Upcoming').length;
    const ongoing = events.filter((e) => e.status === 'Ongoing' || e.status === 'Active').length;
    const past = events.filter((e) => e.status === 'Past' || e.status === 'Completed').length;
    return { total, upcoming, ongoing, past };
  }, [events]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      if (!ev.event_date) continue;
      const key = String(ev.event_date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(year, month, day);
      cells.push({
        day,
        dateKey: toDateKey(dateObj),
      });
    }
    return cells;
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedDate && String(ev.event_date || '').slice(0, 10) !== selectedDate) {
        return false;
      }
      if (statusFilter !== 'All' && ev.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${ev.name || ''} ${ev.venue || ''} ${ev.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, selectedDate, statusFilter, searchQuery]);

  const allFilteredSelected =
    filteredEvents.length > 0 && filteredEvents.every((ev) => selectedIds.includes(ev.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredEvents.map((ev) => ev.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredEvents.map((ev) => ev.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => String(e.id) === String(selectedEventId)) || null;
  }, [events, selectedEventId]);

  const todayKey = toDateKey(new Date());
  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const stats = [
    { label: 'Total Events', value: summaryCounts.total, sub: 'All events created' },
    { label: 'Upcoming Events', value: summaryCounts.upcoming, sub: 'Happening soon' },
    { label: 'Ongoing Events', value: summaryCounts.ongoing, sub: 'Currently active' },
    { label: 'Past Events', value: summaryCounts.past, sub: 'Completed' },
  ];

  const selectedMeta = selectedEvent ? getEventIconMeta(selectedEvent) : null;
  const SelectedIcon = selectedMeta?.Icon || CalendarDays;
  const autoDetectedIcon = getEventIconMeta(form);
  const AutoDetectedIconComponent = autoDetectedIcon.Icon;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink dark:text-white">Event Management</h1>
          <p className="text-xs text-mut dark:text-slate-400">
            Create, update, and manage official school events. Events flow automatically to the CSG Student Tracker.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="secondary"
              onClick={() =>
                setDeleteTargets(events.filter((ev) => selectedIds.includes(ev.id)))
              }
              className="border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => openCreate(selectedDate)}>
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-line bg-soft/60 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-medium text-mut dark:text-slate-400">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{item.value}</p>
            <p className="mt-0.5 text-[11px] text-mut dark:text-slate-500">{item.sub}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading events...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT COLUMN: Calendar */}
          <div className="space-y-4 lg:col-span-3">
            <Card
              title={monthLabel}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                      )
                    }
                    className="rounded-lg border border-line bg-soft/60 p-1 text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                      setSelectedDate('');
                    }}
                    className="rounded-lg border border-line bg-soft/60 px-2 py-0.5 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                      )
                    }
                    className="rounded-lg border border-line bg-soft/60 p-1 text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    title="Next Month"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            >
              <div className="space-y-2.5">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-mut dark:text-slate-400">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="h-9" />;
                    }

                    const dayEvents = eventsByDate.get(cell.dateKey) || [];
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDate === cell.dateKey;
                    const isToday = todayKey === cell.dateKey;
                    const FirstIcon = hasEvents ? getEventIconMeta(dayEvents[0]).Icon : null;

                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        onClick={() => {
                          const nextDate = isSelected ? '' : cell.dateKey;
                          setSelectedDate(nextDate);
                          if (dayEvents.length > 0) {
                            setSelectedEventId(dayEvents[0].id);
                          }
                        }}
                        title={
                          hasEvents
                            ? dayEvents.map((e) => e.name).join(', ')
                            : cell.dateKey
                        }
                        className={`relative flex h-9 flex-col items-center justify-center rounded-lg border text-xs transition ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500/25 font-bold text-white'
                            : hasEvents
                              ? 'border-emerald-500/50 bg-emerald-500/15 font-semibold text-emerald-300 hover:bg-emerald-500/25'
                              : isToday
                                ? 'border-sky-500/50 bg-sky-500/10 font-semibold text-sky-300'
                                : 'border-line/50 bg-soft/30 text-ink hover:bg-soft/70 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{cell.day}</span>
                        {hasEvents && FirstIcon && <FirstIcon className="h-2.5 w-2.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2 text-[11px] text-mut dark:border-slate-800 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Has Event
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Today
                  </span>
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      className="font-medium text-indigo-400 hover:underline"
                    >
                      Clear ({selectedDate})
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* CENTER COLUMN: Events List */}
          <div className="space-y-3 lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-soft/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="relative min-w-[170px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-mut" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events or venue..."
                  className="w-full rounded-lg border border-line bg-white/80 py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-mut focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-line bg-white/80 px-2.5 py-1.5 text-xs text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="All">All Status</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Published">Published</option>
                <option value="Past">Past</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-soft/40 dark:border-slate-800 dark:bg-slate-900/50">
              <Table
                keyField="id"
                rows={filteredEvents}
                emptyMessage={
                  selectedDate
                    ? `No events scheduled on ${selectedDate}.`
                    : 'No matching events found.'
                }
                onRowClick={(ev) => setSelectedEventId(ev.id)}
                columns={[
                  {
                    key: 'select',
                    label: (
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Select all visible events"
                        className="h-3.5 w-3.5 cursor-pointer rounded accent-indigo-500"
                      />
                    ),
                    render: (ev) => (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ev.id)}
                        onChange={() => toggleSelectOne(ev.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${ev.name}`}
                        className="h-3.5 w-3.5 cursor-pointer rounded accent-indigo-500"
                      />
                    ),
                  },
                  {
                    key: 'name',
                    label: 'Event Name',
                    render: (ev) => {
                      const { Icon, badgeClass, label } = getEventIconMeta(ev);
                      const isSelected = selectedEvent?.id === ev.id;
                      return (
                        <div
                          onClick={() => setSelectedEventId(ev.id)}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg py-0.5 transition ${
                            isSelected ? 'text-indigo-400' : ''
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${badgeClass}`}
                            title={label}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink dark:text-white">
                              {ev.name}
                            </p>
                            <span className="inline-block rounded bg-soft px-1.5 py-0.5 text-[10px] text-mut dark:bg-slate-800 dark:text-slate-400">
                              {label}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'schedule',
                    label: 'Date',
                    render: (ev) => (
                      <span
                        onClick={() => setSelectedEventId(ev.id)}
                        className="cursor-pointer text-xs text-mut dark:text-slate-300"
                      >
                        {ev.event_date || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (ev) => (
                      <div onClick={() => setSelectedEventId(ev.id)} className="cursor-pointer">
                        <Badge>{ev.status}</Badge>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Side Detail Inspector Popup */}
          <div className="lg:col-span-4">
            {selectedEvent ? (
              <div className="sticky top-4 overflow-hidden rounded-xl border border-line bg-soft/60 dark:border-slate-800 dark:bg-slate-900">
                {selectedEvent.banner_url ? (
                  <div className="relative h-36 w-full overflow-hidden border-b border-line/80 bg-slate-950 dark:border-slate-800">
                    <img
                      src={selectedEvent.banner_url}
                      alt={selectedEvent.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      <Badge>{selectedEvent.status}</Badge>
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(null)}
                        className="rounded-lg bg-slate-950/70 p-1 text-slate-200 hover:bg-slate-900 hover:text-white"
                        title="Close details"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="border-b border-line/80 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${selectedMeta.badgeClass}`}
                      >
                        <SelectedIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!selectedEvent.banner_url && <Badge>{selectedEvent.status}</Badge>}
                          <span className="rounded-full border border-line bg-soft/70 px-2 py-0.5 text-[10px] font-medium text-mut dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {selectedMeta.label}
                          </span>
                        </div>
                        <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
                          {selectedEvent.name}
                        </h2>
                      </div>
                    </div>

                    {!selectedEvent.banner_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(null)}
                        className="rounded-lg p-1 text-mut hover:bg-soft hover:text-ink dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Close details"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 text-xs">
                  <div className="space-y-2 rounded-lg border border-line/70 bg-soft/40 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 text-ink dark:text-slate-200">
                      <CalendarDays className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="font-medium">
                        {selectedEvent.event_date || 'No date specified'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-ink dark:text-slate-200">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{selectedEvent.event_time || 'No time specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink dark:text-slate-200">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{selectedEvent.venue || 'No venue specified'}</span>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 font-semibold uppercase tracking-wide text-[10px] text-mut dark:text-slate-400">
                      Description
                    </p>
                    <p className="leading-relaxed text-ink dark:text-slate-300">
                      {selectedEvent.description || 'No description provided for this event.'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 flex items-center gap-1 font-semibold uppercase tracking-wide text-[10px] text-mut dark:text-slate-400">
                      <FileText className="h-3 w-3" />
                      Attendance Instructions
                    </p>
                    <p className="leading-relaxed text-ink dark:text-slate-300">
                      {selectedEvent.instructions || 'Standard attendance rules apply.'}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-lg border border-line/70 bg-soft/40 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="font-semibold uppercase tracking-wide text-[10px] text-mut dark:text-slate-400">
                      Event Settings & Fees
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Attendance Req.', selectedEvent.attendance_required],
                        ['Late Tracking', selectedEvent.late_tracking],
                        ['Penalty Tracking', selectedEvent.penalty_tracking],
                        ['Accept Excuses', selectedEvent.accept_excuse],
                      ].map(([label, enabled]) => (
                        <div key={label} className="flex items-center gap-1.5">
                          {enabled ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-slate-500" />
                          )}
                          <span className="text-ink dark:text-slate-200">{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] dark:border-slate-700">
                      <span className="text-mut dark:text-slate-400">
                        Late Fee:{' '}
                        <strong className="text-ink dark:text-white">
                          ₱{selectedEvent.late_fee ?? 0}
                        </strong>
                      </span>
                      <span className="text-mut dark:text-slate-400">
                        Absent Fee:{' '}
                        <strong className="text-ink dark:text-white">
                          ₱{selectedEvent.absent_fee ?? 0}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(selectedEvent)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate('/admin/excuse-requests')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Excuses
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeleteTargets([selectedEvent])}
                      className="border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      title="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-soft/30 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
                <CalendarDays className="mb-2 h-7 w-7 text-mut" />
                <p className="text-xs font-semibold text-ink dark:text-slate-200">
                  No Event Selected
                </p>
                <p className="mt-1 text-[11px] text-mut dark:text-slate-400">
                  Click any event in the list to view its full details, schedule, and settings here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTargets.length > 0}
        title={deleteTargets.length > 1 ? 'Delete Selected Events' : 'Delete Event'}
        onClose={() => !deleting && setDeleteTargets([])}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeleteTargets([])}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting
                ? 'Deleting...'
                : deleteTargets.length > 1
                  ? `Delete ${deleteTargets.length} Events`
                  : 'Delete Event'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-ink dark:text-slate-200">
          {deleteTargets.length === 1 ? (
            <p>
              Are you sure you want to delete{' '}
              <strong className="font-semibold text-white">{deleteTargets[0].name}</strong>? This
              cannot be undone.
            </p>
          ) : (
            <>
              <p>
                Are you sure you want to delete{' '}
                <strong className="font-semibold text-white">{deleteTargets.length}</strong> selected
                events? This cannot be undone.
              </p>
              <ul className="max-h-32 list-disc space-y-1 overflow-y-auto pl-5 text-mut dark:text-slate-300">
                {deleteTargets.map((ev) => (
                  <li key={ev.id}>{ev.name}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={form.id ? 'Edit Event' : 'Create Event'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="event-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save Event'}
            </Button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSave} className="space-y-3">
          {/* Discord-Style Event Banner Upload & Adjuster */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink dark:text-slate-200">
              Event Banner Photo (Optional)
            </label>

            {bannerSource ? (
              <DiscordBannerAdjuster
                rawSource={bannerSource}
                crop={bannerCrop}
                onCropChange={handleCropChange}
                onChangeFile={handleBannerChange}
                onRemove={handleRemoveBanner}
              />
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-soft/40 px-4 py-4 text-center transition hover:bg-soft/70 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800">
                <ImagePlus className="mb-1 h-5 w-5 text-indigo-400" />
                <span className="text-xs font-medium text-ink dark:text-slate-200">
                  Click to upload event banner
                </span>
                <span className="mt-0.5 text-[11px] text-mut dark:text-slate-400">
                  PNG, JPG, or WEBP — drag & zoom to adjust like Discord
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Event Icon Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-ink dark:text-slate-200">
                Event Icon
              </label>
              <span className="text-[11px] text-mut dark:text-slate-400">
                {form.icon_key === 'auto'
                  ? `Auto: ${autoDetectedIcon.label}`
                  : `Selected: ${getEventIconMeta(form.icon_key).label}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => setForm({ ...form, icon_key: 'auto' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                  form.icon_key === 'auto'
                    ? 'border-indigo-400 bg-indigo-500/20 text-white'
                    : 'border-line bg-soft/40 text-ink hover:bg-soft/80 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
                }`}
                title="Automatically choose icon from event name/description"
              >
                <AutoDetectedIconComponent className="h-4 w-4 text-indigo-400" />
                <span className="inline-flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  Auto
                </span>
              </button>

              {ICON_PRESETS.map((preset) => {
                const PresetIcon = preset.Icon;
                const active = form.icon_key === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setForm({ ...form, icon_key: preset.key })}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                      active
                        ? 'border-indigo-400 bg-indigo-500/20 text-white'
                        : 'border-line bg-soft/40 text-ink hover:bg-soft/80 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
                    }`}
                  >
                    <PresetIcon className="h-4 w-4" />
                    <span className="max-w-full truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Event Name"
            id="ev-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="General Assembly / Orientation"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              id="ev-date"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
            <Input
              label="Time"
              id="ev-time"
              type="time"
              value={form.event_time}
              onChange={(e) => setForm({ ...form, event_time: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Venue"
              id="ev-venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="University Gymnasium"
            />
            <Select
              label="Status / Schedule State"
              id="ev-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Published">Published</option>
              <option value="Past">Past</option>
            </Select>
          </div>
          <Textarea
            label="Description"
            id="ev-desc"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Textarea
            label="Attendance Requirements & Instructions"
            id="ev-inst"
            rows={2}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Dress code, call time, QR/sheet check-in rules..."
          />
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.attendance_required}
                onChange={(e) => setForm({ ...form, attendance_required: e.target.checked })}
              />
              Attendance required
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.late_tracking}
                onChange={(e) => setForm({ ...form, late_tracking: e.target.checked })}
              />
              Late tracking
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.penalty_tracking}
                onChange={(e) => setForm({ ...form, penalty_tracking: e.target.checked })}
              />
              Penalty tracking
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.accept_excuse}
                onChange={(e) => setForm({ ...form, accept_excuse: e.target.checked })}
              />
              Accept excuse requests
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Late Fee (₱)"
              id="ev-late-fee"
              type="number"
              min="0"
              value={form.late_fee}
              onChange={(e) => setForm({ ...form, late_fee: e.target.value })}
            />
            <Input
              label="Absent Fee (₱)"
              id="ev-absent-fee"
              type="number"
              min="0"
              value={form.absent_fee}
              onChange={(e) => setForm({ ...form, absent_fee: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}