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

'use strict';

var HEADERCode = require('../../avps/HeaderCode');

function AMQPHeader(code, doff, type, channel) {
    this.code = code;
    this.doff = doff;
    this.channel = channel;
    this.type = type;
    return {
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + channel;
            result = prime * result + ((code == null) ? 0 : code.hashCode());
            result = prime * result + doff;
            result = prime * result + type;
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            if (this !== obj)
                return false;
            var other = obj;
            if (channel != other.channel)
                return false;
            if (code != other.code)
                return false;
            if (doff != other.doff)
                return false;
            if (type != other.type)
                return false;
            return true;
        },
        getDoff: function() {
            return doff;
        },
        setDoff: function(newDoff) {
            this.doff = newDoff;
        },
        getType: function() {
            return type;
        },
        setType: function(newType) {
            this.type = newType;
        },
        getChannel: function() {
            return channel;
        },
        setChannel: function(newChannel) {
            this.channel = newChannel;
        },
    }
}
module.exports = AMQPHeader;