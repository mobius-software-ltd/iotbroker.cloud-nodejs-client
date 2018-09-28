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
var OPTION = require('../lib/option');

function COAPmessage(version, type, code, messageID, token, newOptions, payload) {
    var version = version ? version : 1;
    var type = type;
    var code= code;
    var messageID = messageID ? messageID : 0;
    var token = token ? token : null;
    var options = newOptions ? newOptions: [];
    var payload = payload;
   
    return {
        getLength: function() {            
            return 4;
        },
        getType: function() {
            return type;
        },
        getProtocol: function() {
            return ENUM.COAP_PROTOCOL;
        },
        addOption: function(type, string) {          
            if(string != null) 
            var option = OPTION(type, string.toString().length, string.toString()) 
            options.push(option)
        },
        getOptionValue: function(type) {
            for(var i=0; i<options.length; i++) {
               var option = options[i];
               if(option) {                                  
               if(option.getNumber() == type) {
                   
                   return option.getValue();
               }
            }
            }
        },
        getOptions: function() {
            options.sort(function(a,b) {
                if (a > b) {
                    return 1;
                  }
                  if (a < b) {
                    return -1;
                  }
                  return 0;
            })
            return options;
        },
        // getString: function() {
        //     return "version: " + version + "\n" +
        //             "type: " + type + "\n" +
        //             "token: " + token + "\n" +
        //             "code: " + code + "\n" +
        //             "messageID: " + messageID + "\n" +
        //             "payload: " + payload + "\n" +
        //             "options size: " + options.length + "\n";
        // },
        getVersion: function() {
            return version;
        },
        setVersion: function(value) {
            version = value;
        },
        setType: function(value) {
            type = value;
        },
        getToken: function() {
            return token;
        },
        setToken: function(value) {
            token = value;
        },
        getCode: function() {
            return code;
        },
        setCode: function(value) {
            code = value;
        },
        getMessageID: function() {
            return messageID;
        },
        setMessageID: function(value) {
            messageID = value;
        },
        getPayload: function() {
            return payload;
        },
        setPayload: function(value) {
            payload = value;
        },
    }
}

module.exports = COAPmessage;