"use client";

import { useState, useEffect } from 'react';

type NoteInput = {
  title: string;
  content: string;
};

export default function NoteEditor({
  initial,
  onCancel,
  onSave,
  saving
}: {
  initial?: NoteInput;
  onCancel: () => void;
  onSave: (data: NoteInput) => void;
  saving?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setContent(initial.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [initial]);

  return (
    <div className="card space-y-3">
      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Content</label>
        <textarea className="input h-28" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Start writing…" />
      </div>
      <div className="flex gap-2">
        <button className="btn" disabled={saving} onClick={() => onSave({ title, content })}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="px-4 py-2 text-sm rounded-md border border-neutral-800 hover:bg-neutral-800" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}


