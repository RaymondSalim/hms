INSERT INTO roomtypes (id, type, description)
VALUES (1, 'Standard Room', 'A comfortable room with essential amenities.'),
       (2, 'Deluxe Room', 'An upgraded room with additional space and features.'),
       (3, 'Suite', 'A spacious room with separate living and sleeping areas.'),
       (4, 'Presidential', 'An opulent suite with luxury furnishings and amenities.'),
       (5, 'Penthouse', 'An exclusive top-floor room with stunning views and premium services.')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"roomtypes"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roomtypes";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO durations (id, duration, month_count)
VALUES (1, '1 month', 1),
       (2, '3 months', 3),
       (3, '6 months', 6),
       (4, '12 months', 12)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"durations"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "durations";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO locations (id, name, address)
VALUES (1, 'Location 1', '134 Adams Avenue'),
       (2, 'Location 2', '25506 Adam Passage'),
       (3, 'Location 3', '73877 Wisozk Lake')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"locations"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "locations";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO roomtypedurations (id, room_type_id, duration_id, location_id, suggested_price)
VALUES (1, 1, 1, 1, 100.00),
       (2, 1, 2, 1, 280.00),
       (3, 2, 1, 2, 120.00)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roomtypedurations"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roomtypedurations";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO roomstatuses (id, status)
VALUES (1, 'Booked'),
       (2, 'Available'),
       (3, 'Under Construction')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roomstatuses"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roomstatuses";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO rooms (id, room_number, room_type_id, status_id, location_id)
VALUES (1, 'Room 1', 3, 2, 3),
       (2, 'Room 2', 4, 3, 3),
       (3, 'Room 3', 2, 2, 1),
       (4, 'Room 4', 2, 3, 3),
       (5, 'Room 5', 2, 2, 1),
       (6, 'Room 6', 3, 2, 3),
       (7, 'Room 7', 2, 3, 3),
       (8, 'Room 8', 5, 1, 1),
       (9, 'Room 9', 4, 3, 2),
       (10, 'Room 10', 5, 3, 1),
       (11, 'Room 11', 4, 2, 1),
       (12, 'Room 12', 4, 2, 2),
       (13, 'Room 13', 1, 2, 3),
       (14, 'Room 14', 5, 2, 1),
       (15, 'Room 15', 2, 3, 2),
       (16, 'Room 16', 1, 2, 3),
       (17, 'Room 17', 1, 1, 3),
       (18, 'Room 18', 3, 1, 3),
       (19, 'Room 19', 3, 1, 2),
       (20, 'Room 20', 1, 3, 3)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"rooms"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "rooms";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO bookingstatuses (id, status)
VALUES (1, 'Pending'),
       (2, 'Confirmed'),
       (3, 'Cancelled')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"bookingstatuses"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "bookingstatuses";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO tenants (id, name, email, phone, id_number)
VALUES ('ckabcde12345678901', 'Keith Strosin', 'Margarete.Walker27@yahoo.com', '350.479.1769', '3172060902010000'),
       ('ckabcde12345678902', 'Francisco Dicki', 'Jamarcus80@hotmail.com', '1-365-597-6200', '3172060902010000'),
       ('ckabcde12345678903', 'Doug Wilderman', 'Alyson_Walker@hotmail.com', '783-915-5859', '3172060902010000'),
       ('ckabcde12345678904', 'Dr. Carrie Gerhold', 'Kelsie67@gmail.com', '765.730.1696', '3172060902010000'),
       ('ckabcde12345678905', 'Aaron McDermott', 'Selmer_Schaefer@yahoo.com', '586.839.9770', '3172060902010000'),
       ('ckabcde12345678906', 'Dr. Kara Corwin', 'Casimer_Kuhlman78@gmail.com', '899-706-5170', '3172060902010000'),
       ('ckabcde12345678907', 'Carlos Larson PhD', 'Courtney72@gmail.com', '1-351-234-0885', '3172060902010000'),
       ('ckabcde12345678908', 'Debra Kreiger', 'Gwen.Mayert@yahoo.com', '1-383-442-8046', '3172060902010000'),
       ('ckabcde12345678909', 'Dominick Corkery', 'Harry74@hotmail.com', '1-827-353-7734', '3172060902010000'),
       ('ckabcde12345678910', 'June Lakin', 'Jonathan26@yahoo.com', '715.705.3226', '3172060902010000'),
       ('ckabcde12345678911', 'Harry Willms', 'Herminia57@yahoo.com', '574.525.7950', '3172060902010000'),
       ('ckabcde12345678912', 'Beatrice Gibson IV', 'Lauren_Rolfson99@gmail.com', '607-606-8263', '3172060902010000'),
       ('ckabcde12345678913', 'Dr. Benny Leffler DDS', 'Mariela_Cummings@yahoo.com', '326.793.2421', '3172060902010000'),
       ('ckabcde12345678914', 'Darnell Nicolas', 'Josue.Weber32@gmail.com', '369-700-8900', '3172060902010000'),
       ('ckabcde12345678915', 'Marian OHara PhD', 'Macy.Schultz@gmail.com', '(334) 341-9676', '3172060902010000'),
       ('ckabcde12345678916', 'Rickey Williamson', 'Jayden_Zemlak20@hotmail.com', '536-400-3288', '3172060902010000'),
       ('ckabcde12345678917', 'Leland Lindgren', 'Baby.Torp62@yahoo.com', '1-360-758-0400', '3172060902010000'),
       ('ckabcde12345678918', 'Johnathan Bailey', 'Tre20@gmail.com', '235-584-7230', '3172060902010000'),
       ('ckabcde12345678919', 'Mack Hackett', 'Jaida.Nolan@hotmail.com', '(576) 438-1344', '3172060902010000'),
       ('ckabcde12345678920', 'Sharon Mitchell', 'Kiara.Weimann35@yahoo.com', '1-396-336-2185', '3172060902010000'),
       ('ckabcde12345678921', 'Tiffany Gutmann', 'Nikki7@gmail.com', '(633) 477-7873', '3172060902010000'),
       ('ckabcde12345678922', 'Myra Hirthe', 'Shanel_Bednar62@hotmail.com', '(728) 607-4885', '3172060902010000'),
       ('ckabcde12345678923', 'Matthew Schinner', 'Louvenia39@gmail.com', '225.642.7751', '3172060902010000'),
       ('ckabcde12345678924', 'Johnny Blanda', 'Freda_Gleason@yahoo.com', '1-768-848-7850', '3172060902010000'),
       ('ckabcde12345678925', 'Doug Murazik', 'Monty23@hotmail.com', '1-869-826-8663', '3172060902010000'),
       ('ckabcde12345678926', 'Mrs. Edna Herman', 'Fletcher_Howe87@yahoo.com', '1-402-397-8309', '3172060902010000'),
       ('ckabcde12345678927', 'Mrs. Nettie Olson', 'Wilmer34@gmail.com', '1-277-581-0225', '3172060902010000'),
       ('ckabcde12345678928', 'Walter Cummings', 'Violette_Walker52@gmail.com', '(509) 875-3766', '3172060902010000'),
       ('ckabcde12345678929', 'Cory King', 'Axel.Veum@gmail.com', '543.990.9903', '3172060902010000'),
       ('ckabcde12345678930', 'Josephine Casper', 'Virginie42@yahoo.com', '503.613.1760', '3172060902010000'),
       ('ckabcde12345678931', 'Mable Kirlin', 'Robbie_Hansen9@hotmail.com', '1-709-319-1561', '3172060902010000'),
       ('ckabcde12345678932', 'Mrs. Paulette Sanford DDS', 'Moises_Raynor@hotmail.com', '778-915-7963', '3172060902010000'),
       ('ckabcde12345678933', 'Kenneth Bechtelar', 'Jeffrey1@hotmail.com', '950-594-2499', '3172060902010000'),
       ('ckabcde12345678934', 'Trevor Abshire', 'Michel29@yahoo.com', '276-648-3181', '3172060902010000'),
       ('ckabcde12345678935', 'Erin Labadie', 'Litzy_Conn@gmail.com', '268.328.1412', '3172060902010000'),
       ('ckabcde12345678936', 'Ebony Borer', 'Mercedes.Hintz@gmail.com', '494.927.1265', '3172060902010000'),
       ('ckabcde12345678937', 'Leroy Russel', 'Elyssa_Runolfsdottir@hotmail.com', '546.482.7515', '3172060902010000'),
       ('ckabcde12345678938', 'Rafael Robel', 'Reymundo.Gusikowski43@gmail.com', '893.279.4921', '3172060902010000'),
       ('ckabcde12345678939', 'Evelyn Towne', 'Letha_Gottlieb81@yahoo.com', '(833) 209-8206', '3172060902010000'),
       ('ckabcde12345678940', 'Darryl Jakubowski', 'Boris.Pacocha@yahoo.com', '(531) 809-2243', '3172060902010000'),
       ('ckabcde12345678941', 'Natasha Doyle', 'Henri_Mueller53@yahoo.com', '(785) 960-4987', '3172060902010000'),
       ('ckabcde12345678942', 'Roberta Waters', 'Orval0@gmail.com', '295-953-3957', '3172060902010000'),
       ('ckabcde12345678943', 'Leticia Bogan-Schmeler', 'Clyde.Rogahn@yahoo.com', '294.702.1169', '3172060902010000'),
       ('ckabcde12345678944', 'Glenn Ortiz', 'Estella86@gmail.com', '(699) 258-4736', '3172060902010000'),
       ('ckabcde12345678945', 'Steve Hansen', 'Trey.Orn@gmail.com', '1-899-653-7805', '3172060902010000'),
       ('ckabcde12345678946', 'Jan Herzog PhD', 'Kyleigh.Cronin-Prohaska25@hotmail.com', '1-857-319-8700', '3172060902010000'),
       ('ckabcde12345678947', 'Ray McDermott-Auer', 'Shanny31@yahoo.com', '1-385-203-8245', '3172060902010000'),
       ('ckabcde12345678948', 'Randy Veum Jr.', 'Sylvester_Murphy58@yahoo.com', '1-281-893-3320', '3172060902010000'),
       ('ckabcde12345678949', 'Dr. Dallas Bauch', 'Mike28@gmail.com', '631-221-1593', '3172060902010000'),
       ('ckabcde12345678950', 'Danny Hodkiewicz DVM', 'Meredith67@yahoo.com', '(667) 570-5886', '3172060902010000')
ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, tenant_id, room_id, start_date, end_date, duration_id, status_id, fee)
VALUES (1, 'ckabcde12345678936', 20, '2024-02-15', '2024-03-31', 1, 3, 460.00),
       (2, 'ckabcde12345678948', 6, '2024-01-30', '2024-04-30', 2, 2, 368.00),
       (3, 'ckabcde12345678950', 4, '2024-01-18', '2024-02-29', 1, 3, 398.00),
       (4, 'ckabcde12345678930', 17, '2024-01-25', '2024-04-30', 2, 2, 84.00),
       (5, 'ckabcde12345678941', 1, '2024-01-07', '2025-02-28', 4, 2, 114.00),
       (6, 'ckabcde12345678936', 18, '2024-01-04', '2024-02-29', 1, 1, 440.00),
       (7, 'ckabcde12345678940', 20, '2024-01-02', '2024-04-30', 2, 2, 202.00),
       (8, 'ckabcde12345678925', 12, '2024-01-19', '2024-02-29', 1, 3, 171.00),
       (9, 'ckabcde12345678934', 14, '2024-01-19', '2025-02-28', 4, 1, 209.00),
       (10, 'ckabcde12345678901', 10, '2024-01-04', '2024-02-29', 1, 3, 323.00),
       (11, 'ckabcde12345678946', 1, '2024-01-04', '2024-02-29', 1, 1, 68.00),
       (12, 'ckabcde12345678945', 20, '2024-01-10', '2024-04-30', 2, 3, 192.00),
       (13, 'ckabcde12345678905', 15, '2024-02-04', '2024-03-31', 1, 2, 203.00),
       (14, 'ckabcde12345678931', 14, '2024-01-05', '2024-02-29', 1, 2, 148.00),
       (15, 'ckabcde12345678901', 7, '2024-01-05', '2024-02-29', 1, 2, 248.00),
       (16, 'ckabcde12345678924', 18, '2024-01-08', '2024-02-29', 1, 1, 93.00),
       (17, 'ckabcde12345678922', 2, '2024-01-16', '2024-02-29', 1, 1, 69.00),
       (18, 'ckabcde12345678930', 7, '2024-01-02', '2024-02-29', 1, 3, 126.00),
       (19, 'ckabcde12345678909', 6, '2024-01-05', '2025-02-28', 4, 1, 99.00),
       (20, 'ckabcde12345678920', 8, '2024-02-04', '2024-03-31', 1, 2, 202.00),
       (21, 'ckabcde12345678910', 11, '2024-01-04', '2024-04-30', 2, 1, 110.00),
       (22, 'ckabcde12345678901', 6, '2024-01-15', '2024-02-29', 1, 3, 177.00),
       (23, 'ckabcde12345678912', 10, '2024-01-25', '2024-02-29', 1, 3, 149.00),
       (24, 'ckabcde12345678933', 5, '2024-01-17', '2024-02-29', 1, 3, 168.00),
       (25, 'ckabcde12345678901', 9, '2024-01-15', '2025-02-28', 4, 1, 400.00),
       (26, 'ckabcde12345678926', 14, '2024-02-04', '2025-03-31', 4, 1, 410.00),
       (27, 'ckabcde12345678904', 11, '2024-01-05', '2024-04-30', 2, 2, 69.00),
       (28, 'ckabcde12345678910', 18, '2024-01-03', '2025-02-28', 4, 3, 287.00),
       (29, 'ckabcde12345678925', 1, '2024-01-10', '2024-02-29', 1, 1, 70.00),
       (30, 'ckabcde12345678903', 12, '2024-01-15', '2024-04-30', 2, 2, 230.00),
       (31, 'ckabcde12345678919', 4, '2024-01-11', '2024-03-15', 1, 2, 150.00),
       (32, 'ckabcde12345678915', 3, '2024-02-01', '2024-03-01', 1, 1, 300.00),
       (33, 'ckabcde12345678911', 5, '2024-02-05', '2024-02-20', 1, 3, 200.00),
       (34, 'ckabcde12345678902', 7, '2024-01-15', '2024-02-20', 1, 2, 120.00),
       (35, 'ckabcde12345678916', 8, '2024-01-22', '2024-03-30', 2, 2, 175.00),
       (36, 'ckabcde12345678921', 2, '2024-01-29', '2024-04-29', 3, 1, 290.00),
       (37, 'ckabcde12345678937', 15, '2024-02-20', '2024-03-31', 1, 3, 125.00),
       (38, 'ckabcde12345678914', 20, '2024-01-31', '2024-03-15', 1, 2, 215.00),
       (39, 'ckabcde12345678912', 6, '2024-01-17', '2024-02-28', 1, 2, 180.00),
       (40, 'ckabcde12345678932', 10, '2024-02-08', '2024-04-05', 2, 1, 240.00),
       (41, 'ckabcde12345678940', 1, '2024-02-12', '2024-03-12', 1, 2, 130.00),
       (42, 'ckabcde12345678941', 4, '2024-01-15', '2024-04-15', 4, 3, 300.00),
       (43, 'ckabcde12345678917', 3, '2024-01-22', '2024-02-22', 1, 1, 65.00),
       (44, 'ckabcde12345678929', 5, '2024-02-09', '2024-03-01', 1, 2, 190.00),
       (45, 'ckabcde12345678923', 2, '2024-01-13', '2024-04-01', 2, 1, 175.00),
       (46, 'ckabcde12345678901', 7, '2024-02-05', '2024-03-05', 2, 3, 140.00),
       (47, 'ckabcde12345678920', 11, '2024-02-18', '2024-03-10', 1, 1, 120.00),
       (48, 'ckabcde12345678935', 18, '2024-01-25', '2024-04-30', 2, 2, 200.00),
       (49, 'ckabcde12345678939', 14, '2024-01-30', '2024-03-15', 1, 1, 110.00),
       (50, 'ckabcde12345678912', 9, '2024-02-20', '2024-03-20', 1, 2, 130.00)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"bookings"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "bookings";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO paymentstatuses (id, status)
VALUES (1, 'Pending'),
       (2, 'Completed'),
       (3, 'Failed')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"paymentstatuses"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "paymentstatuses";
-- Required to increment sequence as we are inserting values with the ID set


INSERT INTO roles (id, name, description)
VALUES (1, 'Admin', 'Administrator role'),
       (2, 'Guest', 'Guest role')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roles"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roles";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO "categories" (category)
VALUES ('Maintenance'),
       ('Utilities')
ON CONFLICT DO NOTHING;


INSERT INTO expenses (amount, description, date, category_id, location_id)
VALUES (100.50, 'Routine maintenance', '2024-01-15', 1, 1),
       (200.75, 'Electricity bill', '2024-01-16', 2, 2),
       (150.00, 'Water supply maintenance', '2024-01-17', 1, 1),
       (300.60, 'New equipment', '2024-01-18', 2, 2),
       (75.25, 'Office supplies', '2024-01-19', 1, 1),
       (120.40, 'Internet bill', '2024-01-20', 2, 2),
       (50.75, 'Routine maintenance', '2024-01-21', 1, 1),
       (180.90, 'Electricity bill', '2024-01-22', 2, 2),
       (170.00, 'Water supply maintenance', '2024-01-23', 1, 1),
       (60.30, 'New equipment', '2024-01-24', 2, 2),
       (210.25, 'Office supplies', '2024-01-25', 1, 1),
       (135.40, 'Internet bill', '2024-01-26', 2, 2),
       (145.75, 'Routine maintenance', '2024-01-27', 1, 1),
       (280.90, 'Electricity bill', '2024-01-28', 2, 2),
       (190.00, 'Water supply maintenance', '2024-01-29', 1, 1),
       (90.30, 'New equipment', '2024-01-30', 2, 2),
       (250.25, 'Office supplies', '2024-01-31', 1, 1),
       (95.40, 'Internet bill', '2024-02-01', 2, 2),
       (105.75, 'Routine maintenance', '2024-02-02', 1, 1),
       (230.90, 'Electricity bill', '2024-02-03', 2, 2),
       (270.00, 'Water supply maintenance', '2024-02-04', 1, 1),
       (115.30, 'New equipment', '2024-02-05', 2, 2),
       (320.25, 'Office supplies', '2024-02-06', 1, 1),
       (165.40, 'Internet bill', '2024-02-07', 2, 2),
       (115.75, 'Routine maintenance', '2024-02-08', 1, 1),
       (240.90, 'Electricity bill', '2024-02-09', 2, 2),
       (180.00, 'Water supply maintenance', '2024-02-10', 1, 1),
       (80.30, 'New equipment', '2024-02-11', 2, 2),
       (260.25, 'Office supplies', '2024-02-12', 1, 1),
       (135.40, 'Internet bill', '2024-02-13', 2, 2),
       (115.75, 'Routine maintenance', '2024-02-14', 1, 1),
       (250.90, 'Electricity bill', '2024-02-15', 2, 2),
       (170.00, 'Water supply maintenance', '2024-02-16', 1, 1),
       (100.30, 'New equipment', '2024-02-17', 2, 2),
       (220.25, 'Office supplies', '2024-02-18', 1, 1),
       (195.40, 'Internet bill', '2024-02-19', 2, 2),
       (145.75, 'Routine maintenance', '2024-02-20', 1, 1),
       (270.90, 'Electricity bill', '2024-02-21', 2, 2),
       (150.00, 'Water supply maintenance', '2024-02-22', 1, 1),
       (120.30, 'New equipment', '2024-02-23', 2, 2),
       (250.25, 'Office supplies', '2024-02-24', 1, 1),
       (115.40, 'Internet bill', '2024-02-25', 2, 2),
       (135.75, 'Routine maintenance', '2024-02-26', 1, 1),
       (260.90, 'Electricity bill', '2024-02-27', 2, 2),
       (190.00, 'Water supply maintenance', '2024-02-28', 1, 1),
       (110.30, 'New equipment', '2024-03-01', 2, 2),
       (240.25, 'Office supplies', '2024-03-02', 1, 1)
ON CONFLICT DO NOTHING;

INSERT INTO payments (id, booking_id, amount, payment_date, payment_proof, status_id)
VALUES (1, 1, 500000.00, '2024-01-15', 'proof1.jpg', 1),
       (2, 2, 600000.00, '2024-01-16', 'proof2.jpg', 2),
       (3, 3, 700000.00, '2024-01-17', 'proof3.jpg', 1),
       (4, 4, 800000.00, '2024-01-18', 'proof4.jpg', 3),
       (5, 5, 900000.00, '2024-01-19', 'proof5.jpg', 1),
       (6, 6, 1000000.00, '2024-01-20', 'proof6.jpg', 2),
       (7, 7, 1100000.00, '2024-01-21', 'proof7.jpg', 1),
       (8, 8, 1200000.00, '2024-01-22', 'proof8.jpg', 3),
       (9, 9, 1300000.00, '2024-01-23', 'proof9.jpg', 1),
       (10, 10, 1400000.00, '2024-01-24', 'proof10.jpg', 2),
       (11, 11, 1500000.00, '2024-01-25', 'proof11.jpg', 1),
       (12, 12, 1600000.00, '2024-01-26', 'proof12.jpg', 3),
       (13, 13, 1700000.00, '2024-01-27', 'proof13.jpg', 1),
       (14, 14, 1800000.00, '2024-01-28', 'proof14.jpg', 2),
       (15, 15, 1900000.00, '2024-01-29', 'proof15.jpg', 1),
       (16, 16, 2000000.00, '2024-01-30', 'proof16.jpg', 3),
       (17, 17, 2100000.00, '2024-01-31', 'proof17.jpg', 1),
       (18, 18, 2200000.00, '2024-02-01', 'proof18.jpg', 2),
       (19, 19, 2300000.00, '2024-02-02', 'proof19.jpg', 1),
       (20, 20, 2400000.00, '2024-02-03', 'proof20.jpg', 3),
       (21, 21, 2500000.00, '2024-02-04', 'proof21.jpg', 1),
       (22, 22, 2600000.00, '2024-02-05', 'proof22.jpg', 2),
       (23, 23, 2700000.00, '2024-02-06', 'proof23.jpg', 1),
       (24, 24, 2800000.00, '2024-02-07', 'proof24.jpg', 3),
       (25, 25, 2900000.00, '2024-02-08', 'proof25.jpg', 1),
       (26, 26, 3000000.00, '2024-02-09', 'proof26.jpg', 2),
       (27, 27, 3100000.00, '2024-02-10', 'proof27.jpg', 1),
       (28, 28, 3200000.00, '2024-02-11', 'proof28.jpg', 3),
       (29, 29, 3300000.00, '2024-02-12', 'proof29.jpg', 1),
       (30, 30, 3400000.00, '2024-02-13', 'proof30.jpg', 2),
       (31, 31, 3500000.00, '2024-02-14', 'proof31.jpg', 1),
       (32, 32, 3600000.00, '2024-02-15', 'proof32.jpg', 3),
       (33, 33, 3700000.00, '2024-02-16', 'proof33.jpg', 1),
       (34, 34, 3800000.00, '2024-02-17', 'proof34.jpg', 2),
       (35, 35, 3900000.00, '2024-02-18', 'proof35.jpg', 1),
       (36, 36, 4000000.00, '2024-02-19', 'proof36.jpg', 3),
       (37, 37, 4100000.00, '2024-02-20', 'proof37.jpg', 1),
       (38, 38, 4200000.00, '2024-02-21', 'proof38.jpg', 2),
       (39, 39, 4300000.00, '2024-02-22', 'proof39.jpg', 1),
       (40, 40, 4400000.00, '2024-02-23', 'proof40.jpg', 3),
       (41, 41, 4500000.00, '2024-02-24', 'proof41.jpg', 1),
       (42, 42, 4600000.00, '2024-02-25', 'proof42.jpg', 2),
       (43, 43, 4700000.00, '2024-02-26', 'proof43.jpg', 1),
       (44, 44, 4800000.00, '2024-02-27', 'proof44.jpg', 3),
       (45, 45, 4900000.00, '2024-02-28', 'proof45.jpg', 1),
       (46, 46, 5000000.00, '2024-03-01', 'proof46.jpg', 2),
       (47, 47, 5100000.00, '2024-03-02', 'proof47.jpg', 1),
       (48, 48, 5200000.00, '2024-03-03', 'proof48.jpg', 3),
       (49, 49, 5300000.00, '2024-03-04', 'proof49.jpg', 1),
       (50, 50, 5400000.00, '2024-03-05', 'proof50.jpg', 2)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"payments"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "payments";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO bills (id, booking_id, amount, description, due_date)
VALUES (1, 1, 4600000, 'Monthly rent for February', '2024-02-01'),
       (2, 2, 3680000, 'Monthly rent for February', '2024-02-01'),
       (3, 3, 3980000, 'Monthly rent for February', '2024-02-01'),
       (4, 4, 840000, 'Service charge for February', '2024-02-01'),
       (5, 5, 1140000, 'Monthly rent for January', '2024-01-01'),
       (6, 6, 4400000, 'Monthly rent for January', '2024-01-01'),
       (7, 7, 2020000, 'Monthly rent for January', '2024-01-01'),
       (8, 8, 1710000, 'Monthly rent for February', '2024-02-01'),
       (9, 9, 2090000, 'Monthly rent for February', '2024-02-01'),
       (10, 10, 3230000, 'Monthly rent for February', '2024-02-01'),
       (11, 11, 680000, 'Service charge for February', '2024-02-01'),
       (12, 12, 1920000, 'Monthly rent for January', '2024-01-01'),
       (13, 13, 2030000, 'Monthly rent for February', '2024-02-01'),
       (14, 14, 1480000, 'Monthly rent for January', '2024-01-01'),
       (15, 15, 2480000, 'Monthly rent for January', '2024-01-01'),
       (16, 16, 930000, 'Service charge for February', '2024-02-01'),
       (17, 17, 690000, 'Service charge for February', '2024-02-01'),
       (18, 18, 1260000, 'Monthly rent for January', '2024-01-01'),
       (19, 19, 990000, 'Service charge for February', '2024-02-01'),
       (20, 20, 2020000, 'Monthly rent for February', '2024-02-01'),
       (21, 21, 1100000, 'Service charge for February', '2024-02-01'),
       (22, 22, 1770000, 'Monthly rent for January', '2024-01-01'),
       (23, 23, 1490000, 'Monthly rent for February', '2024-02-01'),
       (24, 24, 1680000, 'Monthly rent for February', '2024-02-01'),
       (25, 25, 4000000, 'Monthly rent for January', '2024-01-01'),
       (26, 26, 4100000, 'Service charge for February', '2024-02-01'),
       (27, 27, 690000, 'Service charge for February', '2024-02-01'),
       (28, 28, 2870000, 'Monthly rent for January', '2024-01-01'),
       (29, 29, 700000, 'Service charge for February', '2024-02-01'),
       (30, 30, 2300000, 'Monthly rent for January', '2024-01-01'),
       (31, 31, 1500000, 'Monthly rent for January', '2024-01-01'),
       (32, 32, 3000000, 'Monthly rent for February', '2024-02-01'),
       (33, 33, 2000000, 'Monthly rent for February', '2024-02-01'),
       (34, 34, 1200000, 'Service charge for February', '2024-02-01'),
       (35, 35, 1750000, 'Service charge for February', '2024-02-01'),
       (36, 36, 2900000, 'Monthly rent for February', '2024-02-01'),
       (37, 37, 1250000, 'Monthly rent for February', '2024-02-01'),
       (38, 38, 2150000, 'Monthly rent for February', '2024-02-01'),
       (39, 39, 1800000, 'Monthly rent for February', '2024-02-01'),
       (40, 40, 2400000, 'Service charge for February', '2024-02-01'),
       (41, 41, 1300000, 'Monthly rent for February', '2024-02-01'),
       (42, 42, 3000000, 'Monthly rent for February', '2024-02-01'),
       (43, 43, 650000, 'Service charge for February', '2024-02-01'),
       (44, 44, 1900000, 'Monthly rent for February', '2024-02-01'),
       (45, 45, 1750000, 'Monthly rent for February', '2024-02-01'),
       (46, 46, 1400000, 'Service charge for February', '2024-02-01'),
       (47, 47, 1200000, 'Monthly rent for February', '2024-02-01'),
       (48, 48, 2000000, 'Service charge for February', '2024-02-01'),
       (49, 49, 1100000, 'Monthly rent for February', '2024-02-01'),
       (50, 50, 1300000, 'Monthly rent for February', '2024-02-01')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"bills"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "bills";
-- Required to increment sequence as we are inserting values with the ID set

INSERT INTO payment_bills (id, payment_id, bill_id, amount)
VALUES (1, 1, 1, 500000.00),
       (2, 2, 2, 600000.00),
       (3, 3, 3, 700000.00),
       (4, 4, 4, 800000.00),
       (5, 5, 5, 900000.00),
       (6, 6, 6, 1000000.00),
       (7, 7, 7, 1100000.00),
       (8, 8, 8, 1200000.00),
       (9, 9, 9, 1300000.00),
       (10, 10, 10, 1400000.00),
       (11, 11, 11, 1500000.00),
       (12, 12, 12, 1600000.00),
       (13, 13, 13, 1700000.00),
       (14, 14, 14, 1800000.00),
       (15, 15, 15, 1900000.00),
       (16, 16, 16, 2000000.00),
       (17, 17, 17, 2100000.00),
       (18, 18, 18, 2200000.00),
       (19, 19, 19, 2300000.00),
       (20, 20, 20, 2400000.00),
       (21, 21, 21, 2500000.00),
       (22, 22, 22, 2600000.00),
       (23, 23, 23, 2700000.00),
       (24, 24, 24, 2800000.00),
       (25, 25, 25, 2900000.00),
       (26, 26, 26, 3000000.00),
       (27, 27, 27, 3100000.00),
       (28, 28, 28, 3200000.00),
       (29, 29, 29, 3300000.00),
       (30, 30, 30, 3400000.00),
       (31, 31, 31, 3500000.00),
       (32, 32, 32, 3600000.00),
       (33, 33, 33, 3700000.00),
       (34, 34, 34, 3800000.00),
       (35, 35, 35, 3900000.00),
       (36, 36, 36, 4000000.00),
       (37, 37, 37, 4100000.00),
       (38, 38, 38, 4200000.00),
       (39, 39, 39, 4300000.00),
       (40, 40, 40, 4400000.00),
       (41, 41, 41, 4500000.00),
       (42, 42, 42, 4600000.00),
       (43, 43, 43, 4700000.00),
       (44, 44, 44, 4800000.00),
       (45, 45, 45, 4900000.00),
       (46, 46, 46, 5000000.00),
       (47, 47, 47, 5100000.00),
       (48, 48, 48, 5200000.00),
       (49, 49, 49, 5300000.00),
       (50, 50, 50, 5400000.00)
ON CONFLICT DO NOTHING;
-- Required to increment sequence as we are inserting values with the ID set
SELECT setval(pg_get_serial_sequence('"payment_bills"', 'id'), coalesce(max(payment_id) + 1, 1), false)
FROM "payment_bills";


INSERT INTO transactions (
    amount,
    description,
    date,
    category,
    location_id,
    type,
    "createdAt",
    "updatedAt"
)
SELECT
    round(random()::numeric * 10000, 2) AS amount,
    'Transaction ' || gs AS description,
    '2025-01-01'::date + ((random() * 364)::int) AS date,
    CASE WHEN random() < 0.5 THEN 'Salary' ELSE 'Rent' END AS category,
    4 AS location_id,
    CASE WHEN random() < 0.5 THEN 'INCOME'::"TransactionType" ELSE 'EXPENSE'::"TransactionType" END AS type,
    now() AS "createdAt",
    now() AS "updatedAt"
FROM generate_series(1,50) gs;