import { render, screen, fireEvent } from '@testing-library/react';
import NoteCard from '@/components/NoteCard';

describe('NoteCard', () => {
  it('renders note and triggers actions', () => {
    const note = {
      id: 1,
      title: 'Title',
      content: 'Content',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<NoteCard note={note} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});


