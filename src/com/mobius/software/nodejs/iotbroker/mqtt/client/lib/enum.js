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