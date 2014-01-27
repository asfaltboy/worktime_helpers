#!/usr/bin/env python
"""
LockScreen Monitor
==================

Version: 0.2

Monitor gnome-screensaver activate/de-activate events and write first and last
activitation/de-activation events to a daily csv log.

"""
from datetime import datetime
import csv
import os
import subprocess
import time

CSV_FILE = '~/hours_logs/{}.csv'
PID_FILE = '/tmp/lockscreen_monitor.pid'


def get_hours(log_file, activated):
    now = datetime.now().strftime('%X')
    today = datetime.today().date().strftime('%x')

    def get_updated_row(row=None):
        new_row = [today, 0, 0]
        if row:
            new_row = row
        # TODO: on activate/deactivate store the time
        #       passed since last not 0 deactivate/reactivation
        #       as "break time" (appended)
        if activated:  # screensaver activated == locked screen
            new_row[2] = now
        else:
            if str(new_row[1]) == "0":
                new_row[1] = now
        return new_row

    reader = list(csv.reader(log_file)) if log_file else []
    rows = []

    if not reader:
        # add header row and first line of today
        rows.append(['Date', 'Arrival', 'Deprature'])
        rows.append(get_updated_row())
        return rows

    row = reader[-1]
    rows = reader[:-1]
    if row[0] != today:
        rows.append(row)  # push last row
        rows.append(get_updated_row())
    else:
        # update today's row
        rows.append(get_updated_row(row))
    return rows


def handle_activated(activated):
    month = datetime.today().strftime('%Y-%m')
    file_path = os.path.expanduser(CSV_FILE.format(month))
    try:
        with open(file_path, 'r') as f:
            rows = get_hours(f, activated)
    except IOError:
        rows = get_hours(None, activated)

    with open(file_path, 'w') as f:
        print rows
        writer = csv.writer(f)
        writer.writerows(rows)


def pid_is_running(pid):
    """
    Return pid if pid is still going.

    >>> import os
    >>> mypid = os.getpid()
    >>> mypid == pid_is_running(mypid)
    True
    >>> pid_is_running(1000000) is None
    True
    """
    try:
        os.kill(pid, 0)

    except OSError:
        return

    else:
        return pid


def remove_pidfile(path_to_pidfile):
    if os.path.exists(path_to_pidfile):
        os.remove(path_to_pidfile)


def write_pidfile_or_die(path_to_pidfile):
    if os.path.exists(path_to_pidfile):
        pid = int(open(path_to_pidfile).read())

        if pid_is_running(pid):
            print("Only one lockscreen_monitor process is allowed (PID %s)."
                  % pid)
            raise SystemExit

        else:
            remove_pidfile(path_to_pidfile)

    open(path_to_pidfile, 'w').write(str(os.getpid()))
    return path_to_pidfile


if __name__ == '__main__':
    # check if there is an existing pid for lockscreen monitor
    write_pidfile_or_die(PID_FILE)

    try:
        # on startup handle as if screensaver deactivated
        handle_activated(False)

        cmd = subprocess.Popen(["dbus-monitor \"type='signal',interface="
                                "'org.gnome.ScreenSaver'\""], shell=True,
                               stdout=subprocess.PIPE)

        running = 0
        while 1:
            time.sleep(0.1)
            if running:
                line = cmd.stdout.readline()
                rows = []
                handle_activated('true' in line)

            running = 0
            line = cmd.stdout.readline()
            if "ActiveChange" in line and 'org.gnome.ScreenSaver' in line:
                running = 1
    except (SystemError, IOError, KeyboardInterrupt) as e:
        remove_pidfile(PID_FILE)
        raise(e)
