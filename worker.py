import os
import redis
from rq import Worker, Queue, Connection
from lib.logger import formatLogger

logger = formatLogger(__name__)
listen = ['default']
redis_url = os.getenv('REDISTOGO_URL', 'redis://localhost:6379')
conn = redis.from_url(redis_url)

if __name__ == '__main__':
    with Connection(conn):
        worker = Worker(list(map(Queue, listen)))
        worker.work()
