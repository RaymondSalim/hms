-- Insert mock data for roomtypes
INSERT INTO roomtypes (id, type)
VALUES (1, 'Standard Room'),
       (2, 'Deluxe Room'),
       (3, 'Suite');

-- Insert mock data for roomstatuses
INSERT INTO roomstatuses (id, status)
VALUES (1, 'Available'),
       (2, 'Occupied'),
       (3, 'Under Maintenance');

-- Insert mock data for durations
INSERT INTO durations (id, duration, day_count)
VALUES (1, '1 day', 1),
       (2, '3 days', 3),
       (3, '7 days', 7);

-- Insert mock data for roomtypedurations
INSERT INTO roomtypedurations (id, room_type_id, duration_id, suggested_price)
VALUES (1, 1, 1, 100.00),
       (2, 1, 2, 280.00),
       (3, 2, 1, 120.00);

-- Insert mock data for rooms
INSERT INTO rooms (id, room_number, room_type_id, status_id, location_id)
VALUES (1, '101', 1, 1, 1),
       (2, '102', 1, 2, 1),
       (3, '201', 2, 1, 2),
       (4, '202', 2, 3, 2),
       (5, '301', 3, 1, 3);

-- Insert mock data for bookingstatuses
INSERT INTO bookingstatuses (id, status)
VALUES (1, 'Pending'),
       (2, 'Confirmed'),
       (3, 'Cancelled');

-- Insert mock data for tenants
INSERT INTO tenants (id, name, email, phone)
VALUES ('tenant1', 'John Doe', 'john.doe@example.com', '123-456-7890'),
       ('tenant2', 'Jane Smith', 'jane.smith@example.com', '234-567-8901'),
       ('tenant3', 'Robert Brown', 'robert.brown@example.com', '345-678-9012');

-- Insert mock data for bookings
INSERT INTO bookings (id, tenant_id, room_id, check_in, duration_id, status_id, fee)
VALUES (1, 'tenant1', 1, '2024-07-01', 1, 1, 100.00),
       (2, 'tenant2', 2, '2024-07-02', 2, 2, 280.00),
       (3, 'tenant3', 3, '2024-07-03', 3, 3, 700.00);

-- Insert mock data for paymentstatuses
INSERT INTO paymentstatuses (id, status)
VALUES (1, 'Pending'),
       (2, 'Completed'),
       (3, 'Failed');

-- Insert mock data for payments
INSERT INTO payments (id, booking_id, amount, payment_date, payment_proof, status_id)
VALUES (1, 1, 100.00, '2024-07-01', 'proof1.png', 2),
       (2, 2, 280.00, '2024-07-02', 'proof2.png', 2),
       (3, 3, 700.00, '2024-07-03', 'proof3.png', 2);

-- Insert mock data for roles
INSERT INTO roles (id, name, description)
VALUES (1, 'Admin', 'Administrator role'),
       (2, 'Guest', 'Guest role');
