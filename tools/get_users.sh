#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

if [ -z "${3:-}" ] || [ ! -r "$1" -o ! -w "$2" ] ; then
    if [ ! -z "${3:-}" ] ; then
        echo "Error: $1 is not readable or $2 is not writable" >&2
    fi
    echo "Populate given database with information about users. Users with existing openaiId are ignored." >&2
    echo "Usage: $0 <api key file> <database file> <org id>" >&2
    exit 1
fi

curl -sK  <(sed 's/.*/header = "Authorization: Bearer \0"/' "$1") \
    "https://api.openai.com/v1/organizations/$3/users" | \
    jq -r '.members.data[].user | [.id, .name] | join(",")' | \
    while IFS=, read -r id name ; do
        echo "Adding $name ($id)..."
        sqlite3 "$2" "INSERT INTO user (openaiId, name, truename) VALUES ('$id', '$name', '$name');" || echo "Skipping $name"
    done