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

var AMQPType = require('../../avps/AMQPType');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVArray = require('../../tlv/impl/TLVArray');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');
var TLVMap = require('../../tlv/impl/TLVMap');
var TLVNull = require('../../tlv/impl/TLVNull');
var TLVVariable = require('../../tlv/impl/TLVVariable');
var AMQPDecimal = require('../../wrappers/AMQPDecimal');
var AMQPSymbol = require('../../wrappers/AMQPSymbol');
var ENUM = require('../../../lib/enum')
function AMQPWrapper() {
    return {
        wrap: function (o) {

            var e = o.getAMQPType();
            var result = null;
            if (e == ENUM.AMQPType.BYTE) {
                result = this.wrapByte(o);
            } else if (e == ENUM.AMQPType.SHORT) {
                result = this.wrapShort(o);
            } else if (e == ENUM.AMQPType.INT) {
                result = o >= 0 ? this.wrapShort(o) : this.wrapInt(o);
            } else if (e == ENUM.AMQPType.LONG) {
                result = o >= 0 ? this.wrapInt(o) : this.wrapLong(o);
            } else if (e == ENUM.AMQPType.ULONG) {
                result = this.wrapULong(o);
            } else if (e == ENUM.AMQPType.STRING_8) {
                result = this.wrapString(o);
            } else if (e == ENUM.AMQPType.SYMBOL_8) {
                result = this.wrapSymbol(o);
            } else if (e == ENUM.AMQPType.BINARY_8) {
                result = this.wrapBinary(o);
            } else if (e == ENUM.AMQPType.BOOLEAN) {
                result = this.wrapBool(o);
            } else if (e == ENUM.AMQPType.CHAR) {
                result = this.wrapChar(o);
            } else if (e == ENUM.AMQPType.DOUBLE) {
                result = this.wrapDouble(o);
            } else if (e == ENUM.AMQPType.FLOAT) {
                result = this.wrapFloat(o);
            } else if (e == ENUM.AMQPType.UUID) {
                result = this.wrapUuid(o);
            } else if (e == ENUM.AMQPType.TIMESTAMP) {
                result = this.wrapTimestamp(o);
            } else if (e == ENUM.AMQPType.DECIMAL_32) {
                var val = o.getValue()
                if (val.length == 4) {
                    result = this.wrapDecimal32(o);
                } else if (val.length == 8) {
                    result = this.wrapDecimal64(o);
                } else if (val.length == 16) {
                    result = this.wrapDecimal128(o);
                }

            } else {
                throw new Error("Wrapper received unrecognized type");
            }

            return result;
        },
        wrapBool: function (b) {
            var code = b ? ENUM.AMQPType.BOOLEAN_TRUE : ENUM.AMQPType.BOOLEAN_FALSE;
            return new TLVFixed(code, Buffer.alloc(0));
        },
        wrapByte: function (b) {
            if (b < 0)
                throw new Error("negative value of " + b + " cannot be assignet to UBYTE type");

            return new TLVFixed(ENUM.AMQPType.BYTE, Buffer.from(b.toString()))
        },
        wrapUByte: function (b) {          
            if (b < 0)
                throw new IllegalArgumentException("negative value of " + b + " cannot be assignet to UBYTE type");

            return new TLVFixed(ENUM.AMQPType.UBYTE, Buffer.alloc(1, b));
        },
        wrapUInt: function (i) {
            if (i < 0)
                throw new Error("negative value of " + i + " cannot be assignet to UINT type");
            var value = this.convertUInt(i);
            var code = null;
            if (value.length == 0)
                code = ENUM.AMQPType.UINT_0;
            else if (value.length == 1)
                code = ENUM.AMQPType.SMALL_UINT;
            else if (value.length > 1)
                code = ENUM.AMQPType.UINT;

            return new TLVFixed(code, value);
        },
        wrapInt: function (i) {
            var value = this.convertUInt(i);
            var code = value.length > 1 ? ENUM.AMQPType.INT : ENUM.AMQPType.SMALL_INT;
            return new TLVFixed(code, value);
        },
        wrapULong: function (l) {
            if (l == null)
                throw new Error("Wrapper cannot wrap ulong null");
            if (l < 0)
                throw new Error("negative value of " + l + " cannot be assignet to ULONG type");
            var value = this.convertULong(l);
            var code = null;
            if (value.length == 0)
                code = ENUM.AMQPType.ULONG_0;
            else if (value.length == 1)
                code = ENUM.AMQPType.SMALL_ULONG;
            else
                code = ENUM.AMQPType.ULONG;
            return new TLVFixed(code, value);
        },
        wrapLong: function (l) {
            var value = this.convertLong(l);
            var code = value.length > 1 ? ENUM.AMQPType.LONG : ENUM.AMQPType.SMALL_LONG;

            return new TLVFixed(code, value);
        },
        wrapBinary: function (b) {

            if (b == null)
                throw new Error("Wrapper cannot wrap binary null");

            var code = b.length > 255 ? ENUM.AMQPType.BINARY_32 : ENUM.AMQPType.BINARY_8;

            return new TLVVariable(code, b);
        },
        wrapUuid: function (u) {
            if (u == null)
                throw new Error("Wrapper cannot wrap uuid null");
            return new TLVFixed(ENUM.AMQPType.UUID, Buffer.from(u.toString()));
        },
        wrapUShort: function (s) {
            if (s < 0)
                throw new Error("negative value of " + s + " cannot be assignet to USHORT type");
            var buf = Buffer.alloc(2);
            return new TLVFixed(ENUM.AMQPType.USHORT, buf.writeInt16BE(s));
        },
        wrapShort: function (s) {
            var buf = Buffer.alloc(2);
            return new TLVFixed(ENUM.AMQPType.SHORT, buf.writeInt16BE(s));
        },
        wrapDouble: function (d) {
            var buf = Buffer.alloc(8);
            return new TLVFixed(ENUM.AMQPType.DOUBLE, buf.write(d));
        },
        wrapFloat: function (f) {
            var buf = Buffer.alloc(4);
            return new TLVFixed(ENUM.AMQPType.FLOAT, buf.write(f));
        },
        wrapChar: function (c) {
            var buf = Buffer.alloc(4);
            return new TLVFixed(ENUM.AMQPType.CHAR, buf.write(c));
        },
        wrapTimestamp: function (date) {
            if (date == null)
                throw new Error("Wrapper cannot wrap null Timestamp");

            var buf = Buffer.alloc(8);
            return new TLVFixed(ENUM.AMQPType.TIMESTAMP, buf.write(date.getTime()));
        },
        wrapDecimal32: function (d) {
            if (d == null)
                throw new Error("Wrapper cannot wrap null decimal32");

            return new TLVFixed(ENUM.AMQPType.DECIMAL_32, d.getValue());
        },
        wrapDecimal64: function (d) {
            if (d == null)
                throw new Error("Wrapper cannot wrap null decimal64");

            return new TLVFixed(ENUM.AMQPType.DECIMAL_64, d.getValue());
        },
        wrapDecimal128: function (d) {
            if (d == null)
                throw new Error("Wrapper cannot wrap null decimal128");

            return new TLVFixed(ENUM.AMQPType.DECIMAL_128, d.getValue());
        },
        wrapString: function (s) {
            if (s == null)
                throw new Error("Wrapper cannot wrap null String");

            var code = s.length > 255 ? ENUM.AMQPType.STRING_32 : ENUM.AMQPType.STRING_8;

            return new TLVVariable(code, Buffer.from(s));
        },
        wrapSymbol: function (s) {
            if (s == null)
                throw new Error("Wrapper cannot wrap null symbol");


            var value = Buffer.from(s.getValue(), 'ascii');

            var code = value.length > 255 ? ENUM.AMQPType.SYMBOL_32 : ENUM.AMQPType.SYMBOL_8;
            return new TLVVariable(code, value);
        },
        wrapList: function (input) {
            if (input == null)
                throw new Error("Wrapper cannot wrap null List");

            var list = new TLVList();
            input.forEach(function (o) {
                list.addElement(wrap(o))
            })
            return list;
        },
        wrapMap: function (input) {
            if (input == null)
                throw new error("Wrapper cannot wrap null Map");
            var result = {};
            for (var key in input) {
                var wrapKey = this.wrap(key)
                var wrapVal = this.wrap(input[key]);
                result[wrapKey] = wrapVal;
            }
            return result;
        },
        wrapArray: function (input) {
            if (input == null)
                throw new Error("Wrapper cannot wrap null array");
            var result = []
            input.forEach(function (elem) {
                result.push(this.wrap(elem));
            });
            return result;
        },
        convertUInt: function (i) {
            if (i == 0) {
                return Buffer.alloc(0);
            } else if (i > 0 && i <= 255) {
                return Buffer.alloc(i.toString().length, i)
            } else {
                var buf = Buffer.alloc(4);
                buf.writeUInt32BE(i);
                return buf
            }
        },
        convertInt: function (i) {
            if (i == 0) {
                return Buffer.alloc(0);
            } else if (i >= -128 && i <= 127) {
                return Buffer.alloc(i.toString().length, i)
            } else {
                var buf = Buffer.alloc(4);
                buf.writeUInt32BE(i);
                return
            }
        },
        convertULong: function (i) {
            if (i == 0) {
                return Buffer.alloc(0);
            } else if (i >= 0 && i <= 255) {
                return Buffer.alloc(i.toString().length, i)
            } else {
                var buf = Buffer.alloc(8, i);
                return buf
            }
        },
        convertLong: function (i) {
            if (i == 0) {
                return Buffer.alloc(0);
            } else if (i >= -128 && i <= 127) {
                return Buffer.alloc(i.toString().length, i)
            } else {
                var buf = Buffer.alloc(8);
                buf.writeDoubleBE(i);
                return buf;
            }
        }

    }
}
module.exports = AMQPWrapper;