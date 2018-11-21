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
        AMQPType: {
            SOURCE: 0x28,
            TARGET: 0x29,
            ERROR: 0x1D,
            NULL: 0x40,
            BOOLEAN: 0x56,
            BOOLEAN_TRUE: 0x41,
            BOOLEAN_FALSE: 0x42,
            UBYTE: 0x50,
            USHORT: 0x60,
            UINT: 0x70,
            SMALL_UINT: 0x52,
            UINT_0: 0x43,
            ULONG: 0x80,
            SMALL_ULONG: 0x53,
            ULONG_0: 0x44,
            BYTE: 0x51,
            SHORT: 0x61,
            INT: 0x71,
            SMALL_INT: 0x54,
            LONG: 0x81,
            SMALL_LONG: 0x55,
            FLOAT: 0x72,
            DOUBLE: 0x82,
            DECIMAL_32: 0x74,
            DECIMAL_64: 0x84,
            DECIMAL_128: 0x94,
            CHAR: 0x73,
            TIMESTAMP: 0x83,
            UUID: 0x98,
            BINARY_8: 0xA0,
            BINARY_32: 0xB0,
            STRING_8: 0xA1,
            STRING_32: 0xB1,
            SYMBOL_8: 0xA3,
            SYMBOL_32: 0xB3,
            LIST_0: 0x45,
            LIST_8: 0xC0,
            LIST_32: 0xD0,
            MAP_8: 0xC1,
            MAP_32: 0xD1,
            ARRAY_8: 0xE0,
            ARRAY_32: 0xF0
        }, 
        HeaderCode: {
            OPEN: 0x10,
            BEGIN: 0x11,
            ATTACH: 0x12,
            FLOW: 0x13,
            TRANSFER: 0x14,
            DISPOSITION: 0x15,
            DETACH: 0x16,
            END: 0x17,
            CLOSE: 0x18,
            MECHANISMS: 0x40,
            INIT: 0x41,
            CHALLENGE: 0x42,
            RESPONSE: 0x43,
            OUTCOME: 0x44,
            PING: 0xff,
            PROTO: 0xfe
        },
        SectionCode: {
            HEADER: 0x70,
            DELIVERY_ANNOTATIONS: 0x71,
            MESSAGE_ANNOTATIONS: 0x72,
            PROPERTIES: 0x73,
            APPLICATION_PROPERTIES: 0x74,
            DATA: 0x75,
            SEQUENCE: 0x76,
            VALUE: 0x77,
            FOOTER: 0x78
        },
        StateCode: {
            RECEIVED: 0x23,
            ACCEPTED: 0x24,
            REJECTED: 0x25,
            RELEASED: 0x26,
            MODIFIED: 0x27
        },
        OutcomeCode: {
            OK: 0, 
            AUTH: 1,
            SYS: 2,
            SYS_PERM: 3,
            SYS_TEMP: 4
        },
        RoleCode: {
            SENDER: false,
            RECEIVER: true
        },
        SendCode: {
            UNSETTLED: 0,
            SETTLED: 1,
            MIXED: 2
        },
        TerminusDurability: {
            NONE: 0,
            CONFIGURATION: 1,
            UNSETTLED_STATE: 2
        },
        QoS: {
            AT_MOST_ONCE: 0,
            AT_LEAST_ONCE: 1,
            EXACTLY_ONCE: 2
        },
        TerminusExpiryPolicy: {
            LINK_DETACH: "link-detach",
            SESSION_END: "session-end",
            CONNETION_CLOSE: "connection-close",
            NEVER: "never"
        },
        ReceiveCode: {
            FIRST: 0,
            SECOND: 1
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