'use strict'
var ENUM = require('./enum');


function Disconnect() {

    return {
        getLength: function() {
            return 0;
        },
        getType: function() {
            return ENUM.MessageType.DISCONNECT;
        },
        processBy: function(device) {
            device.processDisconnect();
        }
    }
}

module.exports = Disconnect;