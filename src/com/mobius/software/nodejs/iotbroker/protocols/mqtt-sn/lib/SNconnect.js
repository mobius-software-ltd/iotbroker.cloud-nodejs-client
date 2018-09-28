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
var ENUM = require('../lib/enum');


function SNconnect(options) {
    // console.log(arguments[0]);

     var clientID;

    var protocolLevel = 1; //DEFAULT VALUE
    var PROTOCOL_NAME = "MQTT-SN";
    var cleanSession;
    var keepalive;
    var willFlag;

    if (typeof options === 'undefined') {
        throw new Error("Missing options for connect!");
    }    
    clientID = options.clientID;
    cleanSession = options.cleanSession;
    keepalive = options.keepalive;
    willFlag = options.willFlag;

    return {
        reInit: function(options) {
            clientID = options.clientID;
            cleanSession = options.cleanSession;
            keepalive = options.keepalive;
            willFlag = options.willFlag;
            return this;
        },
        // getUsername: function() {
        //     return username;
        // },
        getType: function() {
            return ENUM.MessageType.SN_CONNECT;
        },
        processBy: function(device) {
            // console.log(username.length);
            device.processConnect({
                cleanSession: cleanSession,
                keepalive: keepalive
            })
        },
        getLength: function() {
            var length = 6;
            if(clientID != null) {
                length += clientID.length;
            }
            return length;
        },
        getProtocolLevel: function() {
            return protocolLevel;
        },
        setProtocolLevel: function(level) {
            if (typeof level != 'number') throw new Error("Method setProtocolLevel() in Connect class accepts only a number!");

            protocolLevel = level;
        },
        getCleanSession: function() {
            return cleanSession;
        },
        setCleanSession: function(newCleanSession) {
            if (typeof newCleanSession != 'boolean') throw new Error("Method setCleanSession() in Connect class accepts only a boolean value!");

            cleanSession = newCleanSession;
        },
        getWillFlag: function() {
            return willFlag;
        },  
        setWillFlag: function(value) {
            willFlag = value;
        },      
        getKeepAlive: function() {
            return keepalive;
        },
        setKeepAlive: function(newKeepAlive) {
            if (typeof newKeepAlive != 'number') throw new Error("Method setKeepAlive() in Connect class accepts only a number!");

            keepalive = newKeepAlive;
        },
        getClientID: function() {
            return clientID;
        },
        setClientID: function(newclientID) {
            if (typeof newclientID != 'string') throw new Error("Method setClientID() in Connect class accepts only a string!");

            clientID = newclientID;
        },       
        getName: function() {
            return PROTOCOL_NAME;
        }
    }
}

module.exports = SNconnect;