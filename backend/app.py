from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///your_database.db'  # replace with your SQLite database path
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")  # remove cors_allowed_origins if not needed

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, select, literal
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

## Database Models
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)

    def to_dict(self):
        return {"id": self.id, "name": self.name}

class Resource(db.Model):
    __tablename__ = 'resource'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)
    costPerUnit = db.Column(db.Float)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "costPerUnit": self.costPerUnit}

class Usage(db.Model):
    __tablename__ = 'usage'
    id = db.Column(db.Integer, primary_key=True)
    userId = db.Column(db.Integer, db.ForeignKey('user.id'))
    resourceId = db.Column(db.Integer, db.ForeignKey('resource.id'))
    units = db.Column(db.Float)
    time = db.Column(db.DateTime)

    user = db.relationship('User')
    resource = db.relationship('Resource')

## User dropdown
@socketio.on('get_users')
def handle_get_users():
    users = User.query.all()
    socketio.emit('users', [user.to_dict() for user in users])

## This one is actually not used currently
@socketio.on('get_resources')
def handle_get_resources():
    resources = Resource.query.all()
    socketio.emit('resources', [resource.to_dict() for resource in resources])

## The main API endpoint
@socketio.on('get_stats')
def handle_get_stats(data):
    # if user_id is empty, get stats for all users and sum over resources
    # otherwise get resource for given user, split by resource
    user_id = data.get('userId', '')  
    start_time = data.get('startTime')  # inclusive
    end_time = data.get('endTime')  # Only the day counts here, since DB entries are rounded.
    time_format = data.get('timeFormat')  # 'daily', 'hourly', 'daily_cumulative', or 'hourly_cumulative'
    #  print(user_id, start_time, end_time, time_format)

    str_format = '%Y-%m-%dT%H' if 'hourly' in time_format else '%Y-%m-%d'
    date_expr = db.func.strftime(str_format, Usage.time)

    # get resource usage in given time range
    subquery = db.session.query(
        date_expr.label('date'),
        db.func.sum(Usage.units).label('units'),
        db.func.sum(Usage.units * Resource.costPerUnit).label('cost'),
        Resource.name.label('resourceName') if user_id else User.name.label('userName')
    ).join(Resource).filter(
        Usage.time.between(start_time, end_time)
    )


    if user_id:
        # when user_id is given: filter, and break down by resource
        subquery = subquery.filter(Usage.userId == user_id).group_by('date', 'resourceName')
    else:
        # when user_id is not given: break down by user
        # only in this time do we care about the user name.
        subquery = subquery.join(User)
        subquery = subquery.group_by('date', 'userId')

    # black magic
    subquery = subquery.subquery()
    query = db.session.query(subquery)

    if 'cumulative' in time_format:
        # add an entry to the beginning of the time range corresponding to the sum of all previous entries
        cumulative_query = db.session.query(
            db.func.strftime(str_format, start_time).label('date'),
            db.func.total(Usage.units).label('units'),
            db.func.total(Usage.units * Resource.costPerUnit).label('cost'),
            Resource.name.label('resourceName') if user_id else User.name.label('userName')
        ).join(Resource).filter(
            Usage.userId == user_id,
            Usage.time < start_time
        )

        # same as above: break down by resource or user
        if user_id:
            cumulative_query = cumulative_query.filter(Usage.userId == user_id).group_by('resourceName')
        else:
            cumulative_query = cumulative_query.join(User).group_by('userId')

        # union_all avoids removing a duplicate, which can occur if the first entry of the time range has the same
        # value as the all-previous-data statement above
        subquery = cumulative_query.union_all(query).subquery()

        # partition by the user or resource name
        extracol = subquery.c.resourceName if user_id else subquery.c.userName
        # now we can do the cumulative sum
        query = db.session.query(
            subquery.c.date,
            extracol,
            db.func.sum(subquery.c.units).over(partition_by=extracol, order_by=subquery.c.date).label('units'),
            db.func.sum(subquery.c.cost).over(partition_by=extracol, order_by=subquery.c.date).label('cost')
        )
        query = query.filter(subquery.c.units != 0)
        query = query.distinct()

    stats = query.all()

    column_names = [col['name'] for col in query.column_descriptions]

    socketio.emit('stats', {"timeFormat": time_format, "data": [dict(zip(column_names, row)) for row in stats]})


# TODO: monitor database changes and emit them to the frontend
"""
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class DatabaseChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        # When the file is modified, emit the new data
        with app.app_context():
            result = Test.query.all()
            socketio.emit('data', [i.to_dict() for i in result])

def monitor_db_changes():
    event_handler = DatabaseChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, path='instance/your_database.db', recursive=False)
    observer.start()
"""

if __name__ == '__main__':
    # Start the thread when the application starts
    # monitor_db_changes()
    socketio.run(app)

