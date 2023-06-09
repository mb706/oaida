# oaida
OpenAI Dashboard Toy Project

![image](https://github.com/mb706/oaida/assets/15801081/c2608ac5-39bc-4b8a-8662-633bcf003fbb)

## How to use:

To use this project, you will need to have `OPENAI_ORG` and `OPENAI_API_KEY` files.

To initialize the database, run the following command:
```sh
tools/init_db.sh instance/your_database.db
```

To get users, run the following command (make sure to run this again when new users are added to the organization):
```sh
tools/get_users.sh OPENAI_API_KEY instance/your_database.db "$(cat OPENAI_ORG)"
```

Loop the following command every few minutes (not more frequently than every 5 minutes, as OpenAI updates their bins in 5 minute slots):
```sh
tools/query_usage.sh OPENAI_API_KEY instance/your_database.db $(date -u '%F') "$(cat OPENAI_ORG)"
```

To be extra thorough, also run the above command with yesterday's date (`date -d yesterday -u +'%F'`) about 10 minutes past UTC midnight to ensure that nothing was missed.
One way to do this is to use crontab with `CRON_TZ=UTC` in the crontab file.

For local debug deployment, start the backend server with:
```sh
python backend/app.py
```
and start the frontend with:
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
The `REACT_APP_SOCKET_PATH` is only needed if it is not the default ("`/socket.io/`").

You can also set the `SOCKET_PATH` environment for your `backend/app.py` if you are not redirecting to `/socket.io/` in your reverse proxy setup.

## Status

This project is currently very fragile and likely very buggy. Some things that are missing include:
* Fine tuning costs
* Frontend update pushes when DB file is updated
* Frontend update does not play well with the "cumulative" switch, I believe.

## License

This project is licensed under the MIT license.