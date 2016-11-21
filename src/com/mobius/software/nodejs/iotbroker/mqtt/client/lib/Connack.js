'use strict'
var ENUM = require('./enum');


function Connack(options) {
    var sessionPresent;
    var returnCode;

    if (typeof options === 'undefined') {
        throw new Error("Missing options for Connack!");
    }

    sessionPresent = options.sessionPresent;
    returnCode = options.returnCode;

    return {
        reInit: function(newSessionPresent, newReturnCode) {
            sessionPresent = newSessionPresent;
            returnCode = newReturnCode;

            return this;
        },
        getLength: function() {
            return 2;
        },
        processBy: function(device) {
            device.processConnack({
                returnCode: returnCode,
                sessionPresent: sessionPresent
            })
        },
        getType: function() {
            return ENUM.MessageType.CONNACK;
        },
        isSessionPresent: function() {
            return sessionPresent;
        },
        setSessionPresent: function(newSessionPresent) {
            if (typeof newSessionPresent != 'boolean') throw new Error("Method setSessionPresent() in Connack class accepts only a boolean value!");

            sessionPresent = newSessionPresent;
        },
        getReturnCode: function() {
            return returnCode;
        },
        setReturnCode: function(newReturnCode) {
            returnCode = newReturnCode;
        }

    }
}

module.exports = Connack;