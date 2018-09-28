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
var ENUM = require('../../lib/enum');
function FullTopic(topic, qos) {
    var topic = topic;
    var qos = qos;
    
    return {
        reInit: function(topic, qos) {
            topic = topic;
            qos = qos;
            return this;
        },
        getType: function() {

            return ENUM.TopicType.NAMED;
        },
        encode: function() {            
            return topic.toString('utf8');
        },
        getQos: function() {
            return qos;

        },
        getLength: function() {
            return topic.length;
        },
        getTopic: function() {
            return topic;
        },
        setTopic: function(value) {
            topic = value;
        },
        setQos: function(value) {
            qos = value;
        },
        fullTopic: function(topic, qos) {
            return new FullTopic(topic, qos);
        }
    }
}

module.exports = FullTopic;