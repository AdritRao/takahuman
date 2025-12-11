type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export default function NoteCard({
  note,
  onEdit,
  onDelete
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="card group">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{note.title}</h3>
          <p className="text-neutral-300 text-sm mt-1 whitespace-pre-wrap">{note.content}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
          <button className="text-xs text-neutral-300 hover:text-white" onClick={() => onEdit(note)}>Edit</button>
          <button className="text-xs text-red-400 hover:text-red-300" onClick={() => onDelete(note.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}


