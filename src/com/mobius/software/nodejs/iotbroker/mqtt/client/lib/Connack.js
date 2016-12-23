/**
 * Mobius Software LTD
 * Copyright 2015-2016, Mobius Software LTD
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

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
        },
        getPacketID: function() {
            return 0;
        },

    }
}

module.exports = Connack;