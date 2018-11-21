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

function AMQPDecimal(value, type) {
    this.value = value;
    this.type = type;
    return {
        getAMQPType: function() {
            return this.type;
        },
        setAMQPType: function(type) {
            this.type = type;
        },
        AMQPDecimalByte: function (b) {
            this.value = Buffer.alloc(1).writeUInt8(b, 0);
        },
        AMQPDecimalShort: function (s) {
            this.value = Buffer.alloc(2).writeUInt16BE(s, 0);
        },
        AMQPDecimalInt: function (i) {
            this.value = Buffer.alloc(4).writeUInt32BE(i, 0);
        },
        AMQPDecimalLong: function (l) {
            this.value = Buffer.alloc(8).writeDoubleBE(l, 0);
        },
        AMQPDecimalFloat: function (f) {
            this.value = Buffer.alloc(4).writeFloatBE(f, 0);
        },
        AMQPDecimalDouble: function (d) {
            this.value = Buffer.alloc(8).writeDoubleBE(d, 0);
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + Arrays.hashCode(value);
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


            if (value.length !== other.value.length) {
                return false;
            }
            for (var i = 0, l = value.length; i < l; i++) {
                if (value[i] instanceof Array && other.value[i] instanceof Array) {
                    if (value[i] != other.value[i]) {
                        return false;
                    }
                }
                else if (value[i] !== other.value[i]) {
                    return false;
                }
            }

            return true;
        },
        getDouble: function () {
            return value.readDoubleBE(0).toString();
        },
        getLong: function () {
            return value.readDoubleBE(0).toString();
        },
        getInt: function () {
            return value.readUInt32BE(0).toString();
        },
        getFloat: function () {
            return value.readFloatBE(0).toString();
        },
        getShort: function () {
            return value.readUInt16BE(0).toString();
        },
        getByte: function () {
            return value.readUInt8(0).toString();
        },
        getValue: function () {
            return value;
        }
    }
}

module.exports = AMQPDecimal;