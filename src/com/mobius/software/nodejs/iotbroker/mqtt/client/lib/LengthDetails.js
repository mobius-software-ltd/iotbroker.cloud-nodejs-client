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

function LengthDetails(newLength, newSize) {
    var length = newLength || 0;
    var size = newSize || 0;

    return {
        LengthDetails: function(newLength, newSize) {
            length = newLength;
            size = newSize;
        },

        getLength: function() {
            return length;
        },

        getSize: function() {
            return size;
        },

        decode: function(newBuffer) {
            var length = 0;
            var multiplier = 1;
            var bytesUsed = 0;
            var enc = 0;
            var index = newBuffer.index;
            do {
                if (multiplier > 128 * 128 * 128)
                    throw new Error("Method decode(buf) in LengthDetails class throwed error: Encoded length exceeds maximum of 268435455 bytes");

                // if (!buf.isReadable())
                //     return new LengthDetails(0, 0);

                // console.log(bytesUsed);
                enc = newBuffer.buf.readUInt8(index);
                index++;
                length += (enc & 0x7f) * multiplier;
                multiplier *= 128;
                bytesUsed++;
            }
            while ((enc & 0x80) != 0);
            this.LengthDetails(length, bytesUsed);
            return this;
        }
    }
}

module.exports = LengthDetails;