/**
 * Enum translation utilities for displaying Indonesian text in the UI
 * while keeping the database values in English
 */

export const DEPOSIT_STATUS_LABELS: { [key: string]: string } = {
  'UNPAID': 'Belum Dibayar',
  'HELD': 'Ditahan',
  'APPLIED': 'Digunakan',
  'REFUNDED': 'Dikembalikan',
  'PARTIALLY_REFUNDED': 'Dikembalikan Sebagian',
  'FORFEITED': 'Hangus'
};

export const BOOKING_STATUS_LABELS: { [key: string]: string } = {
  'PENDING': 'Menunggu',
  'CONFIRMED': 'Dikonfirmasi',
  'CHECKED_IN': 'Check In',
  'CHECKED_OUT': 'Check Out',
  'CANCELLED': 'Dibatalkan',
  'COMPLETED': 'Selesai'
};

export const PAYMENT_STATUS_LABELS: { [key: string]: string } = {
  'PENDING': 'Menunggu',
  'COMPLETED': 'Selesai',
  'FAILED': 'Gagal',
  'CANCELLED': 'Dibatalkan'
};

export const TRANSACTION_TYPE_LABELS: { [key: string]: string } = {
  'INCOME': 'Pendapatan',
  'EXPENSE': 'Pengeluaran'
};

export const BILL_TYPE_LABELS: { [key: string]: string } = {
  'GENERATED': 'Dibuat Otomatis',
  'CREATED': 'Dibuat Manual'
};

/**
 * Get the Indonesian label for a deposit status
 */
export function getDepositStatusLabel(status: string): string {
  return DEPOSIT_STATUS_LABELS[status] || status;
}

/**
 * Get the Indonesian label for a booking status
 */
export function getBookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status] || status;
}

/**
 * Get the Indonesian label for a payment status
 */
export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] || status;
}

/**
 * Get the Indonesian label for a transaction type
 */
export function getTransactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type] || type;
}

/**
 * Get the Indonesian label for a bill type
 */
export function getBillTypeLabel(type: string): string {
  return BILL_TYPE_LABELS[type] || type;
}

/**
 * Generic function to get Indonesian label for any enum
 */
export function getEnumLabel(enumType: string, value: string): string {
  const labelMaps: { [key: string]: { [key: string]: string } } = {
    'DepositStatus': DEPOSIT_STATUS_LABELS,
    'BookingStatus': BOOKING_STATUS_LABELS,
    'PaymentStatus': PAYMENT_STATUS_LABELS,
    'TransactionType': TRANSACTION_TYPE_LABELS,
    'BillType': BILL_TYPE_LABELS,
  };
  
  return labelMaps[enumType]?.[value] || value;
}

