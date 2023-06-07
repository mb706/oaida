#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

if [ -z "${3:-}" ] || [ ! -r "$1" -o ! -w "$2" ] ; then
    if [ ! -z "${3:-}" ] ; then
        echo "Error: $1 is not readable or $2 is not writable" >&2
    fi
    echo "Query OpenAI for resource usage for given date. Date must be in UTC." >&2
    echo "Usage: $0 <api key file> <database file> <date>" >&2
    exit 1
fi

# we delete the entries for the given date, and then re-add them
# OpenAI uses UTC, we use local time, so we need to convert from date midnight (UTC) to whatever time that is locally.
startDate="$(date -d "$3 GMT" +'%FT%H:%M')"
endDate="$(date -d "$3 GMT + 1 day" +'%FT%H:%M')"

# Query for each user individually with a while-loop
sqlite3 "$2" "SELECT id, name, openaiId from user;" | while IFS='|' read id name openaiId ; do
    echo "Updating $name ($id)..."
    # call the API endpoint.
    # curl: gets a JSON
    # jq: parses the JSON and puts everything in a table
    #     <timestamp>,<resource name>,<context units>,<generated units>,<resource type>
    #     (we use the resource type since only the NLP models have context.)
    # awk: add two lines for each NLP model; also add quotation
    # sed: add the user id to the beginning of each line, put in parentheses and add commas
    # cat: pre- and post-fix the SQL statements
    #   we use a transaction so we only delete entries when the API call succeeds
    #   Then we delete all entries for the given date.
    #   Afterwards, a CTE is used to insert the new entries without writing them out to a file first.
    #   we join with the resource table to get the resource id from the name.
    #     note that the resource name is a "like" pattern, since I don't want to hardcode the model versions.
    #   Finally, we SELECT INTO and COMMIT.
    # The || true is there to ignore errors for individual users.
    curl -sK  <(sed 's/.*/header = "Authorization: Bearer \0"/' "$1") \
        "https://api.openai.com/v1/usage?date=${3}&user_public_id=${openaiId}" | \
        jq -r 'def timestampToString: (. | strflocaltime("%Y-%m-%dT%H:%M")); [
  (.data[] | [(.aggregation_timestamp | timestampToString), .snapshot_id, .n_context_tokens_total / 1000, .n_generated_tokens_total / 1000, "nlp"]),
  (.whisper_api_data[] | [(.timestamp | timestampToString), .model_id, null, .num_seconds, "whisper"]),
  (.dalle_api_data[] | [(.timestamp | timestampToString), .image_size, null, .num_images, "dalle"])
][] | join(",")' | awk -F, '{
  if ($5 ~ /nlp/) {
    print "\""$1 "\",\"prompt_" $2 "\"," $3;
    print "\""$1 "\",\"completion_" $2 "\"," $4;
  } else {
    print "\""$1 "\",\"" $2 "\"," $4;
  }
}' | sed "s|.*|(${id},\\0),|" | cat \
    <(echo "
    BEGIN TRANSACTION;

      DELETE FROM usage WHERE time >= '$startDate' AND time < '$endDate';

      WITH usageNew (userId, time, resourceName, units) AS (VALUES") \
    - \
    <(echo "(NULL,NULL,NULL,NULL))
      INSERT INTO usage (userId, resourceId, units, time)
        SELECT userId, resource.id, units, time FROM usageNew
        INNER JOIN resource ON resourceName like resource.name;
    COMMIT;
    ") | sqlite3 "$2" || true

done

