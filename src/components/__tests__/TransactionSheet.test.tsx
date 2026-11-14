import { fireEvent, render, screen } from '@testing-library/react-native';

import { TransactionSheet } from '../TransactionSheet';

const mockMutate = jest.fn();
let mockIsPending = false;
const mockReset = jest.fn();

jest.mock('@/data/transactions', () => ({
  useAddTransaction: () => ({ mutate: mockMutate, isPending: mockIsPending, error: null, reset: mockReset }),
}));

beforeEach(() => {
  mockMutate.mockClear();
  mockIsPending = false;
});

async function renderSheet(kind: 'deposit' | 'withdrawal') {
  await render(<TransactionSheet visible savingId="s1" kind={kind} balanceAgorot={50000} onClose={jest.fn()} />);
}

describe('TransactionSheet', () => {
  it('blocks a withdrawal larger than the balance without calling the server', async () => {
    await renderSheet('withdrawal');
    await fireEvent.changeText(screen.getByLabelText('סכום (₪)'), '600');
    await fireEvent.press(screen.getByRole('button', { name: 'משוך' }));
    expect(screen.getByText('אין מספיק כסף בחיסכון')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('sends a valid deposit in agorot with today as the date', async () => {
    await renderSheet('deposit');
    await fireEvent.changeText(screen.getByLabelText('סכום (₪)'), '1,250.5');
    await fireEvent.press(screen.getByRole('button', { name: 'הוסף' }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      savingId: 's1',
      kind: 'deposit',
      amountAgorot: 125050,
      note: null,
    });
    expect(mockMutate.mock.calls[0][0].occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not submit again while a request is pending', async () => {
    mockIsPending = true;
    await renderSheet('deposit');
    await fireEvent.changeText(screen.getByLabelText('סכום (₪)'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'הוסף' }));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
