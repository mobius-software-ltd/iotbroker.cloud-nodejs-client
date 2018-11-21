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

function AMQPMessageFormat(messageFormat, version) {
    this.messageFormat = messageFormat;
    this.version = version;
    return {
        AMQPMessageFormatLong: function (value) {
            var arr = Buffer.alloc(4).writeUInt16BE(value, 0);
            var mf = Buffer.alloc(4);
            mf.write(arr.splice(0, 3), 1)
            messageFormat = mf.readUInt16BE(0)
            version = arr[3] & 0xff;
        },
        
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + messageFormat;
            result = prime * result + version;
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            // if (getClass() != obj.getClass())
            // 	return false;
            var other = obj;
            if (messageFormat != other.messageFormat)
                return false;
            if (version != other.version)
                return false;
            return true;
        },
        getMessageFormat: function () {
            return this.messageFormat;
        },
        getVersion: function () {
            return this.version;
        },
        encode: function () {
          //  var arr = Buffer.alloc(0);
           // var mf = Buffer.alloc(4).writeUInt32BE(messageFormat);
           // System.arraycopy(mf, 1, arr, 0, 3);
           // arr.write(mf.splice(1, 3), 0)
            var arr = Buffer.alloc(3, this.messageFormat)
           // arr.write(this.messageFormat);
            arr = Buffer.concat([arr, Buffer.alloc(1,this.version)], 4);
           // arr[3] = this.version;
            return arr.readUInt32BE(0);
        }
    }
}
module.exports = AMQPMessageFormat;