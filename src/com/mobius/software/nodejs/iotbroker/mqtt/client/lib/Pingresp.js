'use strict'
var ENUM = require('./enum');


function Pingresp() {

    return {
        getLength: function() {
            return 0;
        },
        getType: function() {
            return ENUM.MessageType.PINGRESP;
        },
        processBy: function(device) {
            device.processPingresp();
        }
    }
}

module.exports = Pingresp;