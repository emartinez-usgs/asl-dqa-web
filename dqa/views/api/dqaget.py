
import time

from django.http import HttpResponse
from django.db import connection


def dqaget(request):
    """
    Query and pass back data for given parameters
    :param request:
    :return:
    """

    command = request.GET.get('cmd', None)
    network = request.GET.get('network', '%')
    station = request.GET.get('station', '%')
    location = request.GET.get('location', '%')
    channel = request.GET.get('channel', '%')
    metric = request.GET.get('metric', '%')
    start_date = request.GET.get('sdate', (time.strftime("%Y-%m-%d")))
    end_date = request.GET.get('edate', (time.strftime("%Y-%m-%d")))
    output_format = request.GET.get('format', 'human').lower()

    if command is None or command == '':
        return HttpResponse("Error: No command string")

    # Set HTTP header based on response type
    content_type = 'text/csv' if output_format == 'csv' else 'text/plain'

    with connection.cursor() as cursor:
        if command == "metrics":
            sql = """
            SELECT name
            FROM tblmetric
            ORDER BY name
            """
        elif command == "stations":
            sql = """
            SELECT name
            FROM tblstation
            ORDER BY name
            """
        elif command == "networks":
            sql = """
            SELECT DISTINCT "tblGroup".name
            FROM tblstation
            JOIN "tblGroup" on tblstation.fkNetworkID = "tblGroup".pkGroupID
            ORDER BY "tblGroup".name            
            """
        elif command == "data":
            sql = """
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
                grp.name LIKE '{network}'
                AND sta.name LIKE '{station}'
                AND m.name LIKE '{metric}'
                AND sen.location LIKE '{location}'
                AND cha.name LIKE '{channel}'
                AND md.date BETWEEN (to_char('{start_date}'::date, 'J')::INT)
                AND (to_char('{end_date}'::date, 'J')::INT)
            ORDER BY
                grp.name,
                sta.name,
                md.date,
                sen.location,
                cha.name,
                Value
            """.format(network=network,
                       station=station,
                       metric=metric,
                       location=location,
                       channel=channel,
                       start_date=start_date,
                       end_date=end_date)
        elif command == "md5":
            sql = """
            SELECT date, md5(string_agg(string, ''))
            FROM (
                SELECT
                    to_date(md.date::text, 'J') AS date,
                    grp.name::TEXT ||
                    sta.name::TEXT ||
                    sen.location::TEXT ||
                    cha.name::TEXT ||
                    m.name::TEXT ||
                    md.value::TEXT as string
                FROM
                    tblchannel cha
                    JOIN tblsensor sen ON cha.fksensorid = sen.pksensorid
                    JOIN tblstation sta ON sen.fkstationid = sta.pkstationid
                    JOIN "tblGroup" grp ON sta.fknetworkid = grp.pkgroupid
                    JOIN tblMetricdata md ON md.fkChannelid = cha.pkChannelID
                    JOIN tblMetric m ON md.fkmetricid = m.pkmetricid
                WHERE
                    grp.name LIKE '{network}'
                    AND sta.name LIKE '{station}'
                    AND m.name LIKE '{metric}'
                    AND sen.location LIKE '{location}'
                    AND cha.name LIKE '{channel}'
                    AND md.date BETWEEN (to_char('{start_date}'::date, 'J')::INT)
                    AND (to_char('{end_date}'::date, 'J')::INT)
                ORDER BY
                    grp.name,
                    sta.name,
                    md.date,
                    sen.location,
                    cha.name,
                    Value
                ) s1
            GROUP BY date
            ORDER BY date            
            """.format(network=network,
                       station=station,
                       metric=metric,
                       location=location,
                       channel=channel,
                       start_date=start_date,
                       end_date=end_date)
        elif command == "hash":
            sql = """
            SELECT
                to_date(md.date::text, 'J') AS date,
                grp.name AS network,
                sta.name AS station,
                sen.location AS Location,
                cha.name AS Channel,
                m.name AS Metric,
                md.value AS Value,
                encode(h.hash, 'hex') as Hash
            FROM
                tblchannel cha
                JOIN tblsensor sen ON cha.fksensorid = sen.pksensorid
                JOIN tblstation sta ON sen.fkstationid = sta.pkstationid
                JOIN "tblGroup" grp ON sta.fknetworkid = grp.pkgroupid
                JOIN tblMetricdata md ON md.fkChannelid = cha.pkChannelID
                JOIN tblMetric m ON md.fkmetricid = m.pkmetricid
                JOIN tblhash h ON md."fkHashID" = h."pkHashID"
            WHERE
                grp.name LIKE '{network}'
                AND sta.name LIKE '{station}'
                AND m.name LIKE '{metric}'
                AND sen.location LIKE '{location}'
                AND cha.name LIKE '{channel}'
                AND md.date BETWEEN (to_char('{start_date}'::date, 'J')::INT)
                AND (to_char('{end_date}'::date, 'J')::INT)
            ORDER BY
                grp.name,
                sta.name,
                md.date,
                sen.location,
                cha.name,
                Value            
            """.format(network=network,
                       station=station,
                       metric=metric,
                       location=location,
                       channel=channel,
                       start_date=start_date,
                       end_date=end_date)
        else:
            return HttpResponse("Error: Unknown command string: {0}".format(command))

        cursor.execute(sql)
        records = cursor.fetchall()

    if records:
        return HttpResponse(format_output(records=records, command=command, output_format=output_format), content_type=content_type)
    else:
        return HttpResponse('Error: Database Query did not return data for these parameters: {0}'.format(request.GET.dict()))


def format_output(records, command, output_format):
    output = ''
    if command in ['metrics', 'networks', 'stations']:
        records = [r[0] for r in records]
        if output_format == 'human':
            output = '\n'.join(records)
        elif output_format == 'csv':
            output = ','.join(records)
        elif output_format == 'json':
            output = 'Under construction'
    elif command in ['data', 'hash', 'md5']:
        if output_format == 'csv':
            output = '\n'.join([', '.join(map(str, list(row))) for row in records])
        elif output_format == 'json':
            output = 'Under construction'
        elif command == 'data':
            output = ["%10s %3s %6s %3s %4s %20s %lf\n" % row for row in records]
        elif command == 'hash':
            output = ["%10s %3s %6s %3s %4s %20s %15lf %32s\n" % row for row in records]
        elif command == 'md5':
            output = ["%10s %32s\n" % row for row in records]
    return output