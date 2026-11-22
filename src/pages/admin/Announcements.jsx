import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  FileEdit,
  Archive,
  Send,
  Pin,
  CheckCheck,
  CalendarDays,
  UserCheck,
  Clock,
  ExternalLink,
  X,
  Pencil,
  Tag,
  ImagePlus,
  Globe,
  Trash2,
  ChevronDown,
  ChevronUp,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../context/AuthContext';
import { fetchAnnouncements, saveAnnouncement } from '../../services/announcementsService';
import { Badge, Button, Input, Modal, Select, Textarea, Toast } from '../../components/ui';

const SUPABASE_URL = 'https://ocsnjcvvfqkgogtktmwr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc25qY3Z2ZnFrZ29ndGt0bXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMjc5MDksImV4cCI6MjExMDgwMzkwOX0.YNc51tFZFK2GvYNefZj5M2Nu56W7-55sTcakNzcBvuo';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUS_TABS = ['All', 'Published', 'Draft', 'Archived'];
const CATEGORIES = ['Event', 'General', 'Finance', 'System', 'Academic'];

const DEFAULT_CROP = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

const EMPTY_ANN = {
  id: null,
  title: '',
  body: '',
  category: 'General',
  target_audience: 'All Students',
  status: 'Draft',
  ann_date: new Date().toISOString().split('T')[0],
  is_pinned: false,
  image_url: '',
  banner_url: '',
  imageFile: null,
  removeImage: false,
};

function resolveStatus(item) {
  if (item?.status) return item.status;
  if (item?.is_archived) return 'Archived';
  return 'Published';
}

function getAnnouncementImage(item) {
  return item?.image_url || item?.banner_url || '';
}

function getCategoryMeta(category) {
  const cat = String(category || 'General').toLowerCase();
  if (cat.includes('event')) {
    return {
      Icon: CalendarDays,
      badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      label: 'Event',
    };
  }
  if (cat.includes('finance') || cat.includes('pay') || cat.includes('fee')) {
    return {
      Icon: Tag,
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      label: 'Finance',
    };
  }
  if (cat.includes('system') || cat.includes('maint')) {
    return {
      Icon: Megaphone,
      badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      label: 'System',
    };
  }
  return {
    Icon: Megaphone,
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    label: category || 'General',
  };
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

async function renderCroppedImageFile(sourceUrl, crop, fileNameBase = 'announcement-photo') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Facebook-style 4:3 feed photo dimensions
      const outW = 1200;
      const outH = 900;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize image canvas.'));
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
            reject(new Error('Failed to render adjusted image.'));
            return;
          }
          const safeName = `${fileNameBase.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()}-${Date.now()}.jpg`;
          resolve(new File([blob], safeName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
      );
    };
    img.onerror = () => reject(new Error('Unable to load image for adjustment.'));
    img.src = sourceUrl;
  });
}

function AnnouncementImageAdjuster({
  rawSource,
  crop,
  onCropChange,
  onChangeFile,
  onRemove,
}) {
  const frameRef = useRef(null);
  const [frameSize, setFrameSize] = useState({ width: 420, height: 315 });
  const [naturalSize, setNaturalSize] = useState({ width: 1200, height: 900 });
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
      height: e.currentTarget.naturalHeight || 900,
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
          Adjust Feed Photo (4:3)
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
        className="relative aspect-[4/3] max-h-72 w-full cursor-grab select-none touch-none overflow-hidden rounded-lg border border-indigo-500/40 bg-slate-950 active:cursor-grabbing"
      >
        <img
          src={rawSource}
          alt="Announcement framing preview"
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
          <span>Facebook Feed Photo (4:3)</span>
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

          <button
            type="button"
            onClick={onChangeFile}
            className="rounded-lg border border-line bg-soft/70 px-2 py-1 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Change
          </button>

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

async function uploadAnnouncementImage(file) {
  if (!file) return null;
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `announcements/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('event-banners')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from('event-banners').getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export default function Announcements() {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusDropdown, setStatusDropdown] = useState('All');

  const [selectedIds, setSelectedIds] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_ANN);
  const [imageSource, setImageSource] = useState('');
  const [imageCrop, setImageCrop] = useState(DEFAULT_CROP);
  const [hasImageModified, setHasImageModified] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toast, setToast] = useState('');

  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const handleSelectAndExpand = (item) => {
    setSelectedId(item.id);
    setExpandedIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnnouncements();
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      setSelectedIds((prev) => prev.filter((id) => list.some((a) => a.id === id)));
      setExpandedIds((prev) => prev.filter((id) => list.some((a) => a.id === id)));
      if (list.length > 0) {
        setSelectedId((prev) =>
          prev && list.some((a) => String(a.id) === String(prev)) ? prev : list[0].id
        );
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...EMPTY_ANN, ann_date: new Date().toISOString().split('T')[0] });
    setImageSource('');
    setImageCrop(DEFAULT_CROP);
    setHasImageModified(false);
    setIsDraggingFile(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    const existingImg = getAnnouncementImage(item);
    setForm({
      id: item.id,
      title: item.title || '',
      body: item.body || item.content || '',
      category: item.category || 'General',
      target_audience: item.target_audience || 'All Students',
      status: resolveStatus(item),
      ann_date: item.ann_date || new Date().toISOString().split('T')[0],
      is_pinned: Boolean(item.is_pinned),
      image_url: existingImg,
      banner_url: existingImg,
      imageFile: null,
      removeImage: false,
    });
    setImageSource(existingImg);
    setImageCrop(DEFAULT_CROP);
    setHasImageModified(false);
    setIsDraggingFile(false);
    setModalOpen(true);
  };

  const applySelectedFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file (JPG, PNG, WEBP, or GIF).');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      imageFile: file,
      removeImage: false,
    }));
    setImageSource(previewUrl);
    setImageCrop(DEFAULT_CROP);
    setHasImageModified(true);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) applySelectedFile(file);
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applySelectedFile(file);
  };

  const handleCropChange = (nextCrop) => {
    setImageCrop(nextCrop);
    setHasImageModified(true);
  };

  const handleClearImage = () => {
    setForm((prev) => ({
      ...prev,
      imageFile: null,
      image_url: '',
      banner_url: '',
      removeImage: true,
    }));
    setImageSource('');
    setImageCrop(DEFAULT_CROP);
    setHasImageModified(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && !form.body.trim() && !imageSource) return;
    setSaving(true);
    try {
      let finalImageUrl = form.removeImage ? null : form.image_url || form.banner_url || null;

      if (imageSource && (form.imageFile || hasImageModified)) {
        const renderedFile = await renderCroppedImageFile(
          imageSource,
          imageCrop,
          form.title || 'announcement-photo'
        );
        finalImageUrl = await uploadAnnouncementImage(renderedFile);
      }

      const payloadToSave = {
        ...form,
        title: form.title.trim() || 'Announcement Post',
        image_url: finalImageUrl,
        banner_url: finalImageUrl,
      };

      const saved = await saveAnnouncement(payloadToSave, actor);
      showToast(
        form.status === 'Published'
          ? 'Announcement posted to CSG Tracker.'
          : `Announcement saved as ${form.status}.`
      );
      setModalOpen(false);
      await load();
      if (saved?.id) {
        setSelectedId(saved.id);
        setExpandedIds((prev) => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
      }
    } catch (err) {
      showToast(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (item, nextStatus, toastMsg) => {
    if (!item) return;
    setSaving(true);
    try {
      await saveAnnouncement(
        {
          ...item,
          status: nextStatus,
          is_archived: nextStatus === 'Archived',
        },
        actor
      );
      showToast(toastMsg);
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to update announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (item) => {
    if (!item) return;
    const nextPin = !Boolean(item.is_pinned);
    setSaving(true);
    try {
      await saveAnnouncement({ ...item, is_pinned: nextPin }, actor);
      showToast(nextPin ? 'Announcement pinned.' : 'Announcement unpinned.');
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to toggle pin.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const targets = items.filter((a) => selectedIds.includes(a.id));
      for (const target of targets) {
        await saveAnnouncement({ ...target, status: 'Published', is_archived: false }, actor);
      }
      showToast(`Published ${targets.length} announcement(s).`);
      setSelectedIds([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to publish selected.');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const total = items.length;
    const published = items.filter((a) => resolveStatus(a) === 'Published').length;
    const drafts = items.filter((a) => resolveStatus(a) === 'Draft').length;
    const archived = items.filter((a) => resolveStatus(a) === 'Archived').length;
    return { total, published, drafts, archived };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      const status = resolveStatus(a);
      if (tab !== 'All' && status !== tab) return false;
      if (statusDropdown !== 'All' && status !== statusDropdown) return false;

      const cat = a.category || 'General';
      if (categoryFilter !== 'All' && cat.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = String(a.title || '').toLowerCase();
        const body = String(a.body || a.content || '').toLowerCase();
        const sender = String(a.sender || '').toLowerCase();
        if (!title.includes(q) && !body.includes(q) && !sender.includes(q)) return false;
      }

      return true;
    });
  }, [items, tab, statusDropdown, categoryFilter, searchQuery]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((a) => String(a.id) === String(selectedId)) || null;
  }, [items, selectedId]);

  const allFilteredChecked =
    filtered.length > 0 && filtered.every((a) => selectedIds.includes(a.id));

  const toggleAllFiltered = () => {
    if (allFilteredChecked) {
      const removeSet = new Set(filtered.map((a) => a.id));
      setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((a) => a.id)])));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const statCards = [
    {
      label: 'Total Announcements',
      value: summary.total,
      sub: 'All announcements',
      icon: Megaphone,
      wrap: 'bg-indigo-500/15 text-indigo-400',
    },
    {
      label: 'Published',
      value: summary.published,
      sub: 'Visible to CSG system',
      icon: Eye,
      wrap: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      label: 'Drafts',
      value: summary.drafts,
      sub: 'Not yet published',
      icon: FileEdit,
      wrap: 'bg-amber-500/15 text-amber-400',
    },
    {
      label: 'Archived',
      value: summary.archived,
      sub: 'Moved to archive',
      icon: Archive,
      wrap: 'bg-purple-500/15 text-purple-400',
    },
  ];

  const selectedStatus = selectedItem ? resolveStatus(selectedItem) : '';
  const selectedMeta = selectedItem ? getCategoryMeta(selectedItem.category) : null;
  const SelectedIcon = selectedMeta?.Icon || Megaphone;
  const selectedImage = selectedItem ? getAnnouncementImage(selectedItem) : '';
  const authorDisplayName = profile?.full_name || user?.email || 'CSG Office';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink dark:text-white">Announcements</h1>
            <p className="text-xs text-mut dark:text-slate-400">
              Create and publish official announcements for the CSG system.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="secondary" disabled={saving} onClick={handleBulkPublish}>
              <Send className="h-4 w-4" />
              Publish Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Create Announcement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-start gap-3 rounded-xl border border-line bg-soft/60 p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.wrap}`}
              >
                <IconComp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-mut dark:text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-mut dark:text-slate-500">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading announcements...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="overflow-hidden rounded-xl border border-line bg-soft/40 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-8">
            <div className="flex items-center gap-6 border-b border-line px-4 pt-3 text-xs font-medium dark:border-slate-800">
              {STATUS_TABS.map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`border-b-2 pb-2.5 transition ${
                      active
                        ? 'border-admin-active font-semibold text-admin-active dark:text-indigo-400'
                        : 'border-transparent text-mut hover:text-ink dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-line/70 p-3 dark:border-slate-800">
              <div className="relative min-w-[190px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-mut" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search announcements..."
                  className="w-full rounded-lg border border-line bg-white/80 py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-mut focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-line bg-white/80 px-2.5 py-1.5 text-xs text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={statusDropdown}
                onChange={(e) => setStatusDropdown(e.target.value)}
                className="rounded-lg border border-line bg-white/80 px-2.5 py-1.5 text-xs text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center justify-between border-b border-line/60 bg-soft/50 px-4 py-2 text-[11px] text-mut dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allFilteredChecked}
                    onChange={toggleAllFiltered}
                    aria-label="Select all announcements"
                    className="h-3.5 w-3.5 cursor-pointer rounded accent-indigo-500"
                  />
                  <span>Select all visible ({filtered.length})</span>
                </label>
                <span>Click any announcement to expand full post</span>
              </div>
            )}

            <div className="divide-y divide-line/60 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-mut">
                  No announcements in this view.
                </div>
              ) : (
                filtered.map((a) => {
                  const status = resolveStatus(a);
                  const bodyText = a.body || a.content || '';
                  const imgSrc = getAnnouncementImage(a);
                  const { Icon, badgeClass, label } = getCategoryMeta(a.category);
                  const isSelected = selectedItem?.id === a.id;
                  const isExpanded = expandedIds.includes(a.id);
                  const isRead = readIds.includes(a.id);

                  return (
                    <div
                      key={a.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-indigo-500/5 dark:bg-indigo-500/10'
                          : 'hover:bg-soft/50 dark:hover:bg-slate-800/35'
                      }`}
                    >
                      <div
                        onClick={() => handleSelectAndExpand(a)}
                        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-xs"
                      >
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(a.id)}
                              onChange={() => toggleOne(a.id)}
                              className="h-3.5 w-3.5 cursor-pointer rounded accent-indigo-500"
                            />
                          </div>

                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={a.title}
                              className="mt-0.5 aspect-[4/3] h-9 w-12 shrink-0 rounded-lg border border-line object-cover dark:border-slate-700"
                            />
                          ) : (
                            <div
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${badgeClass}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p
                                className={`truncate font-semibold ${
                                  isRead
                                    ? 'text-mut dark:text-slate-300'
                                    : 'text-ink dark:text-white'
                                }`}
                              >
                                {a.title}
                              </p>
                              {a.is_pinned && (
                                <Pin className="h-3 w-3 shrink-0 text-indigo-400" />
                              )}
                              <span
                                className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
                              >
                                {label}
                              </span>
                            </div>

                            {!isExpanded && bodyText && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-mut dark:text-slate-400">
                                {bodyText}
                              </p>
                            )}

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-mut dark:text-slate-400">
                              <span>{a.sender || 'CSG Office'}</span>
                              <span>&middot;</span>
                              <span>{a.ann_date || '—'}</span>
                              {imgSrc && (
                                <>
                                  <span>&middot;</span>
                                  <span className="font-medium text-emerald-400">Photo attached</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge>{status}</Badge>
                          <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {status !== 'Published' && (
                            <Button
                              size="sm"
                              disabled={saving}
                              onClick={() =>
                                handleQuickStatus(a, 'Published', 'Announcement published.')
                              }
                            >
                              <Send className="h-3.5 w-3.5" />
                              Publish
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectAndExpand(a)}
                            className="rounded-lg p-1.5 text-mut hover:bg-soft hover:text-ink dark:hover:bg-slate-800 dark:hover:text-white"
                            title={isExpanded ? 'Collapse post' : 'Expand full post'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-line/50 bg-soft/30 px-4 py-3.5 pl-12 text-xs dark:border-slate-800/70 dark:bg-slate-950/40">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-mut dark:text-slate-400">
                            <span>
                              Audience:{' '}
                              <strong className="text-ink dark:text-slate-200">
                                {a.target_audience || 'All Students'}
                              </strong>
                            </span>
                            <span>
                              Posted by{' '}
                              <strong className="text-ink dark:text-slate-200">
                                {a.sender || 'CSG Office'}
                              </strong>{' '}
                              on {a.ann_date || '—'}
                            </span>
                          </div>

                          <p className="whitespace-pre-line leading-relaxed text-ink dark:text-slate-200">
                            {bodyText || 'No message body provided.'}
                          </p>

                          {imgSrc && (
                            <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-line bg-slate-950 dark:border-slate-800">
                              <img
                                src={imgSrc}
                                alt={a.title}
                                className="aspect-[4/3] w-full object-cover"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setReadIds((prev) =>
                                  prev.includes(a.id) ? prev : [...prev, a.id]
                                );
                                showToast('Marked as read.');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                              {isRead ? 'Read' : 'Mark as Read'}
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                handleQuickStatus(
                                  a,
                                  status === 'Archived' ? 'Published' : 'Archived',
                                  status === 'Archived'
                                    ? 'Announcement restored.'
                                    : 'Announcement archived.'
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <Archive className="h-3.5 w-3.5 text-amber-400" />
                              {status === 'Archived' ? 'Unarchive' : 'Archive'}
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleTogglePin(a)}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <Pin className="h-3.5 w-3.5 text-indigo-400" />
                              {a.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5 text-[11px] text-mut dark:border-slate-800 dark:text-slate-400">
              <span>
                Showing {filtered.length} of {items.length} announcements
              </span>
              {tab !== 'All' ||
              searchQuery ||
              categoryFilter !== 'All' ||
              statusDropdown !== 'All' ? (
                <button
                  type="button"
                  onClick={() => {
                    setTab('All');
                    setSearchQuery('');
                    setCategoryFilter('All');
                    setStatusDropdown('All');
                  }}
                  className="font-medium text-indigo-400 hover:underline"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-4">
            {selectedItem ? (
              <div className="sticky top-4 space-y-4 rounded-xl border border-line bg-soft/60 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${selectedMeta.badgeClass}`}
                    >
                      <SelectedIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink dark:text-white">
                        {selectedItem.title}
                      </h2>
                      <p className="text-[11px] text-mut dark:text-slate-400">
                        {selectedItem.sender || 'CSG Office'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge>{selectedStatus}</Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-lg p-1 text-mut hover:bg-soft hover:text-ink dark:hover:bg-slate-800 dark:hover:text-white"
                      title="Close panel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-mut dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3 text-indigo-400" />
                    {selectedMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-indigo-400" />
                    {selectedItem.ann_date || 'No date'}
                  </span>
                </div>

                {selectedImage && (
                  <div className="overflow-hidden rounded-xl border border-line bg-slate-950 dark:border-slate-800">
                    <img
                      src={selectedImage}
                      alt={selectedItem.title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-ink dark:text-white">
                    Announcement Details
                  </h3>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-mut dark:text-slate-300">
                    {selectedItem.body || selectedItem.content || 'No announcement body provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-line/70 bg-soft/40 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <div>
                    <p className="text-[10px] text-mut dark:text-slate-400">Category</p>
                    <p className="mt-0.5 font-medium text-ink dark:text-white">
                      {selectedMeta.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-mut dark:text-slate-400">Target Audience</p>
                    <p className="mt-0.5 font-medium text-ink dark:text-white">
                      {selectedItem.target_audience || 'All Students'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-mut dark:text-slate-400">Created By</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 font-medium text-ink dark:text-white">
                      <UserCheck className="h-3 w-3 text-indigo-400" />
                      {selectedItem.sender || 'CSG Office'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-mut dark:text-slate-400">Date</p>
                    <p className="mt-0.5 font-medium text-ink dark:text-white">
                      {selectedItem.ann_date || '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-ink dark:text-white">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => navigate('/admin/events')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-soft/60 px-2.5 py-2 font-medium text-ink transition hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                      View Events
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReadIds((prev) =>
                          prev.includes(selectedItem.id) ? prev : [...prev, selectedItem.id]
                        );
                        showToast('Marked as read.');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-soft/60 px-2.5 py-2 font-medium text-ink transition hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                      {readIds.includes(selectedItem.id) ? 'Read' : 'Mark as Read'}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleQuickStatus(
                          selectedItem,
                          selectedStatus === 'Archived' ? 'Published' : 'Archived',
                          selectedStatus === 'Archived'
                            ? 'Announcement restored.'
                            : 'Announcement archived.'
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-soft/60 px-2.5 py-2 font-medium text-ink transition hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Archive className="h-3.5 w-3.5 text-amber-400" />
                      {selectedStatus === 'Archived' ? 'Unarchive' : 'Archive'}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleTogglePin(selectedItem)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-soft/60 px-2.5 py-2 font-medium text-ink transition hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Pin className="h-3.5 w-3.5 text-indigo-400" />
                      {selectedItem.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-line/70 pt-3 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-ink dark:text-white">History</h3>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <div>
                        <p className="font-semibold text-ink dark:text-white">{selectedStatus}</p>
                        <p className="text-mut dark:text-slate-400">
                          {selectedItem.ann_date || 'Recent'} by{' '}
                          {selectedItem.sender || actor.name || 'CSG Office'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-soft/30 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
                <Megaphone className="mb-2 h-7 w-7 text-mut" />
                <p className="text-xs font-semibold text-ink dark:text-slate-200">
                  No Announcement Selected
                </p>
                <p className="mt-1 text-[11px] text-mut dark:text-slate-400">
                  Click any announcement row to inspect its details and actions here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? 'Edit Announcement Post' : 'Create Announcement Post'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="ann-form" disabled={saving}>
              {saving
                ? 'Posting...'
                : form.status === 'Published'
                  ? 'Post Announcement'
                  : 'Save Announcement'}
            </Button>
          </>
        }
      >
        <form id="ann-form" onSubmit={handleSave} className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-soft/40 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                {authorDisplayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-ink dark:text-white">
                  {authorDisplayName}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-mut dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-md border border-line bg-white/70 px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-900">
                    <Globe className="h-3 w-3 text-indigo-400" />
                    {form.target_audience || 'All Students'}
                  </span>
                  <span>&middot;</span>
                  <span>{form.category}</span>
                </div>
              </div>
            </div>
            <Badge>{form.status}</Badge>
          </div>

          <Input
            label="Headline / Title"
            id="ann-title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What's happening on campus?"
          />

          <Textarea
            label="Post Caption"
            id="ann-body"
            rows={3}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={`Write an announcement for ${form.target_audience || 'students'}...`}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink dark:text-slate-200">
                Attach Photo
              </span>
              {!imageSource && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-500/25"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Add Photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {imageSource ? (
              <AnnouncementImageAdjuster
                rawSource={imageSource}
                crop={imageCrop}
                onCropChange={handleCropChange}
                onChangeFile={() => fileInputRef.current?.click()}
                onRemove={handleClearImage}
              />
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${
                  isDraggingFile
                    ? 'border-indigo-400 bg-indigo-500/15'
                    : 'border-line bg-soft/40 hover:bg-soft/70 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                }`}
              >
                <ImagePlus className="mb-1.5 h-6 w-6 text-emerald-400" />
                <p className="text-xs font-semibold text-ink dark:text-slate-200">
                  Add photos to your announcement
                </p>
                <p className="mt-0.5 text-[11px] text-mut dark:text-slate-400">
                  Drag and drop an image here, or click to browse — drag & zoom to frame
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="State"
              id="ann-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Draft">Save as Draft</option>
              <option value="Published">Publish Immediately</option>
              <option value="Archived">Archive</option>
            </Select>
            <Select
              label="Category"
              id="ann-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              id="ann-date"
              type="date"
              value={form.ann_date}
              onChange={(e) => setForm({ ...form, ann_date: e.target.value })}
            />
          </div>

          <Input
            label="Audience"
            id="ann-audience"
            value={form.target_audience}
            onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
            placeholder="All Students"
          />

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
            />
            Pin announcement to top
          </label>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}