// 'use strict'

var Timers = function Timers() {
        var timers = [];

        this.releaseTimer = function(index) {
            // console.log('index get:', index);
            // console.log(timers[index]);
            if (typeof timers[index] == 'undefined') return;
            timers[index].stopTimer();
            delete timers[index];
        }

        this.setTimer = function(i, timer) {
            timers[i] = timer;
            console.log('index set:', i);
        }

        // this.contains = function(t) {
        //     return (timers.indexOf(t) > -1) ? true : false;
        // }

        // if (Timers.caller != Timers.getInstance) {
        //     throw new Error("This object cannot be instanciated");
        // }
    }
    // Timers.instance = null;

// Timers.getInstance = function() {
//     if (this.instance === null) {
//         this.instance = new Timers();
//     }
//     return this.instance;
// }

module.exports = Timers;
// module.exports = Timers.getInstance();