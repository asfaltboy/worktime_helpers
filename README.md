# Worktime Helpers

## Introduction
Some work places and contracts require employees to "clock" a given number of
work hours.

As it so happened I used to work in one of these, and I found it a bit hard
to keep track of the hours. So I wrote a couple of small helpers to register
and monitor the work hours.


## Structure

This repo includes 2 parts:

1. A python script intended to run as a service or otherwise be run on system
start-up (for instance added in: `gnome-session-properties`).

    This script runs dbus-monitor (so be sure it's reachable on system path) and
writes the first screen unlock and last lock of each day into a csv file.

2. A gnome-shell extension to display the remaining time to work this month.

## Installation

Run `python lockscreen_monitor.py` (I recommend to run it on start up to avoid forgetting to run it).

Place the extension where gnome-shell can find it, e.g:

    ~/.local/share/gnome-shell/extensions/

Enable the extension, easily done using a toole such as: [`gnome-tweak-tool`][1]

## Customization

#### `lockscreen_monitor.py`:

* `CSV_FILE = '~/hours_logs/{}.csv'` - where you want to store the logs.
* `PID_FILE = '/tmp/lockscreen_monitor.pid'` - where to store the pid file (to allow only 1 instance to run simultaniously).

#### `extension.js`:

* `REFRESH_INTERVAL = 120` - update frequency
* `SHOW_BLINKING = false` - toggle blinking dot on every update
* `REQUIRED_HOURS_DAY = 9` - how many hours are required per work day
* `WEEKEND_DAYS = [5, 6]` - which days of the week are weekends (0-6 where 0 = sunday)
___

[1]: https://wiki.gnome.org/action/show/Apps/GnomeTweakTool?action=show&redirect=GnomeTweakTool
