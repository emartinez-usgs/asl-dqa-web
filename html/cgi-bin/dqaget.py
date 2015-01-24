#!/usr/bin/env python
import os
import sys
import time
from datetime import datetime
from functools import partial
import cgi
import cgitb
cgitb.enable()

binPath = "/dataq/bin/"
sys.path.insert(0, binPath)
import Database

formats = ["Human", "CSV"]
#CSV format should follow RFC 4180 unless another standard is agreed on.
#http://tools.ietf.org/html/rfc4180

queries = {
    "metrics" : """
SELECT name FROM tblmetric ORDER BY name
""",
    "data" : """
SELECT
    to_date(md.date::text, 'J') AS date,
    grp.name AS network,
    sta.name AS station,
    sen.location AS Location,
    cha.name AS Channel,
    m.name AS Metric,
    md.value AS Value
FROM
    tblchannel cha
    JOIN tblsensor sen ON cha.fksensorid = sen.pksensorid
    JOIN tblstation sta ON sen.fkstationid = sta.pkstationid
    JOIN "tblGroup" grp ON sta.fknetworkid = grp.pkgroupid
    JOIN tblMetricdata md ON md.fkChannelid = cha.pkChannelID
    JOIN tblMetric m ON md.fkmetricid = m.pkmetricid
WHERE
    grp.name LIKE %s
    AND sta.name LIKE %s
    AND m.name LIKE %s
    AND sen.location LIKE %s
    AND cha.name LIKE %s
    AND md.date BETWEEN (to_char(%s::date, 'J')::INT)
    AND (to_char(%s::date, 'J')::INT)
ORDER BY
    grp.name,
    sta.name,
    md.date,
    sen.location,
    cha.name,
    Value
"""
}

database_conString = open(binPath+'db.config', 'r').readline()
database = Database.Database(database_conString)

def error(message=None):
    if message is None:
        print "ERROR"
    else:
        print "ERROR:", message
    sys.exit(0)

def printMetrics(records, fmt):
    if(fmt == "Human"):
        print "\r\n".join(map("".join,records))
    elif(fmt == "CSV"):
        print ",".join(map("".join,records)) + "\r\n",

def printData(records, fmt):
    if(fmt == "Human"):
        for row in records:
            print "%10s %3s %6s %3s %4s %20s %lf" % row
    elif(fmt == "CSV"):
        print "\r\n".join(map(", ".join, map( partial(map, str),records))) +"\r\n",

form = cgi.FieldStorage()
if "cmd" not in form:
    error("No command string supplied")
cmd_str = form["cmd"].value
if len(cmd_str) < 1:
    error("No command string provided")
if "network" in form:
    network = form["network"].value
else:
    network = "%"
if "station" in form:
    station = form["station"].value
else:
    station = "%"
if "location" in form:
    location = form["location"].value
else:
    location = "%"
if "channel" in form:
    channel = form["channel"].value
else:
    channel = "%"
if "metric" in form:
    metric = form["metric"].value
else:
    metric = "%"
if "sdate" in form:
    sdate = form["sdate"].value
else:
    sdate = (time.strftime("%Y-%m-%d"))
if "edate" in form:
    edate = form["edate"].value
else:
    edate = (time.strftime("%Y-%m-%d"))
if "format" in form and form["format"].value in formats:
    fmt = form["format"].value
else:
    fmt = "Human"

#Set HTTP header based on response type
if(fmt == "CSV"):
    print "Content-Type: text/csv"
else:
    print "Content-Type: text/plain"
print ""

db_args = (network, station, metric, location, channel, sdate, edate) 
if cmd_str == "metrics":
    printMetrics(database.select(queries["metrics"]), fmt)
elif cmd_str == "data":
    printData(database.select(queries["data"],db_args), fmt)
