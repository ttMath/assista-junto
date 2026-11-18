import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Home } from '../src/pages/Home';
import { Api } from '../src/services/api';
import { room } from './fixtures';
describe('existing Home flow', () => {
  it('saves name with Enter, creates exactly one room and navigates in StrictMode', async () => {
    const api = new Api(''); vi.spyOn(api, 'createRoom').mockResolvedValue(room);
    render(<StrictMode><MemoryRouter><Routes><Route path="/" element={<Home api={api} />} /><Route path="/sala/:hash" element={<div>Sala aberta</div>} /></Routes></MemoryRouter></StrictMode>);
    const user = userEvent.setup(); await user.type(screen.getByPlaceholderText('Digite seu nome...'), '  João{Enter}');
    expect(localStorage.getItem('user_name')).toBe('João');
    await user.type(screen.getByLabelText('Nome da Sala'), 'Cinema'); await user.click(screen.getByRole('button', { name: 'CRIAR SALA' }));
    await screen.findByText('Sala aberta'); expect(api.createRoom).toHaveBeenCalledExactlyOnceWith({ name: 'Cinema', password: null });
  });
  it('automatically opens the modal for a saved name and displays server conflicts', async () => {
    localStorage.setItem('user_name', 'Dono'); const api = new Api(''); vi.spyOn(api, 'createRoom').mockRejectedValue(new Error('Você já possui uma sala ativa com este nome.'));
    render(<MemoryRouter><Home api={api} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nome da Sala'), { target: { value: 'Cinema' } });
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR SALA' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Você já possui uma sala ativa'));
  });
});
