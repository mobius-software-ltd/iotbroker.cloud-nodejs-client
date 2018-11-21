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

var AMQPHeader = require('../../header/api/AMQPHeader');
var TLVList = require('../../tlv/impl/TLVList');

function AMQPPing(code, doff, type, channel) {
   var code = code;
   var doff = 2;
   var channel = channel;
   var type = type;
    return {
        getClassName: function() {
            return 'AMQPPing'
        },
        getCode: function() {
            return code;
        },
        toArgumentsList: function () {
            return null;
        },
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
            if (!AMQPHeader.equals(obj))
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            return true;
        },
        getDoff: function () {
            return doff;
        },
        setDoff: function (newDoff) {
            doff = newDoff;
        },
        getType: function () {
            return type;
        },
        setType: function (newType) {
            type = newType;
        },
        getChannel: function () {
            return channel;
        },
        setChannel: function (newChannel) {
            channel = newChannel;
        },
    }
}

module.exports = AMQPPing;