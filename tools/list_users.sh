#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

if [ -z "${1:-}" ] ; then
    echo "Usage: $0 <database file>" >&2
    exit 1
fi

sqlite3 -header -column "$1" "SELECT * FROM user;"