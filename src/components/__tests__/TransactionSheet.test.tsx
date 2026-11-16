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

async function renderSheet(kind: 'deposit' | 'withdrawal' | 'revalue') {
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

  it('ignores the Android back button while a request is pending', async () => {
    mockIsPending = true;
    const onClose = jest.fn();
    const view = await render(<TransactionSheet visible savingId="s1" kind="deposit" balanceAgorot={0} onClose={onClose} />);
    expect(view.root!.type).toBe("Modal");
    view.root!.props.onRequestClose();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('revalue mode previews a gain and records the difference', async () => {
    await renderSheet('revalue');
    await fireEvent.changeText(screen.getByLabelText('כמה שווה היום? (₪)'), '512.40');
    expect(screen.getByText(/רווח של/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'עדכון' }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({ savingId: 's1', kind: 'gain', amountAgorot: 1240 });
  });

  it('revalue mode previews a loss', async () => {
    await renderSheet('revalue');
    await fireEvent.changeText(screen.getByLabelText('כמה שווה היום? (₪)'), '470');
    expect(screen.getByText(/הפסד של/)).toBeTruthy();
  });

  it('revalue mode refuses the same value', async () => {
    await renderSheet('revalue');
    await fireEvent.changeText(screen.getByLabelText('כמה שווה היום? (₪)'), '500');
    await fireEvent.press(screen.getByRole('button', { name: 'עדכון' }));
    expect(screen.getByText('השווי זהה ליתרה הנוכחית')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('revalue mode shows the same-value error while typing', async () => {
    await renderSheet('revalue');
    await fireEvent.changeText(screen.getByLabelText('כמה שווה היום? (₪)'), '500');
    expect(screen.getByText('השווי זהה ליתרה הנוכחית')).toBeTruthy();
  });

  it('a backdated revaluation compares to the balance on that date', async () => {
    const txs = [
      { kind: 'opening', amount_agorot: 1000000, occurred_on: '2026-09-01' },
      { kind: 'deposit', amount_agorot: 100000, occurred_on: '2026-10-10' },
    ];
    await render(
      <TransactionSheet
        visible
        savingId="s1"
        kind="revalue"
        balanceAgorot={1100000}
        transactions={txs as never}
        initialDate="2026-09-30"
        onClose={jest.fn()}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText('כמה שווה היום? (₪)'), '10,500');
    await fireEvent.press(screen.getByRole('button', { name: 'עדכון' }));
    expect(mockMutate.mock.calls[0][0]).toMatchObject({ kind: 'gain', amountAgorot: 50000, occurredOn: '2026-09-30' });
  });
});
