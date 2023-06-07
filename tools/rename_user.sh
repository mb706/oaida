#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

if [ -z "${4:-}" ] ; then
    echo "Change the display name of a user, by name (as per OpenAI) or by id" >&2
    echo "Usage: $0 <database file> byName|byId <identifier> <new name>" >&2
    exit 1
fi

# build WHERE statement
case "$2" in
    byName)
        WHERESTMNT="WHERE truename = '$3'"
        ;;
    byId)
        WHERESTMNT="WHERE openaiId = '$3'"
        ;;
    *)
        echo "Usage: $0 <database file> byName|byId <identifier> <new name>"
        exit 1
        ;;
esac

# check that the user exists
if [ $(sqlite3 "$1" "SELECT COUNT(*) FROM user $WHERESTMNT;") -ne 1 ] ; then
    echo "Error: $3 does not uniquely identify a user" >&2
    exit 1
fi

# update the user
sqlite3 "$1" "UPDATE user SET name = '$4' $WHERESTMNT;"

