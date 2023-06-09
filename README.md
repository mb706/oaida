# oaida
OpenAI Dashboard Toy Project

![image](https://github.com/mb706/oaida/assets/15801081/c2608ac5-39bc-4b8a-8662-633bcf003fbb)

## How to use:

Needs OPENAI_ORG and OPENAI_API_KEY files.

Initialize the DB as follows:
```sh
# create db file
tools/init_db.sh instance/your_database.db
# get users; run this again when users are added to the organization.
tools/get_users.sh OPENAI_API_KEY instance/your_database.db "$(cat OPENAI_ORG)"
```

Then loop the following every few minutes (not more frequent than 5 minutes, as OpenAI bins their updates in 5 min slots I believe):
```sh
tools/query_usage.sh OPENAI_API_KEY instance/your_database.db  $(date -u '%F')
```

To be extra thorough, also run with yesterday's date about 10 mins past midnight to be sure nothing was missed.

For local debug deployment, the backend server with
```sh
python backend/app.py
```
and the frontend with
```sh
cd frontend
npm start
```

## Deploy

create the `frontend/.env.production` file with the line
```sh
REACT_APP_SOCKET_URL=https://<backend host>
REACT_APP_SOCKET_PATH=/<backend path>/socket.io/
PUBLIC_URL=https://<backend url>
```
the `REACT_APP_SOCKET_PATH` is only needed if it is not the default ("`/socket.io/`").

You can also set the `SOCKET_PATH` environment for your `backend/app.py` if you are not redirecting to `/socket.io/` in your reverse proxy setup.

## Status

Very fragile, likely very buggy. Things that are missing in particular:
* fine tuning costs
* frontend update pushes when DB file is updated
* frontend update does not play well with the "cumulative" switch I believe.

## License

MIT
