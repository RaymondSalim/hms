import {
  DEPOSIT_STATUS_LABELS,
  getBillTypeLabel,
  getBookingStatusLabel,
  getDepositStatusLabel,
  getPaymentStatusLabel,
  getTransactionTypeLabel
} from '@/app/_lib/enum-translations';

describe('Enum Translation Functions', () => {
  describe('getDepositStatusLabel', () => {
    it('should translate UNPAID to Indonesian', () => {
      expect(getDepositStatusLabel('UNPAID')).toBe('Belum Dibayar');
    });

    it('should translate HELD to Indonesian', () => {
      expect(getDepositStatusLabel('HELD')).toBe('Ditahan');
    });

    it('should translate APPLIED to Indonesian', () => {
      expect(getDepositStatusLabel('APPLIED')).toBe('Digunakan');
    });

    it('should translate REFUNDED to Indonesian', () => {
      expect(getDepositStatusLabel('REFUNDED')).toBe('Dikembalikan');
    });

    it('should translate PARTIALLY_REFUNDED to Indonesian', () => {
      expect(getDepositStatusLabel('PARTIALLY_REFUNDED')).toBe('Dikembalikan Sebagian');
    });

    it('should translate FORFEITED to Indonesian', () => {
      expect(getDepositStatusLabel('FORFEITED')).toBe('Hangus');
    });

    it('should return original value for unknown status', () => {
      expect(getDepositStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });
  });

  describe('DEPOSIT_STATUS_LABELS constant', () => {
    it('should contain all expected deposit status mappings', () => {
      expect(DEPOSIT_STATUS_LABELS).toEqual({
        'UNPAID': 'Belum Dibayar',
        'HELD': 'Ditahan',
        'APPLIED': 'Digunakan',
        'REFUNDED': 'Dikembalikan',
        'PARTIALLY_REFUNDED': 'Dikembalikan Sebagian',
        'FORFEITED': 'Hangus'
      });
    });
  });

  describe('getBookingStatusLabel', () => {
    it('should translate PENDING to Indonesian', () => {
      expect(getBookingStatusLabel('PENDING')).toBe('Menunggu');
    });

    it('should translate CONFIRMED to Indonesian', () => {
      expect(getBookingStatusLabel('CONFIRMED')).toBe('Dikonfirmasi');
    });

    it('should return original value for unknown status', () => {
      expect(getBookingStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });
  });

  describe('getPaymentStatusLabel', () => {
    it('should translate COMPLETED to Indonesian', () => {
      expect(getPaymentStatusLabel('COMPLETED')).toBe('Selesai');
    });

    it('should translate FAILED to Indonesian', () => {
      expect(getPaymentStatusLabel('FAILED')).toBe('Gagal');
    });
  });

  describe('getTransactionTypeLabel', () => {
    it('should translate INCOME to Indonesian', () => {
      expect(getTransactionTypeLabel('INCOME')).toBe('Pendapatan');
    });

    it('should translate EXPENSE to Indonesian', () => {
      expect(getTransactionTypeLabel('EXPENSE')).toBe('Pengeluaran');
    });
  });

  describe('getBillTypeLabel', () => {
    it('should translate GENERATED to Indonesian', () => {
      expect(getBillTypeLabel('GENERATED')).toBe('Dibuat Otomatis');
    });

    it('should translate CREATED to Indonesian', () => {
      expect(getBillTypeLabel('CREATED')).toBe('Dibuat Manual');
    });
  });
});

