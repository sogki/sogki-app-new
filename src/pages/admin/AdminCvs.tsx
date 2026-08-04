import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Mail, Trash2, Upload } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { renderPdfFirstPagePreview } from '../../lib/cvPreview';
import { useAdminToast } from '../../context/AdminToastContext';
import AdminPageLayout from './AdminPageLayout';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import {
  AdminCheckbox,
  AdminFileInput,
  AdminInput,
  AdminLabel,
  AdminTextarea,
} from '../../components/admin/AdminField';

type CvDocument = {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  public_url: string | null;
  signed_url?: string | null;
  mime_type: string;
  size: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const MAX_CV_UPLOAD_BYTES = 15 * 1024 * 1024;

export default function AdminCvs() {
  const { toast, confirm } = useAdminToast();
  const [rows, setRows] = useState<CvDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mailing, setMailing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminApi.cvs()) as CvDocument[];
      setRows(data ?? []);
      setSelectedId((curr) => {
        if (curr && data?.some((row) => row.id === curr)) return curr;
        return data?.[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CV documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error('Please pick a file first.');
      return;
    }
    if (file.size > MAX_CV_UPLOAD_BYTES) {
      toast.error('CV file is too large. Max size is 15 MB.');
      return;
    }
    setUploading(true);
    try {
      const preview = await renderPdfFirstPagePreview(file);
      await adminApi.uploadCv(file, {
        title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
        notes: notes.trim() || undefined,
        is_active: isActive,
        preview,
      });
      setTitle('');
      setNotes('');
      setFile(null);
      setIsActive(true);
      toast.success(preview ? 'CV uploaded with email preview.' : 'CV uploaded.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row: CvDocument) => {
    const ok = await confirm({
      title: `Delete “${row.title}”?`,
      description: 'This removes the file from private storage and cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await adminApi.deleteCv(row.id);
      toast.success('CV deleted.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleSendEmail = async (includeAll: boolean) => {
    if (!includeAll && !selected) {
      toast.error('Select a CV first.');
      return;
    }
    setMailing(true);
    try {
      await adminApi.sendCvEmail({
        includeAll,
        cvId: includeAll ? undefined : selected?.id,
      });
      toast.success(includeAll ? 'CV export email sent for all entries.' : 'CV export email sent.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Email export failed');
    } finally {
      setMailing(false);
    }
  };

  const previewUrl = selected?.signed_url ?? '';
  const isPdfPreview =
    selected?.mime_type === 'application/pdf' || selected?.file_name.toLowerCase().endsWith('.pdf');

  return (
    <AdminPageLayout
      title="CV Manager"
      titleJp="履歴書"
      description="Store private CV files, preview PDFs, and email exports to yourself."
      loading={loading}
      error={error}
      onRetry={load}
    >
      <div className="space-y-5">
        <AdminCard title="Upload CV">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <AdminLabel>Title</AdminLabel>
                <AdminInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior Frontend CV"
                />
              </div>
              <div>
                <AdminLabel>File</AdminLabel>
                <AdminFileInput
                  accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className="flex items-end pb-1">
                <AdminCheckbox
                  label="Mark as active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </div>
            </div>

            <div>
              <AdminLabel>Notes (optional)</AdminLabel>
              <AdminTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes for this CV."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
              <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT, RTF · max 15 MB · private storage</p>
              <AdminButton type="submit" variant="primary" disabled={uploading}>
                <Upload size={15} />
                {uploading ? 'Uploading...' : 'Upload CV'}
              </AdminButton>
            </div>
          </form>
        </AdminCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminCard
            title="Stored CVs"
            actions={
              <div className="flex gap-2">
                <AdminButton
                  size="sm"
                  variant="secondary"
                  disabled={mailing || !selected}
                  onClick={() => void handleSendEmail(false)}
                >
                  <Mail size={13} />
                  Email selected
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="primary"
                  disabled={mailing || rows.length === 0}
                  onClick={() => void handleSendEmail(true)}
                >
                  <Mail size={13} />
                  Email all
                </AdminButton>
              </div>
            }
          >
            {rows.length === 0 ? (
              <AdminEmptyState
                title="No CV documents yet"
                description="Upload a file above to get started."
              />
            ) : (
              <div className="space-y-2">
                {rows.map((row, idx) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(row.id);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                      selected?.id === row.id
                        ? 'border-purple-400/35 bg-purple-500/10'
                        : 'border-white/8 bg-black/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{row.title}</p>
                        <p className="truncate text-xs text-gray-500">{row.file_name}</p>
                        <p className="mt-1 text-[11px] text-gray-600">
                          {new Date(row.created_at).toLocaleString()} · {formatBytes(row.size)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            row.is_active
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-white/5 text-gray-500'
                          }`}
                        >
                          {row.is_active ? 'active' : 'inactive'}
                        </span>
                        <AdminButton
                          size="sm"
                          variant="danger"
                          disabled={busyId === row.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(row);
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </AdminButton>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard title="Preview">
            {!selected ? (
              <AdminEmptyState title="Select a CV to preview" />
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                  <p className="text-sm font-medium text-white">{selected.title}</p>
                  <p className="text-xs text-gray-500">{selected.file_name}</p>
                  {selected.notes && <p className="mt-2 text-xs text-gray-400">{selected.notes}</p>}
                  <a
                    href={selected.signed_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-3 inline-flex items-center gap-1.5 text-xs ${
                      selected.signed_url
                        ? 'text-purple-300 hover:text-purple-200'
                        : 'pointer-events-none text-gray-600'
                    }`}
                  >
                    <Eye size={12} />
                    {selected.signed_url ? 'Open signed preview link' : 'Signed link unavailable'}
                  </a>
                  <p className="mt-1 text-[11px] text-gray-600">
                    Files are private. Preview links expire after 1 hour.
                  </p>
                </div>

                {isPdfPreview && previewUrl ? (
                  <iframe
                    title="CV preview"
                    src={previewUrl}
                    className="h-[640px] w-full rounded-xl border border-white/10 bg-white"
                  />
                ) : (
                  <AdminEmptyState
                    title="Inline preview is for PDFs"
                    description="Open the signed link above for this file type."
                  />
                )}
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </AdminPageLayout>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}
