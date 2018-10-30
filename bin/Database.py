import psycopg2
import sys


class Database:
    def __init__(self, con_string=None):
        self.db = None
        self.cur = None
        if con_string:
            self.select_database(con_string)

    def __del__(self):
        self.close()

    def select_database(self, con_string):
        self.close()
        host, user, pwd, db, port = con_string.split(',')
        try:
            self.db = psycopg2.connect(host=host, user=user, password=pwd, database=db, port=port)
        except psycopg2.Error as e:
            print("Error in Database.py" + str(e))
            sys.exit(1)
        self.cur = self.db.cursor()

    def close(self):
        if self.cur:
            self.cur.close()
            del self.cur
        if self.db:
            self.db.close()
            del self.db

    def execute(self, query, data=None):
        if data is not None:
            self.cur.execute(query, data)
        else:
            self.cur.execute(query)

    def select(self, query, data=None):
        if data is not None:
            self.cur.execute(query, data)
        else:
            self.cur.execute(query)
        return self.cur.fetchall()

    def insert(self, query, data=None, commit=True):
        if data is not None:
            self.cur.execute(query, data)
        else:
            self.cur.execute(query)
        if commit:
            self.db.commit()

    def insert_many(self, query, iterator, commit=True):
        self.cur.executemany(query, iterator)
        if commit:
            self.db.commit()

    def delete(self, query, commit=True):
        self.cur.execute(query)
        if commit:
            self.db.commit()

    def interrupt(self):
        self.db.interrupt()

    def run_script(self, script):
        return self.cur.executescript(script)

    def commit(self):
        self.db.commit()
