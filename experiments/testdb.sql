DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS resource;
DROP TABLE IF EXISTS usage;

CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE resource (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    costPerUnit REAL NOT NULL
);

CREATE TABLE usage (
    id INTEGER PRIMARY KEY,
    userId INTEGER,
    resourceId INTEGER,
    units REAL,
    time TEXT,
    FOREIGN KEY(userId) REFERENCES user(id),
    FOREIGN KEY(resourceId) REFERENCES resource(id)
);

INSERT INTO user (name) VALUES
('User1'),
('User2'),
('User3');

INSERT INTO resource (name, costPerUnit) VALUES
('Resource1', 10.0),
('Resource2', 20.0);

INSERT INTO usage (userId, resourceId, units, time) VALUES
(1, 1, 5.0, '2023-06-01T08:00'),
(1, 2, 10.0, '2023-06-01T09:00'),
(2, 1, 7.0, '2023-06-01T10:00'),
(2, 2, 8.0, '2023-06-01T11:00'),
(3, 1, 5.0, '2023-06-01T12:00'),
(3, 2, 10.0, '2023-06-01T08:00'),
(1, 1, 6.0, '2023-06-01T09:00'),
(1, 2, 12.0, '2023-06-02T10:00'),
(2, 1, 5.0, '2023-06-02T11:00'),
(3, 2, 15.0, '2023-06-02T08:00');
