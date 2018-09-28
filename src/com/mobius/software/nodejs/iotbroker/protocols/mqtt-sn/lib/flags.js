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

function FLAGS(isDup, qos, isRetain, will, cleanSession, topicType) {
    var isDup = isDup;
    var qos = qos;
    var isRetain = isRetain;
    var will = will;
    var cleanSession = cleanSession;
    var topicType = topicType;

    return {
        decodeFlags: function(flagsByte, type) {
            var bitMask = [];
           var flags = [];          

            flags.push(ENUM.Flags.SN_DUPLICATE_FLAG);
            flags.push(ENUM.Flags.SN_QOS_LEVEL_ONE_FLAG);
            flags.push(ENUM.Flags.SN_QOS_2_FLAG);
            flags.push(ENUM.Flags.SN_QOS_1_FLAG);
            flags.push(ENUM.Flags.SN_RETAIN_FLAG);
            flags.push(ENUM.Flags.SN_WILL_FLAG);
            flags.push(ENUM.Flags.SN_CLEAN_SESSION_FLAG);
            flags.push(ENUM.Flags.SN_RESERVED_TOPIC_FLAG);
            flags.push(ENUM.Flags.SN_SHORT_TOPIC_FLAG);
            flags.push(ENUM.Flags.SN_ID_TOPIC_FLAG);
              for(var i=0; i<flags.length; i++) {
                
                if((flagsByte & flags[i]) == flags[i]) {
                    bitMask.push(flags[i])
                }
            };
            
            return createFlag(bitMask, type);

             
                function createFlag(bitMask, type) {
                    var dup, retain, will, cleanSession;
                    dup = bitMask.includes(ENUM.Flags.SN_DUPLICATE_FLAG) ? true: false;
                    retain = bitMask.includes(ENUM.Flags.SN_RETAIN_FLAG) ? true: false;
                    will = bitMask.includes(ENUM.Flags.SN_WILL_FLAG) ? true: false;
                    cleanSession = bitMask.includes(ENUM.Flags.SN_CLEAN_SESSION_FLAG) ? true: false;
                    var qos = null;

                    if (bitMask.includes(ENUM.Flags.SN_QOS_LEVEL_ONE_FLAG)) {
                        qos = ENUM.QoS.LEVEL_ONE;
                    } else if (bitMask.includes(ENUM.Flags.SN_QOS_2_FLAG)) {
                        qos = ENUM.QoS.EXACTLY_ONCE;
                    } else if (bitMask.includes(ENUM.Flags.SN_QOS_1_FLAG)) {
                        qos = ENUM.QoS.AT_LEAST_ONCE;
                    } else {
                        qos = ENUM.QoS.AT_MOST_ONCE;
                    }
                     var topicType = ENUM.TopicType.UNKNOWN;

                    if (bitMask.includes(ENUM.TopicType.SHORT)) {
                        topicType = ENUM.TopicType.SHORT;
                    } else if (bitMask.includes(ENUM.TopicType.ID)) {
                        topicType = ENUM.TopicType.ID;
                    } else {
                        topicType = ENUM.TopicType.NAMED;
                    }
                    var res = {
                        dup: dup,
                        retain: retain, 
                        will: will,
                        cleanSession: cleanSession,
                        qos: qos, 
                        topicType: topicType
                    }
                   return res;
                }
            },
        encodeFlags: function(isDup, qos, isRetain, will, cleanSession, topicType) {
            var flagsByte = 0;  
           if (isDup) {
                flagsByte += ENUM.Flags.SN_DUPLICATE_FLAG;
            }
            if (qos) {
                flagsByte += (qos << 5);
            }
            if (isRetain) {
                flagsByte += ENUM.Flags.SN_RETAIN_FLAG;
            }
            if (will) {  
               flagsByte += ENUM.Flags.SN_WILL_FLAG;
            }
            if (cleanSession) {
                flagsByte += ENUM.Flags.SN_CLEAN_SESSION_FLAG;
            }
            if (topicType != ENUM.TopicType.UNKNOWN) {                
                 flagsByte += topicType;
            }           
            return flagsByte;
        },
        isDup: function() {
            return isDup;
        },
        setDup: function(value) {
            isDup = value;
        },
        getQos: function() {
            return qos;
        },
        setQos: function(value) {
            qos = value;
        },
        getIsRetain: function() {
            return isRetain;
        },
        setIsRetain: function(value) {
            isRetain = value;
        },  
        getWill: function() {
            return will;
        },
        setWill: function(value) {
            will = value;
        },       
        getCleanSession: function() {
            return cleanSession;
        },
        setCleanSession: function(newCleanSession) {
            cleanSession = newCleanSession;
        },
        getTopicType: function() {
            return topicType;
        },
        setTopicType: function(value) {
            topicType = value;
        },
    }
}
module.exports = FLAGS();