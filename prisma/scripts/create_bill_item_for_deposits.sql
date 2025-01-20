START TRANSACTION;

UPDATE bookings
    SET deposit = fee * 0.5
WHERE fee IS NOT NULL;

WITH FirstBill AS (
    SELECT
        bills.id AS bill_id,
        bills.booking_id,
        ROW_NUMBER() OVER (PARTITION BY bills.booking_id ORDER BY bills.due_date ASC) AS row_num
    FROM bills
)

INSERT INTO bill_items (bill_id, description, amount)
SELECT
    fb.bill_id AS bill_id,
    'Deposit kamar' AS description,
    b.deposit AS amount
FROM bookings b
JOIN FirstBill fb ON b.id = fb.booking_id
WHERE b.deposit IS NOT NULL
  AND fb.row_num = 1;

COMMIT;