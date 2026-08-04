import { useState } from 'react';
import { Pin, Trash2 } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminTextarea } from '../AdminField';
import type { LifeNote } from '../../../lib/lifeDashboard/types';

type LifeNotesProps = {
  notes: LifeNote[];
  onChange: (notes: LifeNote[]) => void;
  expanded?: boolean;
};

export default function LifeNotes({ notes, onChange, expanded }: LifeNotesProps) {
  const [draft, setDraft] = useState('');

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  const addNote = () => {
    const body = draft.trim();
    if (!body) return;
    const note: LifeNote = {
      id: `note-${Date.now()}`,
      title: body.slice(0, 40) + (body.length > 40 ? '…' : ''),
      body,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    onChange([note, ...notes]);
    setDraft('');
  };

  const togglePin = (id: string) => {
    onChange(
      notes.map((n) =>
        n.id === id
          ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const removeNote = (id: string) => {
    onChange(notes.filter((n) => n.id !== id));
  };

  return (
    <AdminCard id="widget-notes" title="Notes" className="h-full">
      <div className={`space-y-3 ${expanded ? 'max-w-2xl' : ''}`}>
        <div className="space-y-2">
          <AdminTextarea
            rows={expanded ? 5 : 3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Quick note…"
          />
          <div className="flex justify-end">
            <AdminButton size="sm" variant="primary" onClick={addNote} disabled={!draft.trim()}>
              Add note
            </AdminButton>
          </div>
        </div>

        <div className="space-y-2">
          {[...pinned, ...rest].map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-200 leading-relaxed">{note.body}</p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => togglePin(note.id)}
                    className={`rounded-md p-1.5 ${
                      note.pinned ? 'text-purple-300' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    aria-label={note.pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    className="rounded-md p-1.5 text-gray-500 hover:text-red-300"
                    aria-label="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!notes.length && (
            <p className="text-xs text-gray-500">No notes yet — add one above.</p>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
