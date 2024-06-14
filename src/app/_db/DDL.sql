CREATE TABLE Roles (
                       id SERIAL PRIMARY KEY,
                       name VARCHAR(255) NOT NULL,
                       description VARCHAR(255)
);

CREATE TABLE Permissions (
                             id SERIAL PRIMARY KEY,
                             permission VARCHAR(255) NOT NULL
);

CREATE TABLE RolePermissions (
                                 role_id INT NOT NULL,
                                 permission_id INT NOT NULL,
                                 PRIMARY KEY (role_id, permission_id),
                                 FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE,
                                 FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE
);

CREATE TABLE Users (
                       id SERIAL PRIMARY KEY,
                       name VARCHAR(255) NOT NULL,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       role_id INT,
                       FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE SET NULL
);

CREATE TABLE Durations (
                           id SERIAL PRIMARY KEY,
                           duration VARCHAR(255) NOT NULL,
                           day_count INT NOT NULL
);

CREATE TABLE RoomTypes (
                           id SERIAL PRIMARY KEY,
                           type VARCHAR(255) NOT NULL
);

CREATE TABLE RoomTypeDurations (
                                   id SERIAL PRIMARY KEY,
                                   room_type_id INT NOT NULL,
                                   duration_id INT NOT NULL,
                                   suggested_price DECIMAL(10, 2) NOT NULL,
                                   FOREIGN KEY (room_type_id) REFERENCES RoomTypes(id) ON DELETE CASCADE,
                                   FOREIGN KEY (duration_id) REFERENCES Durations(id) ON DELETE CASCADE
);

CREATE TABLE RoomStatuses (
                              id SERIAL PRIMARY KEY,
                              status VARCHAR(255) NOT NULL
);

CREATE TABLE Rooms (
                       id SERIAL PRIMARY KEY,
                       room_number VARCHAR(255) NOT NULL UNIQUE,
                       room_type_id INT,
                       status_id INT,
                       FOREIGN KEY (room_type_id) REFERENCES RoomTypes(id) ON DELETE SET NULL,
                       FOREIGN KEY (status_id) REFERENCES RoomStatuses(id) ON DELETE SET NULL
);

CREATE TABLE BookingStatuses (
                                 id SERIAL PRIMARY KEY,
                                 status VARCHAR(255) NOT NULL
);

CREATE TABLE Bookings (
                          id SERIAL PRIMARY KEY,
                          user_id INT,
                          room_id INT,
                          check_in DATE NOT NULL,
                          duration_id INT,
                          status_id INT,
                          fee DECIMAL(10, 2) NOT NULL,
                          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL,
                          FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE SET NULL,
                          FOREIGN KEY (duration_id) REFERENCES Durations(id) ON DELETE SET NULL,
                          FOREIGN KEY (status_id) REFERENCES BookingStatuses(id) ON DELETE SET NULL
);

CREATE TABLE PaymentStatuses (
                                 id SERIAL PRIMARY KEY,
                                 status VARCHAR(255) NOT NULL
);

CREATE TABLE Payments (
                          id SERIAL PRIMARY KEY,
                          booking_id INT NOT NULL,
                          amount DECIMAL(10, 2) NOT NULL,
                          payment_date DATE NOT NULL,
                          payment_proof VARCHAR(255),
                          status_id INT,
                          FOREIGN KEY (booking_id) REFERENCES Bookings(id) ON DELETE CASCADE,
                          FOREIGN KEY (status_id) REFERENCES PaymentStatuses(id) ON DELETE SET NULL
);

CREATE TABLE Guests (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255),
                        phone VARCHAR(255)
);

CREATE TABLE GuestBookings (
                               guest_id INT NOT NULL,
                               booking_id INT NOT NULL,
                               PRIMARY KEY (guest_id, booking_id),
                               FOREIGN KEY (guest_id) REFERENCES Guests(id) ON DELETE CASCADE,
                               FOREIGN KEY (booking_id) REFERENCES Bookings(id) ON DELETE CASCADE
);

CREATE TABLE Categories (
                            id SERIAL PRIMARY KEY,
                            category VARCHAR(255) NOT NULL
);

CREATE TABLE Expenses (
                          id SERIAL PRIMARY KEY,
                          amount DECIMAL(10, 2) NOT NULL,
                          description VARCHAR(255) NOT NULL,
                          date DATE NOT NULL,
                          category_id INT,
                          FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL
);

CREATE TABLE Reports (
                         id SERIAL PRIMARY KEY,
                         type VARCHAR(255) NOT NULL,
                         generated_at DATE NOT NULL,
                         content TEXT NOT NULL
);

CREATE TABLE Settings (
                          id SERIAL PRIMARY KEY,
                          setting_key VARCHAR(255) NOT NULL,
                          setting_value VARCHAR(255) NOT NULL
);

CREATE TABLE Logs (
                      id SERIAL PRIMARY KEY,
                      user_id INT NOT NULL,
                      action VARCHAR(255) NOT NULL,
                      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Rules (
                       id SERIAL PRIMARY KEY,
                       description TEXT NOT NULL
);
