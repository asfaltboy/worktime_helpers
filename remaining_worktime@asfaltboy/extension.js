const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const fileUtils = imports.misc.fileUtils;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const GLib = imports.gi.GLib;

let text, button, time, message, loopCall=null, timeLabel, firstRun=true;
let requiredTime = 180;
let blink = '';

const REFRESH_INTERVAL = 120;
const SHOW_BLINKING = false;
const REQUIRED_HOURS_DAY = 9;
const WEEKEND_DAYS = [5, 6];


function _hideHello() {
    Main.uiGroup.remove_actor(text);
    text = null;
}

function _showHello() {
    if (!text) {
        text = new St.Label({ style_class: 'message-label', text: message });
        Main.uiGroup.add_actor(text);
    }

    text.opacity = 255;

    let monitor = Main.layoutManager.primaryMonitor;

    text.set_position(Math.floor(monitor.width / 2 - text.width / 2),
                      Math.floor(monitor.height / 2 - text.height / 2));

    Tweener.addTween(text,
                     { opacity: 0,
                       time: 2,
                       transition: 'easeOutQuad',
                       onComplete: _hideHello });
}

function calculateTotalTime(lines) {
  let hours = 0;
  lines.forEach(function(d) {
    let times = d.split(',');
    if (!times || times.length != 3) return true;  // skip bad times
    if (times[1] == 0 || times[2] == 0) return true;  // skip 0 times
    hours += getHoursWorked(times);
  });
  return hours;
}

function calculateWorkedToday(line) {
  let times = line.split(',');
  if (!times || times.length != 3) return 0;  // skip bad times
  if (times[1] == 0 || times[2] == 0) return 0;  // skip 0 times
  return getHoursWorked(times);
}

function getHoursWorked(times) {
  let t1 = new Date();
  t1.setHours(times[1].split(':')[0]);
  t1.setMinutes(times[1].split(':')[1]);

  let t2 = new Date();
  t2.setHours(times[2].split(':')[0]);
  t2.setMinutes(times[2].split(':')[1]);

  return (t2 - t1) / 1000 / 60 / 60;  // return delta in hours
}

function getHoursFileContent(now) {
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  month = (month < 10) ? '0' + month : month;
  let path = '/home/pavel/hours_logs/';
  return Shell.get_file_contents_utf8_sync(path + year + '-' + month + '.csv');
}

function checkRemainingTime() {
  let now = new Date();
  if (now % 60 == 0 || firstRun == true) {
    firstRun = false;
    let content = getHoursFileContent(now);
    if (content) {
      // pass all days - skip header
      let totalWorked = calculateTotalTime(content.split('\n').slice(1));
      let todays_hours = content.split('\n').slice(-1)[0];
      delta = totalWorked - calculateElapsedWorkHours() + calculateWorkedToday(todays_hours);
      message = 'Total hours worked this month: ' + totalWorked.toFixed(0) +
                '\nBalance delta: ' + delta.toFixed(0);
      time = 'Remaining: ' + (requiredTime - totalWorked).toFixed(0) + ' h ' + blink;
    } else {
      time = 'Remaining: ' + requiredTime;
    }
  }

  if (SHOW_BLINKING) blink = (!!blink) ? '' : '*';
  if (timeLabel !== undefined) timeLabel.set_text(time);
  return true
}

function range(start, count) {
    return Array.apply(0, Array(count))
                .map(function (element, index) { 
                         return index + start;  
                     });
}

function getWorkDaysInMonth(m, y) {
  /*
  Utility to return number of work days in a month, accepts
  (new Date()).getMonth() as first param, the year (i.e 2014).

  Skips days weekend days as defined in WEEKEND_DAYS.

  Credit: SO: http://stackoverflow.com/questions/1810984/number-of-days-in-any-month/21374587
  */
    var work_days = 0;
    var days = /4|6|9|11/.test(++m)?30:m==2?(!(y%4)&&y%100)||!(y%400)?29:28:31;
    range(1, days).forEach(function(d) {
      if (WEEKEND_DAYS.indexOf((new Date(y, m, d)).getDay()) === -1) work_days++;
    });
    return work_days;
}

function calculateRequiredTime() {
  /*
  calculates the number of days in the current month and returns
  the required number of work hours.
  */
  let today = new Date();
  requiredTime = REQUIRED_HOURS_DAY * getWorkDaysInMonth(today.getMonth(), today.getFullYear());
}

function getElapsedWorkDays() {
  var work_days = 0;
  var today = new Date();
  range(1, today.getDate()).forEach(function(d) {
    if (WEEKEND_DAYS.indexOf((new Date(today.getFullYear(), today.getMonth(), d)).getDay()) === -1) work_days++;
  });
  return work_days - 1;
}

function calculateElapsedWorkHours() {
  /*
  calculates the number of days in the current month and returns
  the required number of work hours.
  */
  let today = new Date();
  return REQUIRED_HOURS_DAY * getElapsedWorkDays();
}

function init() {
    calculateRequiredTime();
    checkRemainingTime();
    timeLabel = new St.Label({ text: time });
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    let icon = new St.Icon({ icon_name: 'system-run-symbolic',
                             style_class: 'system-status-icon' });

    button.set_child(icon);
    button.set_child(timeLabel);
    button.connect('button-press-event', _showHello);
}

function enable() {
    loopCall = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, REFRESH_INTERVAL,
      Lang.bind(this, checkRemainingTime));
    loopCall = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3600 * 6,
      Lang.bind(this, calculateRequiredTime));
    Main.panel._centerBox.insert_child_at_index(button, 0);
}

function disable() {
    Main.panel._centerBox.remove_child(button);
    Mainloop.source_remove(loopCall);
}
