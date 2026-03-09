import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link2,
  ImagePlus,
  Eye,
  Edit3,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { adminApi } from '../../lib/adminApi';

type BlogEditorProps = {
  value: string;
  onChange: (value: string) => void;
  blogId?: string;
  placeholder?: string;
  minHeight?: string;
};

export function BlogEditor({
  value,
  onChange,
  blogId,
  placeholder = 'Write your post in Markdown. Use the toolbar to format, or type markdown directly. Images stay exactly where you place them.',
  minHeight = '400px',
}: BlogEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const insertAtCursor = useCallback(
    (before: string, after = '') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = value.substring(start, end);
      const newText = value.substring(0, start) + before + sel + after + value.substring(end);
      onChange(newText);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + before.length + sel.length + after.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    [value, onChange]
  );

  const wrapSelection = useCallback(
    (before: string, after?: string) => {
      insertAtCursor(before, after ?? before);
    },
    [insertAtCursor]
  );

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await adminApi.uploadBlogImage(file, blogId);
        const alt = prompt('Alt text for image (optional):') || 'Image';
        insertAtCursor(`\n![${alt}](${url})\n`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, [blogId, insertAtCursor]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const file = Array.from(items).find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      const f = file.getAsFile();
      if (!f) return;
      setUploading(true);
      try {
        const url = await adminApi.uploadBlogImage(f, blogId);
        insertAtCursor(`\n![](${url})\n`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [blogId, insertAtCursor]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-black/40">
        <ToolbarButton onClick={() => wrapSelection('**', '**')} icon={Bold} title="Bold" />
        <ToolbarButton onClick={() => wrapSelection('*', '*')} icon={Italic} title="Italic" />
        <div className="w-px h-5 bg-white/20 mx-1" />
        <ToolbarButton onClick={() => wrapSelection('\n# ', '')} icon={Heading1} title="Heading 1" />
        <ToolbarButton onClick={() => wrapSelection('\n## ', '')} icon={Heading2} title="Heading 2" />
        <ToolbarButton onClick={() => wrapSelection('\n### ', '')} icon={Heading3} title="Heading 3" />
        <div className="w-px h-5 bg-white/20 mx-1" />
        <ToolbarButton onClick={() => wrapSelection('\n> ', '')} icon={Quote} title="Blockquote" />
        <ToolbarButton onClick={() => wrapSelection('`', '`')} icon={Code} title="Inline code" />
        <ToolbarButton
          onClick={() => {
            const url = prompt('URL:');
            const text = prompt('Link text:', 'link');
            if (url) insertAtCursor(`[${text || 'link'}](${url})`);
          }}
          icon={Link2}
          title="Link"
        />
        <div className="w-px h-5 bg-white/20 mx-1" />
        <ToolbarButton
          onClick={handleImageUpload}
          icon={uploading ? Loader2 : ImagePlus}
          title="Insert image"
          disabled={uploading}
          spin={uploading}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showPreview ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {showPreview ? <Edit3 size={14} /> : <Eye size={14} />}
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Editor / Preview */}
      <div className="flex" style={{ minHeight }}>
        <div
          className={`flex-1 ${showPreview ? 'hidden md:block md:w-1/2' : 'w-full'}`}
          style={{ minHeight }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full h-full min-h-[360px] p-4 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
        </div>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex-1 overflow-y-auto p-4 border-l border-white/10 bg-black/20 ${showPreview && !value ? 'hidden md:flex md:items-center' : ''}`}
            style={{ minHeight }}
          >
            {value ? (
              <div className="prose prose-invert prose-sm max-w-none blog-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nothing to preview yet.</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon: Icon,
  title,
  disabled,
  spin,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Icon size={16} className={spin ? 'animate-spin' : ''} />
    </button>
  );
}
