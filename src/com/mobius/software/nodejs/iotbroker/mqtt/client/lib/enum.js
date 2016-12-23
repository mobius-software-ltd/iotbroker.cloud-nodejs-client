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

function ENUM() {
    return {
        ConnackCode: {
            ACCEPTED: 0,
            UNACCEPTABLE_PROTOCOL_VERSION: 1,
            IDENTIFIER_REJECTED: 2,
            SERVER_UNUVALIABLE: 3,
            BAD_USER_OR_PASS: 4,
            NOT_AUTHORIZED: 5
        },
        MessageType: {
            CONNECT: 1,
            CONNACK: 2,
            PUBLISH: 3,
            PUBACK: 4,
            PUBREC: 5,
            PUBREL: 6,
            PUBCOMP: 7,
            SUBSCRIBE: 8,
            SUBACK: 9,
            UNSUBSCRIBE: 10,
            UNSUBACK: 11,
            PINGREQ: 12,
            PINGRESP: 13,
            DISCONNECT: 14
        },
        QoS: {
            AT_MOST_ONCE: 0,
            AT_LEAST_ONCE: 1,
            EXACTLY_ONCE: 2
        },
        SubackCode: {
            ACCEPTED_QOS0: 0,
            ACCEPTED_QOS1: 1,
            ACCEPTED_QOS2: 2,
            FAILURE: 128
        },
        PingStatus: {
            NEW: 0,
            INITIALIZED: 1,
            SENT: 2,
            RECEIVED: 3,
            LOST: 4
        },

        getKeyByValue: function(obj, value) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (obj[prop] === value)
                        return prop;
                }
            }
        }
    }

}

module.exports = ENUM();