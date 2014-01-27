const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const fileUtils = imports.misc.fileUtils;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const GLib = imports.gi.GLib;

let text, button, time, message, loopCall=null, timeLabel;
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
    let t1 = new Date();
    t1.setHours(times[1].split(':')[0]);
    t1.setMinutes(times[1].split(':')[1]);
    let t2 = new Date();
    t2.setHours(times[2].split(':')[0]);
    t2.setMinutes(times[2].split(':')[1]);
    let daily_seconds = t2 - t1;
    hours += daily_seconds / 1000 / 60 / 60;
  });
  return hours;
}

function checkRemainingTime() {
  let path = '/home/pavel/hours_logs/';
  let now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (month < 10) month = '0' + month;
  let content = Shell.get_file_contents_utf8_sync(path + year + '-' + month + '.csv');
  if (content) {
    let totalPassed = calculateTotalTime(content.split('\n').slice(1));  // pass all days - skip header
    message = 'Total hours worked this month: ' + totalPassed.toFixed(0);
    if (SHOW_BLINKING) blink = (!!blink) ? '' : '*';
    time = 'Remaining: ' + (requiredTime - totalPassed).toFixed(0) + ' h ' + blink;
    if (timeLabel !== undefined) timeLabel.set_text(time);
  }
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
