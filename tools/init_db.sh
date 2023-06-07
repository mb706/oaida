#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# This script will create a new database file, and populate with empty tables.

if [ -z "${1:-}" ]
then
    echo "Create a new database file, and populate with empty tables." >&2
    echo "Usage: $0 <database file>" >&2
    exit 1
fi

if [ -e "$1" ]
then
    echo "Create a new database file, and populate with empty tables." >&2
    echo "Error: $1 already exists" >&2
    exit 1
fi

cat <<EOF | sqlite3 "$1"
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS resource;
DROP TABLE IF EXISTS usage;

CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    truename TEXT NOT NULL UNIQUE,
    openaiId TEXT NOT NULL UNIQUE
);

CREATE TABLE resource (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
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

--- These are hardcoded...
--- let's pray OpenAI doesn't change them
INSERT INTO resource (name, costPerUnit) VALUES
('prompt_gpt-4-0%', .03),
('completion_gpt-4-0%', .06),
('prompt_gpt-4-32k%', .06),
('completion_gpt-4-32k%', .12),
('prompt_gpt-3.5-turbo-%', .002),
('completion_gpt-3.5-turbo-%', .002),
('prompt_ada:%', .0004),
('completion_ada:%', .0004),
('prompt_text-ada:%', .0004),
('completion_text-ada:%', .0004),
('prompt_text-babbage:%', .0005),
('completion_text-babbage:%', .0005),
('prompt_babbage:%', .0005),
('completion_babbage:%', .0005),
('prompt_text-curie:%', .002),
('completion_text-curie:%', .002),
('prompt_curie:%', .002),
('completion_curie:%', .002),
('prompt_text-davinci:%', .02),
('completion_text-davinci:%', .02),
('prompt_davinci:%', .02),
('completion_davinci:%', .02),

--- names here are guesses
('prompt_text-embedding-ada%v2', .0004),
('prompt_text-similarity-ada%1', .004),
('prompt_text-similarity-babbage%1', .005),
('prompt_text-similarity-curie%1', .02),
('prompt_text-similarity-davinci%1', .2),


--- these seem to exist, prices are guesses
('prompt_code-curie:%', .002),
('completion_code-curie:%', .002),
('prompt_if-curie-v2', .002),
('completion_if-curie-v2', .002),

--- same here
('prompt_if-davinci-v2', .02),
('completion_if-davinci-v2', .02),

('prompt_text-davinci-edit:%', .0),
('completion_text-davinci-edit:%', .0),
('prompt_code-davinci-edit:%', .0),
('completion_code-davinci-edit:%', .0),



--- non-text
('whisper-1', .0001),
('256x256', .016),
('512x512', .018),
('1024x1024', .02);
EOF
