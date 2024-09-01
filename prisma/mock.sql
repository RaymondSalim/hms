INSERT INTO roomtypes (id, type)
VALUES (1, 'Standard Room'),
       (2, 'Deluxe Room'),
       (3, 'Suite'),
       (4, 'Presidential'),
       (5, 'Penthouse')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roomtypes"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roomtypes"; -- Required to increment sequence as we are inserting values with the ID set


INSERT INTO durations (id, duration, day_count, month_count)
VALUES (1, '1 month', NULL, 1),
       (2, '3 months', NULL, 3),
       (3, '6 months', NULL, 6),
       (4, '12 months', NULL, 12)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"durations"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "durations"; -- Required to increment sequence as we are inserting values with the ID set

INSERT INTO locations (id, name, address)
VALUES (1, 'Location 1', '134 Adams Avenue'),
       (2, 'Location 2', '25506 Adam Passage'),
       (3, 'Location 3', '73877 Wisozk Lake')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"locations"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "locations"; -- Required to increment sequence as we are inserting values with the ID set

INSERT INTO roomtypedurations (id, room_type_id, duration_id, location_id, suggested_price)
VALUES (1, 1, 1, 1, 100.00),
       (2, 1, 2, 1, 280.00),
       (3, 2, 1, 2, 120.00)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roomtypedurations"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roomtypedurations"; -- Required to increment sequence as we are inserting values with the ID set

INSERT INTO roomstatuses (id, status)
VALUES (1, 'Booked'),
       (2, 'Available'),
       (3, 'Under Construction')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roomstatuses"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roomstatuses"; -- Required to increment sequence as we are inserting values with the ID set

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
FROM "rooms"; -- Required to increment sequence as we are inserting values with the ID set

INSERT INTO bookingstatuses (id, status)
VALUES (1, 'Pending'),
       (2, 'Confirmed'),
       (3, 'Cancelled')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"bookingstatuses"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "bookingstatuses"; -- Required to increment sequence as we are inserting values with the ID set

INSERT INTO tenants (id, name, email, phone)
VALUES ('ckabcde12345678901', 'Keith Strosin', 'Margarete.Walker27@yahoo.com', '350.479.1769'),
       ('ckabcde12345678902', 'Francisco Dicki', 'Jamarcus80@hotmail.com', '1-365-597-6200'),
       ('ckabcde12345678903', 'Doug Wilderman', 'Alyson_Walker@hotmail.com', '783-915-5859'),
       ('ckabcde12345678904', 'Dr. Carrie Gerhold', 'Kelsie67@gmail.com', '765.730.1696'),
       ('ckabcde12345678905', 'Aaron McDermott', 'Selmer_Schaefer@yahoo.com', '586.839.9770'),
       ('ckabcde12345678906', 'Dr. Kara Corwin', 'Casimer_Kuhlman78@gmail.com', '899-706-5170'),
       ('ckabcde12345678907', 'Carlos Larson PhD', 'Courtney72@gmail.com', '1-351-234-0885'),
       ('ckabcde12345678908', 'Debra Kreiger', 'Gwen.Mayert@yahoo.com', '1-383-442-8046'),
       ('ckabcde12345678909', 'Dominick Corkery', 'Harry74@hotmail.com', '1-827-353-7734'),
       ('ckabcde12345678910', 'June Lakin', 'Jonathan26@yahoo.com', '715.705.3226'),
       ('ckabcde12345678911', 'Harry Willms', 'Herminia57@yahoo.com', '574.525.7950'),
       ('ckabcde12345678912', 'Beatrice Gibson IV', 'Lauren_Rolfson99@gmail.com', '607-606-8263'),
       ('ckabcde12345678913', 'Dr. Benny Leffler DDS', 'Mariela_Cummings@yahoo.com', '326.793.2421'),
       ('ckabcde12345678914', 'Darnell Nicolas', 'Josue.Weber32@gmail.com', '369-700-8900'),
       ('ckabcde12345678915', 'Marian OHara PhD', 'Macy.Schultz@gmail.com', '(334) 341-9676'),
       ('ckabcde12345678916', 'Rickey Williamson', 'Jayden_Zemlak20@hotmail.com', '536-400-3288'),
       ('ckabcde12345678917', 'Leland Lindgren', 'Baby.Torp62@yahoo.com', '1-360-758-0400'),
       ('ckabcde12345678918', 'Johnathan Bailey', 'Tre20@gmail.com', '235-584-7230'),
       ('ckabcde12345678919', 'Mack Hackett', 'Jaida.Nolan@hotmail.com', '(576) 438-1344'),
       ('ckabcde12345678920', 'Sharon Mitchell', 'Kiara.Weimann35@yahoo.com', '1-396-336-2185'),
       ('ckabcde12345678921', 'Tiffany Gutmann', 'Nikki7@gmail.com', '(633) 477-7873'),
       ('ckabcde12345678922', 'Myra Hirthe', 'Shanel_Bednar62@hotmail.com', '(728) 607-4885'),
       ('ckabcde12345678923', 'Matthew Schinner', 'Louvenia39@gmail.com', '225.642.7751'),
       ('ckabcde12345678924', 'Johnny Blanda', 'Freda_Gleason@yahoo.com', '1-768-848-7850'),
       ('ckabcde12345678925', 'Doug Murazik', 'Monty23@hotmail.com', '1-869-826-8663'),
       ('ckabcde12345678926', 'Mrs. Edna Herman', 'Fletcher_Howe87@yahoo.com', '1-402-397-8309'),
       ('ckabcde12345678927', 'Mrs. Nettie Olson', 'Wilmer34@gmail.com', '1-277-581-0225'),
       ('ckabcde12345678928', 'Walter Cummings', 'Violette_Walker52@gmail.com', '(509) 875-3766'),
       ('ckabcde12345678929', 'Cory King', 'Axel.Veum@gmail.com', '543.990.9903'),
       ('ckabcde12345678930', 'Josephine Casper', 'Virginie42@yahoo.com', '503.613.1760'),
       ('ckabcde12345678931', 'Mable Kirlin', 'Robbie_Hansen9@hotmail.com', '1-709-319-1561'),
       ('ckabcde12345678932', 'Mrs. Paulette Sanford DDS', 'Moises_Raynor@hotmail.com', '778-915-7963'),
       ('ckabcde12345678933', 'Kenneth Bechtelar', 'Jeffrey1@hotmail.com', '950-594-2499'),
       ('ckabcde12345678934', 'Trevor Abshire', 'Michel29@yahoo.com', '276-648-3181'),
       ('ckabcde12345678935', 'Erin Labadie', 'Litzy_Conn@gmail.com', '268.328.1412'),
       ('ckabcde12345678936', 'Ebony Borer', 'Mercedes.Hintz@gmail.com', '494.927.1265'),
       ('ckabcde12345678937', 'Leroy Russel', 'Elyssa_Runolfsdottir@hotmail.com', '546.482.7515'),
       ('ckabcde12345678938', 'Rafael Robel', 'Reymundo.Gusikowski43@gmail.com', '893.279.4921'),
       ('ckabcde12345678939', 'Evelyn Towne', 'Letha_Gottlieb81@yahoo.com', '(833) 209-8206'),
       ('ckabcde12345678940', 'Darryl Jakubowski', 'Boris.Pacocha@yahoo.com', '(531) 809-2243'),
       ('ckabcde12345678941', 'Natasha Doyle', 'Henri_Mueller53@yahoo.com', '(785) 960-4987'),
       ('ckabcde12345678942', 'Roberta Waters', 'Orval0@gmail.com', '295-953-3957'),
       ('ckabcde12345678943', 'Leticia Bogan-Schmeler', 'Clyde.Rogahn@yahoo.com', '294.702.1169'),
       ('ckabcde12345678944', 'Glenn Ortiz', 'Estella86@gmail.com', '(699) 258-4736'),
       ('ckabcde12345678945', 'Steve Hansen', 'Trey.Orn@gmail.com', '1-899-653-7805'),
       ('ckabcde12345678946', 'Jan Herzog PhD', 'Kyleigh.Cronin-Prohaska25@hotmail.com', '1-857-319-8700'),
       ('ckabcde12345678947', 'Ray McDermott-Auer', 'Shanny31@yahoo.com', '1-385-203-8245'),
       ('ckabcde12345678948', 'Randy Veum Jr.', 'Sylvester_Murphy58@yahoo.com', '1-281-893-3320'),
       ('ckabcde12345678949', 'Dr. Dallas Bauch', 'Mike28@gmail.com', '631-221-1593'),
       ('ckabcde12345678950', 'Danny Hodkiewicz DVM', 'Meredith67@yahoo.com', '(667) 570-5886')
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
       (30, 'ckabcde12345678904', 6, '2024-01-02', '2024-04-30', 2, 2, 88.00),
       (31, 'ckabcde12345678935', 13, '2024-01-11', '2024-02-29', 1, 2, 320.00),
       (32, 'ckabcde12345678928', 9, '2024-02-05', '2024-05-05', 2, 1, 230.00),
       (33, 'ckabcde12345678932', 3, '2024-01-03', '2024-02-28', 1, 3, 145.00),
       (34, 'ckabcde12345678914', 16, '2024-01-20', '2024-04-20', 2, 2, 180.00),
       (35, 'ckabcde12345678907', 8, '2024-01-09', '2024-02-28', 1, 1, 250.00),
       (36, 'ckabcde12345678918', 5, '2024-02-01', '2024-04-30', 2, 2, 220.00),
       (37, 'ckabcde12345678938', 7, '2024-01-05', '2024-02-29', 1, 2, 205.00),
       (38, 'ckabcde12345678916', 10, '2024-01-04', '2024-02-29', 1, 1, 300.00),
       (39, 'ckabcde12345678913', 19, '2024-01-11', '2024-05-11', 2, 2, 460.00),
       (40, 'ckabcde12345678921', 12, '2024-02-10', '2024-05-10', 2, 1, 180.00),
       (41, 'ckabcde12345678903', 15, '2024-01-20', '2024-04-30', 2, 3, 190.00),
       (42, 'ckabcde12345678919', 14, '2024-02-01', '2024-03-31', 1, 2, 275.00),
       (43, 'ckabcde12345678915', 11, '2024-01-02', '2024-04-30', 2, 1, 160.00),
       (44, 'ckabcde12345678906', 4, '2024-01-25', '2024-02-29', 1, 2, 195.00),
       (45, 'ckabcde12345678937', 2, '2024-01-16', '2024-02-28', 1, 3, 225.00),
       (46, 'ckabcde12345678929', 17, '2024-01-04', '2024-03-31', 1, 1, 310.00),
       (47, 'ckabcde12345678911', 6, '2024-02-10', '2024-03-31', 1, 2, 260.00),
       (48, 'ckabcde12345678927', 18, '2024-01-08', '2024-04-08', 2, 3, 340.00),
       (49, 'ckabcde12345678939', 1, '2024-01-07', '2025-01-07', 4, 1, 500.00),
       (50, 'ckabcde12345678923', 16, '2024-01-10', '2024-02-29', 1, 2, 220.00)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"bookings"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "bookings"; -- Required to increment sequence as we are inserting values with the ID set

INSERT INTO paymentstatuses (id, status)
VALUES (1, 'Pending'),
       (2, 'Completed'),
       (3, 'Failed')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"paymentstatuses"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "paymentstatuses"; -- Required to increment sequence as we are inserting values with the ID set


INSERT INTO roles (id, name, description)
VALUES (1, 'Admin', 'Administrator role'),
       (2, 'Guest', 'Guest role')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"roles"', 'id'), coalesce(max(id) + 1, 1), false)
FROM "roles"; -- Required to increment sequence as we are inserting values with the ID set

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

INSERT INTO payments (booking_id, amount, payment_date, payment_proof, status_id)
VALUES (1, 500.00, '2024-01-15', 'proof1.jpg', 1),
       (2, 600.00, '2024-01-16', 'proof2.jpg', 2),
       (3, 700.00, '2024-01-17', 'proof3.jpg', 1),
       (4, 800.00, '2024-01-18', 'proof4.jpg', 3),
       (5, 900.00, '2024-01-19', 'proof5.jpg', 1),
       (6, 1000.00, '2024-01-20', 'proof6.jpg', 2),
       (7, 1100.00, '2024-01-21', 'proof7.jpg', 1),
       (8, 1200.00, '2024-01-22', 'proof8.jpg', 3),
       (9, 1300.00, '2024-01-23', 'proof9.jpg', 1),
       (10, 1400.00, '2024-01-24', 'proof10.jpg', 2),
       (11, 1500.00, '2024-01-25', 'proof11.jpg', 1),
       (12, 1600.00, '2024-01-26', 'proof12.jpg', 3),
       (13, 1700.00, '2024-01-27', 'proof13.jpg', 1),
       (14, 1800.00, '2024-01-28', 'proof14.jpg', 2),
       (15, 1900.00, '2024-01-29', 'proof15.jpg', 1),
       (16, 2000.00, '2024-01-30', 'proof16.jpg', 3),
       (17, 2100.00, '2024-01-31', 'proof17.jpg', 1),
       (18, 2200.00, '2024-02-01', 'proof18.jpg', 2),
       (19, 2300.00, '2024-02-02', 'proof19.jpg', 1),
       (20, 2400.00, '2024-02-03', 'proof20.jpg', 3),
       (21, 2500.00, '2024-02-04', 'proof21.jpg', 1),
       (22, 2600.00, '2024-02-05', 'proof22.jpg', 2),
       (23, 2700.00, '2024-02-06', 'proof23.jpg', 1),
       (24, 2800.00, '2024-02-07', 'proof24.jpg', 3),
       (25, 2900.00, '2024-02-08', 'proof25.jpg', 1),
       (26, 3000.00, '2024-02-09', 'proof26.jpg', 2),
       (27, 3100.00, '2024-02-10', 'proof27.jpg', 1),
       (28, 3200.00, '2024-02-11', 'proof28.jpg', 3),
       (29, 3300.00, '2024-02-12', 'proof29.jpg', 1),
       (30, 3400.00, '2024-02-13', 'proof30.jpg', 2),
       (31, 3500.00, '2024-02-14', 'proof31.jpg', 1),
       (32, 3600.00, '2024-02-15', 'proof32.jpg', 3),
       (33, 3700.00, '2024-02-16', 'proof33.jpg', 1),
       (34, 3800.00, '2024-02-17', 'proof34.jpg', 2),
       (35, 3900.00, '2024-02-18', 'proof35.jpg', 1),
       (36, 4000.00, '2024-02-19', 'proof36.jpg', 3),
       (37, 4100.00, '2024-02-20', 'proof37.jpg', 1),
       (38, 4200.00, '2024-02-21', 'proof38.jpg', 2),
       (39, 4300.00, '2024-02-22', 'proof39.jpg', 1),
       (40, 4400.00, '2024-02-23', 'proof40.jpg', 3),
       (41, 4500.00, '2024-02-24', 'proof41.jpg', 1),
       (42, 4600.00, '2024-02-25', 'proof42.jpg', 2),
       (43, 4700.00, '2024-02-26', 'proof43.jpg', 1),
       (44, 4800.00, '2024-02-27', 'proof44.jpg', 3),
       (45, 4900.00, '2024-02-28', 'proof45.jpg', 1),
       (46, 5000.00, '2024-03-01', 'proof46.jpg', 2),
       (47, 5100.00, '2024-03-02', 'proof47.jpg', 1),
       (48, 5200.00, '2024-03-03', 'proof48.jpg', 3),
       (49, 5300.00, '2024-03-04', 'proof49.jpg', 1),
       (50, 5400.00, '2024-03-05', 'proof50.jpg', 2)
ON CONFLICT DO NOTHING;
