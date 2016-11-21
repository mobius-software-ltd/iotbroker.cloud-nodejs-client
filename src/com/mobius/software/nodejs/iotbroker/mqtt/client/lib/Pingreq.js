'use strict'
var ENUM = require('./enum');


function Pingreq() {

    return {
        getLength: function() {
            return 0;
        },
        getType: function() {
            return ENUM.MessageType.PINGREQ;
        },
        processBy: function(device) {
            device.processPingreq();
        }
    }
}

module.exports = Pingreq;