import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CvRow = {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  preview_path: string | null;
  mime_type: string;
  size: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  signed_url?: string | null;
  preview_cid?: string | null;
};

type ResendAttachment = {
  filename: string;
  content: string;
  content_type?: string;
  content_id?: string;
};

const BUCKET_CV_DOCUMENTS = 'cv-documents';
const EMAIL_LINK_EXPIRES_IN = 60 * 60 * 24 * 7;
const MAX_ATTACH_BYTES = 12 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    return await handleEmail(req);
  } catch (err) {
    console.error('admin-cv-email error:', err);
    return json({ error: errorMessage(err) }, 500);
  }
});

async function handleEmail(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keys } = await supabase
    .from('keys')
    .select('key, value')
    .in('key', [
      'ADMIN_DISCORD_USER_ID',
      'ADMIN_JWT_SECRET',
      'ADMIN_DEV_TOKEN',
      'RESEND_API_KEY',
      'ADMIN_EMAIL_TO',
      'ADMIN_EMAIL_FROM',
    ]);

  const keyMap = Object.fromEntries((keys ?? []).map((row) => [row.key, row.value]));
  const allowedUserId = keyMap['ADMIN_DISCORD_USER_ID'];
  const jwtSecret = keyMap['ADMIN_JWT_SECRET'];
  const devToken = keyMap['ADMIN_DEV_TOKEN'];

  const origin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(origin);
  const validDevToken = devToken && devToken.length >= 32 && devToken !== 'REPLACE_ME';
  if (isLocalhost && validDevToken && token === devToken) {
    // Local dev bypass.
  } else {
    if (!allowedUserId || !jwtSecret) return json({ error: 'Config error' }, 500);
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);
      if ((payload.sub as string) !== allowedUserId) return json({ error: 'Unauthorized' }, 401);
    } catch {
      return json({ error: 'Invalid token' }, 401);
    }
  }

  const resendKey = keyMap['RESEND_API_KEY'];
  const emailTo = keyMap['ADMIN_EMAIL_TO'];
  const emailFrom = keyMap['ADMIN_EMAIL_FROM'] || 'Sogki Admin <onboarding@resend.dev>';
  if (!resendKey || resendKey === 'REPLACE_ME' || !emailTo) {
    return json({ error: 'Missing RESEND_API_KEY or ADMIN_EMAIL_TO in keys table.' }, 400);
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const selectedId = typeof body.cvId === 'string' ? body.cvId : null;
  const includeAll = Boolean(body.includeAll);
  const customMessage = typeof body.message === 'string' ? body.message.trim() : '';

  let query = supabase
    .from('cv_documents')
    .select('id, title, file_name, file_path, preview_path, mime_type, size, notes, is_active, created_at')
    .order('created_at', { ascending: false });
  if (selectedId && !includeAll) query = query.eq('id', selectedId);
  const { data: rows, error: rowsErr } = await query;
  if (rowsErr) return json({ error: rowsErr.message }, 400);
  if (!rows || rows.length === 0) return json({ error: 'No CV documents found to export.' }, 404);

  const attachments: ResendAttachment[] = [];
  const cvRows: CvRow[] = [];

  for (const row of rows as CvRow[]) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET_CV_DOCUMENTS)
      .createSignedUrl(row.file_path, EMAIL_LINK_EXPIRES_IN);

    const enriched: CvRow = {
      ...row,
      signed_url: signErr ? null : signed?.signedUrl ?? null,
      preview_cid: null,
    };

    // Attach original CV file
    try {
      const { data: fileBlob, error: downloadErr } = await supabase.storage
        .from(BUCKET_CV_DOCUMENTS)
        .download(row.file_path);
      if (!downloadErr && fileBlob) {
        const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());
        if (fileBytes.byteLength > 0 && fileBytes.byteLength <= MAX_ATTACH_BYTES) {
          attachments.push({
            filename: sanitizeFilename(row.file_name),
            content: encodeBase64(fileBytes),
            content_type: row.mime_type || 'application/octet-stream',
          });
        }
      }
    } catch (err) {
      console.error('CV file download failed:', row.id, err);
    }

    // Attach stored page-1 preview as inline CID image (generated at upload time in browser)
    if (row.preview_path) {
      try {
        const { data: previewBlob, error: previewErr } = await supabase.storage
          .from(BUCKET_CV_DOCUMENTS)
          .download(row.preview_path);
        if (!previewErr && previewBlob) {
          const previewBytes = new Uint8Array(await previewBlob.arrayBuffer());
          if (previewBytes.byteLength > 0) {
            const cid = `cv-preview-${row.id.replace(/-/g, '').slice(0, 24)}`;
            attachments.push({
              filename: `preview-${sanitizeFilename(row.title)}.png`,
              content: encodeBase64(previewBytes),
              content_type: 'image/png',
              content_id: cid,
            });
            enriched.preview_cid = cid;
          }
        }
      } catch (err) {
        console.error('CV preview download failed:', row.id, err);
      }
    }

    cvRows.push(enriched);
  }

  const isSingle = Boolean(selectedId && !includeAll);
  const subject = isSingle
    ? `CV export · ${cvRows[0]?.title ?? '1 document'}`
    : `CV export · ${cvRows.length} documents`;

  const html = buildEmailHtml({ rows: cvRows, customMessage, isSingle });
  const text = buildEmailText({ rows: cvRows, customMessage, isSingle });

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [emailTo],
      subject,
      html,
      text,
      attachments,
    }),
  });

  const resendBody = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    return json({ error: `Resend failed: ${JSON.stringify(resendBody)}` }, 502);
  }

  return json({
    ok: true,
    sent_to: emailTo,
    count: cvRows.length,
    attachments: attachments.filter((a) => !a.content_id).length,
    previews: attachments.filter((a) => a.content_id).length,
  });
}

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 120) || 'document';
}

function isPdf(row: CvRow) {
  return row.mime_type === 'application/pdf' || row.file_name.toLowerCase().endsWith('.pdf');
}

function buildEmailHtml(opts: {
  rows: CvRow[];
  customMessage: string;
  isSingle: boolean;
}) {
  const { rows, customMessage, isSingle } = opts;
  const generatedAt = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const cards = rows
    .map((row, index) => {
      const statusColor = row.is_active ? '#047857' : '#4b5563';
      const statusBg = row.is_active ? '#d1fae5' : '#e5e7eb';
      const statusLabel = row.is_active ? 'Active' : 'Inactive';
      const notesBlock = row.notes
        ? `
          <tr>
            <td style="padding:18px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Notes</p>
                    <p style="margin:0;color:#1e293b;font-size:14px;line-height:1.55;">${escapeHtml(row.notes)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : '';

      const previewBlock = row.preview_cid
        ? `
          <tr>
            <td align="center" style="padding:18px 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;overflow:hidden;">
                <tr>
                  <td align="center" style="padding:10px;background:#f1f5f9;">
                    <img
                      src="cid:${escapeAttr(row.preview_cid)}"
                      alt="Preview of ${escapeAttr(row.title)}"
                      width="460"
                      style="display:block;width:100%;max-width:460px;height:auto;border:0;border-radius:8px;"
                    />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 12px 10px;background:#f8fafc;">
                    <p style="margin:0;color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Page 1 preview</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : `
          <tr>
            <td align="center" style="padding:18px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;">
                <tr>
                  <td align="center" style="padding:28px 16px;">
                    <p style="margin:0;color:#334155;font-size:14px;font-weight:600;">
                      ${isPdf(row) ? 'PDF attached to this email' : 'File attached to this email'}
                    </p>
                    <p style="margin:6px 0 0;color:#64748b;font-size:12px;">
                      ${isPdf(row) ? 'Re-upload this CV to generate an inline page preview' : 'Inline preview is available for PDFs'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;

      const openBlock = row.signed_url
        ? `
          <tr>
            <td align="center" style="padding:22px 24px 8px;">
              <a href="${escapeAttr(row.signed_url)}" target="_blank"
                 style="display:inline-block;padding:12px 28px;border-radius:999px;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Open CV
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 8px;">
              <p style="margin:0;color:#64748b;font-size:12px;">File is also attached · link expires in 7 days</p>
            </td>
          </tr>
        `
        : `
          <tr>
            <td align="center" style="padding:22px 24px 8px;">
              <p style="margin:0;color:#64748b;font-size:13px;">See the attached file in this email</p>
            </td>
          </tr>
        `;

      return `
        <tr>
          <td style="padding:${index === 0 ? '0' : '16px'} 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
              <tr>
                <td style="padding:22px 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:18px;font-weight:700;color:#0f172a;padding-right:12px;line-height:1.3;">
                        ${escapeHtml(row.title)}
                      </td>
                      <td align="right" valign="middle" style="white-space:nowrap;">
                        <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${statusBg};color:${statusColor};font-size:12px;font-weight:700;">
                          ${statusLabel}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:14px 24px 0;">
                  <p style="margin:0;color:#334155;font-size:14px;font-weight:600;line-height:1.4;">
                    ${escapeHtml(row.file_name)}
                  </p>
                  <p style="margin:6px 0 0;color:#475569;font-size:13px;line-height:1.4;">
                    ${escapeHtml(prettyMime(row.mime_type))} · ${formatBytes(row.size)}
                  </p>
                  <p style="margin:6px 0 0;color:#64748b;font-size:12px;">
                    Uploaded ${escapeHtml(new Date(row.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }))}
                  </p>
                </td>
              </tr>
              ${previewBlock}
              ${openBlock}
              ${notesBlock}
              <tr>
                <td style="padding:0 0 8px;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  const messageBlock = customMessage
    ? `
      <tr>
        <td style="padding:0 0 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;background:#faf5ff;border:1px solid #e9d5ff;">
            <tr>
              <td align="center" style="padding:16px 18px;">
                <p style="margin:0 0 6px;color:#7e22ce;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Message</p>
                <p style="margin:0;color:#3b0764;font-size:14px;line-height:1.55;">${escapeHtml(customMessage)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV Export</title>
</head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;">
          <tr>
            <td align="center" style="padding:0 0 22px;">
              <p style="margin:0;color:#6d28d9;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Sogki Admin</p>
              <p style="margin:10px 0 0;color:#0f172a;font-size:24px;font-weight:700;letter-spacing:-0.02em;">
                ${isSingle ? 'CV export' : `${rows.length} CV documents`}
              </p>
              <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.5;">
                ${isSingle ? 'Preview, attachment, and secure link included below.' : 'Each CV includes a preview when available, plus file attachments.'}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;background:#111827;">
                <tr>
                  <td width="50%" align="center" style="padding:18px 12px;border-right:1px solid #374151;">
                    <p style="margin:0;color:#c4b5fd;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Generated</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:15px;font-weight:600;">${escapeHtml(generatedAt)}</p>
                  </td>
                  <td width="50%" align="center" style="padding:18px 12px;">
                    <p style="margin:0;color:#c4b5fd;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Documents</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:15px;font-weight:600;">${rows.length}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${messageBlock}
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Sent from your Sogki admin panel</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function prettyMime(mime: string) {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    'application/rtf': 'RTF',
    'text/rtf': 'RTF',
  };
  return map[mime] ?? mime;
}

function buildEmailText(opts: {
  rows: CvRow[];
  customMessage: string;
  isSingle: boolean;
}) {
  const { rows, customMessage, isSingle } = opts;
  const lines = [
    'Sogki Admin — CV Export',
    isSingle ? 'Single CV export' : `Export of ${rows.length} CV documents`,
    `Generated: ${new Date().toLocaleString('en-GB')}`,
    'Files are attached to this email.',
    '',
  ];
  if (customMessage) lines.push(`Message: ${customMessage}`, '');
  for (const row of rows) {
    lines.push(
      `• ${row.title} (${row.is_active ? 'active' : 'inactive'})`,
      `  File: ${row.file_name} · ${row.mime_type} · ${formatBytes(row.size)}`,
      `  URL: ${row.signed_url ?? '(see attachment)'}`,
      `  Uploaded: ${new Date(row.created_at).toLocaleString('en-GB')}`
    );
    if (row.notes) lines.push(`  Notes: ${row.notes}`);
    lines.push('');
  }
  return lines.join('\n');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorMessage(err: unknown) {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Unknown admin-cv-email error';
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
