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
            SN_ADVERTISE: 0,
            SN_SEARCHGW: 1,
            SN_GWINFO: 2,
            SN_CONNECT: 4,
            SN_CONNACK: 5,
            SN_WILLTOPICREQ: 6,
            SN_WILLTOPIC: 7,
            SN_WILLMSGREQ: 8,
            SN_WILLMSG: 9,
            SN_REGISTER: 10,
            SN_REGACK: 11,
            SN_PUBLISH: 12,
            SN_PUBACK: 13,
            SN_PUBCOMP: 14,
            SN_PUBREC: 15,
            SN_PUBREL: 16,
            SN_SUBSCRIBE: 18,
            SN_SUBACK: 19,
            SN_UNSUBSCRIBE: 20,
            SN_UNSUBACK: 21,
            SN_PINGREQ: 22,
            SN_PINGRESP: 23,
            SN_DISCONNECT: 24,
            SN_WILLTOPICUPD: 26,
            SN_WILLTOPICRESP: 27,
            SN_WILLMSGUPD: 28,
            SN_WILLMSGRESP: 29,
            SN_ENCAPSULATED: 254,
        },
        QoS: {
            AT_MOST_ONCE: 0,
            AT_LEAST_ONCE: 1,
            EXACTLY_ONCE: 2,
            LEVEL_ONE: 3
        },
        SubackCode: {
            ACCEPTED_QOS0: 0,
            ACCEPTED_QOS1: 1,
            ACCEPTED_QOS2: 2,
            FAILURE: 128
        },
        ReturnCode: {
            SN_ACCEPTED_RETURN_CODE: 0,
            SN_CONGESTION_RETURN_CODE: 1,
            SN_INVALID_TOPIC_ID_RETURN_CODE:  2,
            SN_NOT_SUPPORTED_RETURN_CODE: 3,
        },
        PingStatus: {
            NEW: 0,
            INITIALIZED: 1,
            SENT: 2,
            RECEIVED: 3,
            LOST: 4
        },
        TopicType: {
            UNKNOWN: -1,
            NAMED: 0,
            ID: 1,
            SHORT: 2
        },
        Flags: {
            SN_DUPLICATE_FLAG: 128,
            SN_QOS_LEVEL_ONE_FLAG: 96,
            SN_QOS_2_FLAG: 64,
            SN_QOS_1_FLAG: 32,
            SN_RETAIN_FLAG: 16,
            SN_WILL_FLAG: 8,
            SN_CLEAN_SESSION_FLAG: 4,
            SN_RESERVED_TOPIC_FLAG: 3,
            SN_SHORT_TOPIC_FLAG: 2,
            SN_ID_TOPIC_FLAG: 1
        },

        THREE_OCTET_LENGTH_SUFFIX: 1,
        
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