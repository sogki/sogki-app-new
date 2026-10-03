import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, PenSquare, Send, Trash2, Users } from 'lucide-react';
import {
  adminApi,
  type MailIdentity,
  type MailMessage,
  type MailMessageSummary,
} from '../../lib/adminApi';
import { useAdminToast } from '../../context/AdminToastContext';
import AdminPageLayout from './AdminPageLayout';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import {
  AdminCheckbox,
  AdminInput,
  AdminLabel,
  AdminSelect,
  AdminTextarea,
} from '../../components/admin/AdminField';

type Tab = 'inbox' | 'sent' | 'compose' | 'identities';

export default function AdminMail() {
  const { toast, confirm } = useAdminToast();
  const [tab, setTab] = useState<Tab>('inbox');
  const [domain, setDomain] = useState('sogki.dev');
  const [identities, setIdentities] = useState<MailIdentity[]>([]);
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compose state
  const [composeIdentity, setComposeIdentity] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  // Identity form
  const [editId, setEditId] = useState<string | null>(null);
  const [localPart, setLocalPart] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sigHtml, setSigHtml] = useState('');
  const [sigText, setSigText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const activeIdentities = useMemo(
    () => identities.filter((i) => i.is_active),
    [identities]
  );

  const selectedIdentity = useMemo(
    () => identities.find((i) => i.id === composeIdentity) ?? null,
    [identities, composeIdentity]
  );

  const loadMetaAndIdentities = useCallback(async () => {
    const [meta, ids] = await Promise.all([adminApi.mailMeta(), adminApi.mailIdentities()]);
    setDomain(meta.domain);
    setIdentities(ids);
    if (!composeIdentity && ids[0]) setComposeIdentity(ids[0].id);
  }, [composeIdentity]);

  const loadMessages = useCallback(async (box: 'inbox' | 'sent') => {
    const list = await adminApi.mailMessages(box);
    setMessages(list);
    setSelectedId((curr) => {
      if (curr && list.some((m) => m.id === curr)) return curr;
      return list[0]?.id ?? null;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadMetaAndIdentities();
      if (tab === 'inbox' || tab === 'sent') {
        await loadMessages(tab);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load mail');
    } finally {
      setLoading(false);
    }
  }, [loadMetaAndIdentities, loadMessages, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId || (tab !== 'inbox' && tab !== 'sent')) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    void adminApi
      .mailMessage(selectedId)
      .then(async (msg) => {
        if (cancelled) return;
        setSelected(msg);
        if (tab === 'inbox' && !msg.is_read) {
          const updated = await adminApi.mailMarkRead(msg.id, true);
          setSelected(updated);
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, is_read: true } : m))
          );
        }
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Failed to open message');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, tab, toast]);

  const resetIdentityForm = () => {
    setEditId(null);
    setLocalPart('');
    setDisplayName('');
    setSigHtml('');
    setSigText('');
    setIsActive(true);
  };

  const startEditIdentity = (row: MailIdentity) => {
    setEditId(row.id);
    setLocalPart(row.local_part);
    setDisplayName(row.display_name);
    setSigHtml(row.signature_html);
    setSigText(row.signature_text);
    setIsActive(row.is_active);
    setTab('identities');
  };

  const saveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIdentity(true);
    try {
      const payload = {
        local_part: localPart.trim().toLowerCase(),
        display_name: displayName.trim(),
        signature_html: sigHtml,
        signature_text: sigText,
        is_active: isActive,
      };
      if (editId) {
        await adminApi.mailUpdateIdentity(editId, payload);
        toast.success('Identity updated');
      } else {
        await adminApi.mailCreateIdentity(payload);
        toast.success('Identity created');
      }
      resetIdentityForm();
      await loadMetaAndIdentities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingIdentity(false);
    }
  };

  const deleteIdentity = async (id: string) => {
    const ok = await confirm({
      title: 'Delete identity?',
      description: 'Messages stay in the inbox; this only removes the from-address.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await adminApi.mailDeleteIdentity(id);
      toast.success('Identity deleted');
      if (editId === id) resetIdentityForm();
      await loadMetaAndIdentities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const sendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeIdentity) {
      toast.error('Pick a from identity');
      return;
    }
    setSending(true);
    try {
      await adminApi.mailSend({
        identity_id: composeIdentity,
        to: composeTo,
        subject: composeSubject,
        text: composeBody,
        html: composeBody
          .split('\n')
          .map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
          .join(''),
        reply_to_message_id: replyToId,
      });
      toast.success('Email sent');
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setReplyToId(undefined);
      setTab('sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const replyTo = (msg: MailMessage) => {
    setComposeTo(msg.direction === 'inbound' ? msg.from_address : (msg.to_addresses[0] ?? ''));
    setComposeSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody('');
    setReplyToId(msg.id);
    if (msg.identity_id) setComposeIdentity(msg.identity_id);
    else if (activeIdentities[0]) setComposeIdentity(activeIdentities[0].id);
    setTab('compose');
  };

  const tabs: { id: Tab; label: string; icon: typeof Inbox }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'compose', label: 'Compose', icon: PenSquare },
    { id: 'identities', label: 'Identities', icon: Users },
  ];

  return (
    <AdminPageLayout
      title="Mail"
      description={`Resend-backed mail for @${domain}. Create identities, send with signatures, read inbound.`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? 'bg-purple-500/20 text-purple-100'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {(tab === 'inbox' || tab === 'sent') && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <AdminCard title={tab === 'inbox' ? 'Inbox' : 'Sent'}>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : !messages.length ? (
              <AdminEmptyState
                title="No messages"
                description={
                  tab === 'inbox'
                    ? 'Inbound mail appears after Resend MX + mail-inbound webhook are set up.'
                    : 'Outbound copies show here after you send.'
                }
              />
            ) : (
              <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
                {messages.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === m.id
                          ? 'bg-white/10 text-white'
                          : 'text-gray-300 hover:bg-white/5'
                      } ${!m.is_read && tab === 'inbox' ? 'font-medium' : ''}`}
                    >
                      <p className="truncate">{m.subject || '(no subject)'}</p>
                      <p className="truncate text-[11px] text-gray-500">
                        {tab === 'inbox' ? m.from_address : m.to_addresses?.join(', ')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="Message">
            {!selected ? (
              <p className="text-sm text-gray-500">Select a message.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-medium text-white">{selected.subject}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    From {selected.from_address} → {(selected.to_addresses || []).join(', ')}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <AdminButton variant="primary" onClick={() => replyTo(selected)}>
                    Reply
                  </AdminButton>
                </div>
                {selected.html_body ? (
                  <div
                    className="prose prose-invert max-w-none rounded-lg border border-white/10 bg-black/30 p-4 text-sm"
                    dangerouslySetInnerHTML={{ __html: selected.html_body }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-300">
                    {selected.text_body || '(empty body)'}
                  </pre>
                )}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {tab === 'compose' && (
        <AdminCard title={replyToId ? 'Reply' : 'Compose'}>
          {!activeIdentities.length ? (
            <AdminEmptyState
              title="No active identities"
              description="Create an identity (e.g. hello) under the Identities tab first."
            />
          ) : (
            <form onSubmit={(e) => void sendMail(e)} className="space-y-4">
              <div>
                <AdminLabel>From</AdminLabel>
                <AdminSelect
                  value={composeIdentity}
                  onChange={(e) => setComposeIdentity(e.target.value)}
                  required
                >
                  {activeIdentities.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.display_name ? `${i.display_name} <${i.email}>` : i.email}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div>
                <AdminLabel>To</AdminLabel>
                <AdminInput
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                />
              </div>
              <div>
                <AdminLabel>Subject</AdminLabel>
                <AdminInput
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                />
              </div>
              <div>
                <AdminLabel>Body</AdminLabel>
                <AdminTextarea
                  rows={10}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                />
              </div>
              {selectedIdentity && (selectedIdentity.signature_html || selectedIdentity.signature_text) && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-gray-400">
                  <p className="mb-1 font-medium uppercase tracking-wide text-gray-500">
                    Signature preview
                  </p>
                  {selectedIdentity.signature_html ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedIdentity.signature_html }} />
                  ) : (
                    <pre className="whitespace-pre-wrap">{selectedIdentity.signature_text}</pre>
                  )}
                </div>
              )}
              <AdminButton type="submit" variant="primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </AdminButton>
            </form>
          )}
        </AdminCard>
      )}

      {tab === 'identities' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard title={editId ? 'Edit identity' : 'New identity'}>
            <form onSubmit={(e) => void saveIdentity(e)} className="space-y-3">
              <div>
                <AdminLabel>Local part</AdminLabel>
                <div className="flex items-center gap-2">
                  <AdminInput
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                    placeholder="hello"
                    required
                    pattern="[a-z0-9][a-z0-9._+-]{0,63}"
                  />
                  <span className="shrink-0 text-sm text-gray-500">@{domain}</span>
                </div>
              </div>
              <div>
                <AdminLabel>Display name</AdminLabel>
                <AdminInput
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Sogki"
                />
              </div>
              <div>
                <AdminLabel>Signature (HTML)</AdminLabel>
                <AdminTextarea
                  rows={4}
                  value={sigHtml}
                  onChange={(e) => setSigHtml(e.target.value)}
                  placeholder="<p>Best,<br/>Jay</p>"
                />
              </div>
              <div>
                <AdminLabel>Signature (plain text)</AdminLabel>
                <AdminTextarea
                  rows={3}
                  value={sigText}
                  onChange={(e) => setSigText(e.target.value)}
                  placeholder={'Best,\nJay'}
                />
              </div>
              <AdminCheckbox
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <div className="flex flex-wrap gap-2">
                <AdminButton type="submit" variant="primary" disabled={savingIdentity}>
                  {savingIdentity ? 'Saving…' : editId ? 'Update' : 'Create'}
                </AdminButton>
                {editId && (
                  <AdminButton type="button" variant="ghost" onClick={resetIdentityForm}>
                    Cancel edit
                  </AdminButton>
                )}
              </div>
            </form>
          </AdminCard>

          <AdminCard title="Your addresses">
            {!identities.length ? (
              <AdminEmptyState
                title="No identities yet"
                description={`Create hello@${domain} (or any local part) to send from.`}
              />
            ) : (
              <ul className="space-y-2">
                {identities.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {row.display_name || row.local_part}{' '}
                        <span className="text-gray-500">&lt;{row.email}&gt;</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {row.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <AdminButton type="button" variant="ghost" onClick={() => startEditIdentity(row)}>
                        Edit
                      </AdminButton>
                      <button
                        type="button"
                        onClick={() => void deleteIdentity(row.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-rose-300"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      )}
    </AdminPageLayout>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
