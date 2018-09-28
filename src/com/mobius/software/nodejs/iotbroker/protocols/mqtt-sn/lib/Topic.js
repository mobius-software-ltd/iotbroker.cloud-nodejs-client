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

function Topic(newName, newQos) {
    var SEPARATOR = ":";
    var name;
    var qos;

    name = newName;
    qos = newQos;

    return {

        toString: function() {
            return name.toString() + SEPARATOR + qos;
        },
        getName: function() {
            return name;
        },
        setName: function(newName) {
            name = newName;
        },
        getQos: function() {
            return qos;
        },
        setQos: function(newQos) {
            qos = newQos;
        },
        getLength: function() {
            return name.length();
        },
        hashCode: function() {
            var prime = 31;
            var result = 1;
            result = prime * result + ((name == null) ? 0 : name.hashCode());
            return result;
        },
        equals: function(obj) {
            if (this == obj)
                return true;
            if (obj == null || typeof obj == 'undefined')
                return false;
            if (Topic.prototype.isPrototypeOf(obj))
                return true;

            var other = obj;
            if (name == null || typeof name == 'undefined') {
                if (other.name != null && typeof name != 'undefined')
                    return false;
            } else if (name == other.name)
                return false;
            return true;
        },
        valueOf: function(newTopic, newQos) {
            return new Topic(newTopic, newQos);
        }
    };
}

module.exports = Topic;