BEGIN TRANSACTION;

INSERT INTO transactions (location_id, category, amount, date, description, type, related_id)
SELECT
    r.location_id,                          -- Get location_id from related room
    'Biaya Sewa' AS category,               -- Static category
    p.amount,                               -- Amount from Payment
    p.payment_date AS date,                 -- Date from Payment
    CONCAT('Pemasukan untuk Pembayaran #', p.id) AS description,  -- Description with Payment ID
    'INCOME'::"TransactionType" AS type,    -- Type of transaction
    json_build_object('payment_id', p.id) AS related_id  -- Related ID stored as JSON
FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN rooms r ON b.room_id = r.id
WHERE NOT EXISTS (  -- Prevent duplicate entries
    SELECT 1 FROM transactions t
    WHERE t.related_id->>'payment_id' = p.id::text
);

-- SELECT * FROM transactions;

COMMIT;