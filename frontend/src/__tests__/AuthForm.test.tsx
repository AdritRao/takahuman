import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from '@/components/AuthForm';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      post: jest.fn().mockResolvedValue({ data: { token: 't', user: { id: 1, email: 'a@b.com' } } })
    })
  }
}));

jest.spyOn(window.localStorage.__proto__, 'setItem');

describe('AuthForm', () => {
  it('submits and stores token', async () => {
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });
});


