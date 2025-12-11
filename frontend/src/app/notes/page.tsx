"use client";

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import NoteCard from '@/components/NoteCard';
import NoteEditor from '@/components/NoteEditor';
import api from '@/lib/apiClient';
import { useAuthRequired } from '@/hooks/useAuth';

type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export default function NotesPage() {
  useAuthRequired();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notes');
      setNotes(res.data.notes);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(data: { title: string; content: string }) {
    setSaving(true);
    try {
      const res = await api.post('/notes', data);
      setNotes((prev) => [res.data.note, ...prev]);
      setCreating(false);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to create note');
    } finally {
      setSaving(false);
    }
  }

  async function update(note: Note, data: { title?: string; content?: string }) {
    setSaving(true);
    try {
      const res = await api.put(`/notes/${note.id}`, data);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? res.data.note : n)));
      setEditing(null);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to update note');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    const ok = confirm('Delete this note?');
    if (!ok) return;
    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to delete note');
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Your notes</h1>
          <button className="btn" onClick={() => { setCreating(true); setEditing(null); }}>New note</button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {creating && (
          <NoteEditor
            onCancel={() => setCreating(false)}
            onSave={(data) => create(data)}
            saving={saving}
          />
        )}
        {loading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {notes.map((note) => {
              const isEditing = editing?.id === note.id;
              if (isEditing) {
                return (
                  <NoteEditor
                    key={note.id}
                    initial={{ title: note.title, content: note.content }}
                    onCancel={() => setEditing(null)}
                    onSave={(data) => update(note, data)}
                    saving={saving}
                  />
                );
              }
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={(n) => { setCreating(false); setEditing(n); }}
                  onDelete={remove}
                />
              );
            })}
            {notes.length === 0 && <p className="text-neutral-400">No notes yet. Create your first one.</p>}
          </div>
        )}
      </main>
    </div>
  );
}


