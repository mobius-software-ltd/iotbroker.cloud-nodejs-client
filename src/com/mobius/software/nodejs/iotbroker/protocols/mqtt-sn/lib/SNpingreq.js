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


function SNpingreq(ID) {
    var clientID = ID;
   
    return {
        reInit: function(ID) {
            clientID = ID;
            return this;
        },
        getLength: function() {
            var length = 2;
            if(clientID != null) {
                length += clientID.length
            }
            return length;
        },
        getType: function() {
            return ENUM.MessageType.SN_PINGREQ;
        },
        getClientID: function() {
            return clientID;
        },
        setClientID: function(newclientID) {
            if (typeof newclientID != 'string') throw new Error("Method setClientID() in Connect class accepts only a string!");

            clientID = newclientID;
        },
        processBy: function(device) {
            device.processPingreq();
        }
    }
}

module.exports = SNpingreq;