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


function Connect(options) {
    // console.log(arguments[0]);

    var username;
    var password;
    var clientID;

    var protocolLevel = 4; //DEFAULT VALUE
    var PROTOCOL_NAME = "MQTT";
    var cleanSession;
    var keepalive;

    var will;

    if (typeof options === 'undefined') {
        throw new Error("Missing options for connect!");
    }


    username = options.username;
    password = options.password;
    clientID = options.clientID;

    cleanSession = options.isClean;
    keepalive = options.keepalive;
    will = options.will;

    return {
        reInit: function(options) {
            username = options.username;
            password = options.password;
            clientID = options.clientID;

            cleanSession = options.isClean;
            keepalive = options.keepalive;
            will = options.will;
            return this;
        },
        getUsername: function() {
            return username;
        },
        getType: function() {
            return ENUM.MessageType.CONNECT;
        },
        processBy: function(device) {
            // console.log(username.length);
            device.processConnect({
                cleanSession: cleanSession,
                keepalive: keepalive,
                will: will
            })
        },
        getLength: function() {
            var length = 10;
            length += clientID.length + 2;
            length += this.isWillFlag() ? will.retrieveLength() : 0;
            // console.log(will);
            length += username != null ? username.length + 2 : 0;
            length += password != null ? password.length + 2 : 0;
            return length;
        },
        getProtocolLevel: function() {
            return protocolLevel;
        },
        setProtocolLevel: function(level) {
            if (typeof level != 'number') throw new Error("Method setProtocolLevel() in Connect class accepts only a number!");

            protocolLevel = level;
        },
        isClean: function() {
            return cleanSession;
        },
        setCleanSession: function(newCleanSession) {
            if (typeof newCleanSession != 'boolean') throw new Error("Method setCleanSession() in Connect class accepts only a boolean value!");

            cleanSession = newCleanSession;
        },
        isWillFlag: function() {
            return will != null;
        },
        getWill: function() {
            return will;
        },
        setWill: function(newWill) {
            will = newWill;
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
        getUserName: function() {
            return username;
        },
        setUsername: function(newUsername) {
            if (typeof newUsername != 'string') throw new Error("Method setUsername() in Connect class accepts only a string!");
            username = newUsername;
        },
        getPassword: function() {
            return password;
        },
        setPassword: function(newPassword) {
            if (typeof newPassword != 'string') throw new Error("Method setPassword() in Connect class accepts only a string!");

            password = newPassword;
        },
        isUsernameFlag: function() {
            return username != null;
        },
        isPasswordFlag: function() {
            return password != null;

        },
        getName: function() {
            return PROTOCOL_NAME;
        }
    }
}

module.exports = Connect;