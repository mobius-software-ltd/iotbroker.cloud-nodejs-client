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

var getUuidByString = require('uuid-by-string')

var AMQPType = require('../../avps/AMQPType');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVArray = require('../../tlv/impl/TLVArray');
var TLVList = require('../../tlv/impl/TLVList');
var TLVMap = require('../../tlv/impl/TLVMap');
var TLVVariable = require('../../tlv/impl/TLVVariable');
var AMQPDecimal = require('../../wrappers/AMQPDecimal');
var AMQPSymbol = require('../../wrappers/AMQPSymbol');
var ENUM = require('../../../lib/enum');

function AMQPUnwrapper() {

    // this.code = code;
    // this.doff = doff;
    // this.channel = channel;
    // this.type = type;
    return {
        unwrapUByte: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.UBYTE)
                throw new Error(new Date() + ": " + "Error trying to parse UBYTE: received " + tlv.getCode());

            return tlv.getValue()[0] & 0xff;
        },
        unwrapByte: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.BYTE)
                throw new Error(new Date() + ": " + "Error trying to parse BYTE: received " + tlv.getCode());

            return tlv.getValue()[0];
        },
        unwrapUShort: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.USHORT)
                throw new Error(new Date() + ": " + "Error trying to parse USHORT: received " + tlv.getCode());
            var buf = Buffer.from(tlv.getValue())
            return buf.readUInt16BE(0, buf.length) & 0xffff;
        },
        unwrapShort: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.SHORT)
                throw new Error(new Date() + ": " + "Error trying to parse SHORT: received " + tlv.getCode());

            var buf = Buffer.from(tlv.getValue())
            return buf.readUInt16BE(0, buf.length) & 0xffff;
        },
        unwrapUInt: function (tlv) {
            var code = tlv.getCode()
            if (code != ENUM.AMQPType.UINT && code != ENUM.AMQPType.SMALL_UINT && code != ENUM.AMQPType.UINT_0)
                throw new Error(new Date() + ": " + "Error trying to parse UINT: received " + code);
            var value = Buffer.from(tlv.getValue())
            if (value.length == 0)
                return 0;
            if (value.length == 1)
                return tlv.getValue()[0] & 0xff;

            var buf = Buffer.from(tlv.getValue());
            return buf.readUInt32BE(0, buf.length) & 0x000000FF /// 0xffffffffL;
        },
        unwrapInt: function (tlv) {
            var code = tlv.getCode()
            if (code != ENUM.AMQPType.INT && code != ENUM.AMQPType.SMALL_INT)
                throw new Error(new Date() + ": " + "Error trying to parse INT: received " + code);
            var value = Buffer.from(tlv.getValue())
            if (value.length == 0)
                return 0;
            if (value.length == 1)
                return tlv.getValue()[0];

            var buf = Buffer.from(tlv.getValue())
            return buf.readUInt32BE(0, buf.length)
        },
        unwrapULong: function (tlv) {
            var code = tlv.getCode()
            if (code != ENUM.AMQPType.ULONG && code != ENUM.AMQPType.SMALL_ULONG && code != ENUM.AMQPType.ULONG_0)
                throw new Error(new Date() + ": " + "Error trying to parse ULONG: received " + code);
            var value = Buffer.from(tlv.getValue())
            if (value.length == 0)
                return 0;
            if (value.length == 1)
                return tlv.getValue()[0] & 0xff;

            var b = Buffer.from(tlv.getValue())
            if (Math.sign(b) < 0)
                b += b << 64

            return b
        },
        unwrapLong: function (tlv) {
            var code = tlv.getCode()
            if (code != ENUM.AMQPType.LONG && code != ENUM.AMQPType.SMALL_LONG)
                throw new Error(new Date() + ": " + "Error trying to parse ULONG: received " + code);
            var buf = Buffer.from(tlv.getValue())
            if (buf.length == 0)
                return 0;
            if (buf.length == 1)
                return tlv.getValue()[0];

            return buf.readDoubleBE(0, buf.length)
        },
        unwrapBool: function (tlv) {
            switch (tlv.getCode()) {
                case ENUM.AMQPType.BOOLEAN:
                    var val = tlv.getCode()[0]
                    if (val == 0)
                        return false;
                    else if (val == 1)
                        return true;
                    else
                        throw new Error("Invalid Boolean type value: " + val);
                case ENUM.AMQPType.BOOLEAN_TRUE:
                    return true;
                case ENUM.AMQPType.BOOLEAN_FALSE:
                    return false;
                default:
                    throw new Error(new Date() + ": " + "Error trying to parse BOOLEAN: received " + tlv.getCode());
            }
        },
        unwrapDouble: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.DOUBLE)
                throw new Error(new Date() + ": " + "Error trying to parse DOUBLE: received " + tlv.getCode());

            var buf = Buffer.from(tlv.getValue())
            return buf.readDoubleBE(0, buf.length)
        },
        unwrapFloat: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.FLOAT)
                throw new Error(new Date() + ": " + "Error trying to parse FLOAT: received " + tlv.getCode());

            var buf = Buffer.alloc(4);
            buf.write(tlv.getValue())
            return buf.readInt32BE(0, buf.length)
        },
        unwrapTimestamp: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.TIMESTAMP)
                throw new Error(new Date() + ": " + "Error trying to parse TIMESTAMP: received " + tlv.getCode());

            var buf = Buffer.from(tlv.getValue())
            return buf.readDoubleBE(0, buf.length)
        },
        unwrapDecimal: function (tlv) {
            var code = tlv.getCode();
            if (code != ENUM.AMQPType.DECIMAL_32 && code != ENUM.AMQPType.DECIMAL_64 && code != ENUM.AMQPType.DECIMAL_128)
                throw new Error(new Date() + ": " + "Error trying to parse DECIMAL: received " + tlv.getCode());

            return new AMQPDecimal(tlv.getValue());
        },
        unwrapChar: function () {
            if (tlv.getCode() != ENUM.AMQPType.CHAR)
                throw new Error(new Date() + ": " + "Error trying to parse CHAR: received " + tlv.getCode());

            var buf = Buffer.from(tlv.getValue())
            return buf.readInt32BE(0, buf.length)
        },
        unwrapString: function (tlv) {
           
            // var code = tlv.getCode();
            // if (code != ENUM.AMQPType.STRING_8 && code != ENUM.AMQPType.STRING_32)
            //     throw new Error(new Date() + ": " + "Error trying to parse STRING: received " + code);
            if(tlv.getValue())  return tlv.getValue().toString();
        },
        unwrapSymbol: function (tlv) {
            var code = tlv.getCode();
            if (code != ENUM.AMQPType.SYMBOL_8 && code != ENUM.AMQPType.SYMBOL_32)
                throw new Error(new Date() + ": " + "Error trying to parse SYMBOL: received " + code);

          
            return new AMQPSymbol(tlv.getValue());
        },
        unwrapBinary: function (tlv) {
            var code = tlv.getCode();
            if (code != ENUM.AMQPType.BINARY_8 && code != ENUM.AMQPType.BINARY_32)
                throw new Error(new Date() + ": " + "Error trying to parse BINARY: received " + code);
            return tlv.getValue();
        },
        unwrapUuid: function (tlv) {
            if (tlv.getCode() != ENUM.AMQPType.UUID)
                throw new Error(new Date() + ": " + "Error trying to parse UUID: received " + tlv.getCode());

            return getUuidByString(new String(tlv.getValue()));
        },
        unwrapList: function (tlv) {
            var code = tlv.getCode();
            if (code != ENUM.AMQPType.LIST_0 && code != ENUM.AMQPType.LIST_8 && code != ENUM.AMQPType.LIST_32)
                throw new Error(new Date() + ": " + "Error trying to parse LIST: received " + tlv.getCode());
            var result = [];
            var list = tlv.getList();
            list.forEach(function (element) {
                result.push(unwrap(element))
            });
            return result;
        },
        unwrapMap: function (tlv) {
            var code = tlv.getCode();
            if (code != ENUM.AMQPType.MAP_8 && code != ENUM.AMQPType.MAP_32)
                throw new Error(new Date() + ": " + "Error trying to parse MAP: received " + tlv.getCode());
            var result = {}
            var map = tlv.getMap();
            for (var key in map) {
                var unwrapKey = unwrap(key)
                var unwrapVal = unwrap(map[key]);
                result[unwrapKey] = unwrapVal
            }
            return result;
        },
        unwrapArray: function (tlv) {
            var code = tlv.getCode();
            if (code != ENUM.AMQPType.ARRAY_8 && code != ENUM.AMQPType.ARRAY_32)
                throw new Error(new Date() + ": " + "Error trying to parse ARRAY: received " + tlv.getCode());
            var result = [];

            var list = tlv.getList();
           
            for(var i=0; i<list.length; i++){
                var element = list[i];
                result.push(this.unwrap(element))
            }
            return result;
        },
        unwrap: function (value) {
           
            switch (value.getCode()) {

                case ENUM.AMQPType.NULL:
                    return null;

                case ENUM.AMQPType.ARRAY_32:
                case ENUM.AMQPType.ARRAY_8:
                    return unwrapArray(value);

                case ENUM.AMQPType.BINARY_32:
                case ENUM.AMQPType.BINARY_8:
                    return unwrapBinary(value);

                case ENUM.AMQPType.UBYTE:
                    return unwrapUByte(value);

                case ENUM.AMQPType.BOOLEAN:
                case ENUM.AMQPType.BOOLEAN_FALSE:
                case ENUM.AMQPType.BOOLEAN_TRUE:
                    return unwrapBool(value);

                case ENUM.AMQPType.BYTE:
                    return unwrapByte(value);

                case ENUM.AMQPType.CHAR:
                    return unwrapChar(value);

                case ENUM.AMQPType.DOUBLE:
                    return unwrapDouble(value);

                case ENUM.AMQPType.FLOAT:
                    return unwrapFloat(value);

                case ENUM.AMQPType.INT:
                case ENUM.AMQPType.SMALL_INT:
                    return unwrapInt(value);

                case ENUM.AMQPType.LIST_0:
                case ENUM.AMQPType.LIST_32:
                case ENUM.AMQPType.LIST_8:
                    return unwrapList(value);

                case ENUM.AMQPType.LONG:
                case ENUM.AMQPType.SMALL_LONG:
                    return unwrapLong(value);

                case ENUM.AMQPType.MAP_32:
                case ENUM.AMQPType.MAP_8:
                    return unwrapMap(value);

                case ENUM.AMQPType.SHORT:
                    return unwrapShort(value);

                case ENUM.AMQPType.STRING_32:
                case ENUM.AMQPType.STRING_8:
                    return unwrapString(value);

                case ENUM.AMQPType.SYMBOL_32:
                case ENUM.AMQPType.SYMBOL_8:                
                    return this.unwrapSymbol(value);


                case ENUM.AMQPType.TIMESTAMP:
                    return new Date(unwrapLong(value));

                case ENUM.AMQPType.UINT:
                case ENUM.AMQPType.SMALL_UINT:
                case ENUM.AMQPType.UINT_0:
                    return unwrapUInt(value);

                case ENUM.AMQPType.ULONG:
                case ENUM.AMQPType.SMALL_ULONG:
                case ENUM.AMQPType.ULONG_0:
                    return unwrapULong(value);

                case ENUM.AMQPType.USHORT:
                    return unwrapUShort(value);

                case ENUM.AMQPType.UUID:
                    return unwrapUuid(value);

                case ENUM.AMQPType.DECIMAL_128:
                case ENUM.AMQPType.DECIMAL_32:
                case ENUM.AMQPType.DECIMAL_64:
                    return unwrapDecimal(value);

                default:
                    throw new Error(new Date() + ": " + "received unrecognized type");
            }
        }
    }
}
module.exports = AMQPUnwrapper;