BEGIN TRANSACTION;

UPDATE bills
SET description = CONCAT(
        'Tagihan untuk Bulan ',
        TO_CHAR(due_date, 'FMMonth YYYY')
                  )
WHERE
    description ILIKE 'Tagihan Untuk Bulan %';

COMMIT;