'use strict'
var Timers = require('timers');


function Timer(params) {
    var times = params.times || 0;
    var counter = 0;

    var timer = Timers.setInterval(function() {
        params.callback();
        if (++counter == times)
            stopTimer();
    }, params.interval);

    return {
        getTimer: getTimer,
        stopTimer: stopTimer,
    }

    function getTimer() {
        return timer;
    }

    function stopTimer() {
        Timers.clearInterval(timer);
        console.log('timer stopped');
    }
}

module.exports = Timer;