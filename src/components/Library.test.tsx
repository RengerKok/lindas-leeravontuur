import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { CardForm } from './Library';
import { db } from '../db';
beforeEach(async () => { await db.cards.clear(); HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); }; });
test('handmatig formulier bewaart een vraag en antwoord', async () => {
  const close = vi.fn(); render(<CardForm onClose={close} />);
  fireEvent.change(screen.getByLabelText('Vraag'), { target: { value: 'Wat is een flashcard?' } });
  fireEvent.change(screen.getByLabelText('Antwoord'), { target: { value: 'Een kaart met vraag en antwoord.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Flashcard bewaren' }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce()); expect((await db.cards.toArray())[0].question).toBe('Wat is een flashcard?');
});
test('ongeldige invoer sluit het formulier niet', async () => {
  const close = vi.fn(); render(<CardForm onClose={close} />);
  fireEvent.change(screen.getByLabelText('Vraag'), { target: { value: '   ' } }); fireEvent.change(screen.getByLabelText('Antwoord'), { target: { value: 'Antwoord' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Flashcard bewaren' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Vul een vraag'); expect(close).not.toHaveBeenCalled();
});