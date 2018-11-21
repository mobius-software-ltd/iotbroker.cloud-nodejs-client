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

var TLVArray = require('../impl/TLVArray');
var TLVFixed = require('../impl/TLVFixed');
var TLVList = require('../impl/TLVList');
var TLVMap = require('../impl/TLVMap');
var TLVNull = require('../impl/TLVNull');
var TLVVariable = require('../impl/TLVVariable');
var AMQPType = require('../../avps/AMQPType');
var SimpleConstructor = require('../../constructor/SimpleConstructor');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var ENUM = require('../../../lib/enum')
function TLVFactory() {

    return {
        getTlv: function (buf, index) {
            try {
                var constructor = this.getConstructor(buf, index);
                var tlv = this.getElement(constructor, buf, index);
            } catch (e) {
                console.log(e)
            }
            return tlv;
        },
        getConstructor: function (buf, index) {
            try {
                var code = null;
                var constructor = null;
                var codeByte = buf.readUInt8(index.i);
                index.i += 1;
            } catch (e) {
                console.log(e)
            }

            if (codeByte == 0) {

                var descriptor = this.getTlv(buf, index);

                code = new AMQPType(buf.readUInt8(index.i) & 0xff);

                index.i += 1;


                try {
                    constructor = new DescribedConstructor(code, descriptor);
                } catch (e) {
                    console.log(e)
                }

            } else {

                code = new AMQPType(codeByte & 0xff);
                constructor = new SimpleConstructor(code);
            }

            return constructor;
        },
        getElement: function (constructor, buf, index) {


            var tlv = null;
            var code = constructor.getCode().getType();
            switch (code) {
                case ENUM.AMQPType.NULL:
                    tlv = new TLVNull();
                    break;

                case ENUM.AMQPType.BOOLEAN_TRUE:
                case ENUM.AMQPType.BOOLEAN_FALSE:
                case ENUM.AMQPType.UINT_0:
                case ENUM.AMQPType.ULONG_0:
                    tlv = new TLVFixed(code, Buffer.alloc(1, 0));
                    break;

                case ENUM.AMQPType.BOOLEAN:
                case ENUM.AMQPType.UBYTE:
                case ENUM.AMQPType.BYTE:
                case ENUM.AMQPType.SMALL_UINT:
                case ENUM.AMQPType.SMALL_INT:
                case ENUM.AMQPType.SMALL_ULONG:
                case ENUM.AMQPType.SMALL_LONG:
                    try {
                        var valueOne = buf.readUInt8(index.i);
                        index.i += 1;
                       
                        if (valueOne == 0) {
                            tlv = new TLVFixed(code, Buffer.alloc(1, 0x00));
                        } else {
                           
                            tlv = new TLVFixed(code, Buffer.alloc(1, valueOne));
                        }


                    } catch (e) {
                        console.log(e);
                    }
                    break;

                case ENUM.AMQPType.SHORT:
                case ENUM.AMQPType.USHORT:
                  
                    var valueTwo = buf.readUInt16BE(index.i);
                    index.i += 2;
                    // tlv = new TLVFixed(code, Buffer.from(valueTwo.toString(16), 'hex'));
                    tlv = new TLVFixed(code, Buffer.alloc(2, valueTwo));
                    tlv.setCode(code)

                    break;

                case ENUM.AMQPType.UINT:
                case ENUM.AMQPType.INT:
                case ENUM.AMQPType.FLOAT:
                case ENUM.AMQPType.DECIMAL_32:
                case ENUM.AMQPType.CHAR:
                    var valueFour = buf.readUInt32BE(index.i);
                    index.i += 4;
                    tlv = new TLVFixed(code, Buffer.from(valueFour.toString(16), 'hex'));
                    break;

                case ENUM.AMQPType.ULONG:
                case ENUM.AMQPType.LONG:
                case ENUM.AMQPType.DECIMAL_64:
                case ENUM.AMQPType.DOUBLE:
                case ENUM.AMQPType.TIMESTAMP:
                    var valueEight = buf.readDoubleBE(index.i);
                    index.i += 8;
                  
                    tlv = new TLVFixed(code, Buffer.from(valueEight.toString(16), 'hex'));
                    break;

                case ENUM.AMQPType.DECIMAL_128:
                case ENUM.AMQPType.UUID:
                    var valueSixteen = buf.readUIntBE(index.i, 16);
                    index.i += 16;
                    tlv = new TLVFixed(code, Buffer.from(valueSixteen.toString(16), 'hex'));
                    break;

                case ENUM.AMQPType.STRING_8:
                case ENUM.AMQPType.SYMBOL_8:
                case ENUM.AMQPType.BINARY_8:
                 
                    try {
                        var var8length = buf.readUInt8(index.i);
                        index.i += 1;                       
                        var varValue8 = Buffer.alloc(var8length); 
                       
                        buf.copy(varValue8, 0, index.i, index.i + var8length);
                       
                        index.i += varValue8.length;
                        tlv = new TLVVariable(code, varValue8);
                    } catch (e) {
                        console.log(e);
                    }


                    break;

                case ENUM.AMQPType.STRING_32:
                case ENUM.AMQPType.SYMBOL_32:
                case ENUM.AMQPType.BINARY_32:
                    try {
                        var var32length = buf.readUInt32BE(index.i);
                        index.i += 4;
                        var varValue32 = Buffer.alloc(var32length);
                        varValue32.write(buf.readUIntBE(index.i, varValue32.length).toString(16), 'hex');
                        index.i += varValue32.length;

                        tlv = new TLVVariable(code, varValue32);
                    } catch (e) {
                        console.log(e)
                    }
                    break;

                case ENUM.AMQPType.LIST_0:
                    tlv = new TLVList();
                    break;

                case ENUM.AMQPType.LIST_8:
                 
                    try {
                        var list8size = buf.readUInt8(index.i) & 0xff;
                        index.i += 1;
                        var list8count = buf.readUInt8(index.i) & 0xff;
                        index.i += 1;
                        var list8values = [];
                        for (var i = 0; i < list8count; i++) {
                            list8values.push(this.getTlv(buf, index));
                        }

                        tlv = new TLVList(code, list8values);
                    } catch (e) {
                        console.log(e)
                    }


                    break;

                case ENUM.AMQPType.LIST_32:
                    var list32size = buf.readUInt32BE(index.i);
                    index.i += 4;
                    var list32count = buf.readUInt32BE(index.i);
                    index.i += 4;
                    var list32values = [];
                    for (var i = 0; i < list32count; i++)
                        list32values.push(this.getTlv(buf, index));
                    tlv = new TLVList(code, list32values);
                    break;

                case ENUM.AMQPType.MAP_8:
                    var map8 = {};

                    var map8size = buf.readUInt8(index.i) & 0xff;
                    index.i++;
                    var map8count = buf.readUInt8(index.i) & 0xff;
                    index.i++;
                    var stop8 = index.i + map8size - 1;
                    while (buf.length - index.i < stop8) {
                        map8[this.getTlv(buf, index)] = this.getTlv(buf, index);
                        index.i++;
                    }
                    tlv = new TLVMap(code, map8);
                    break;

                case ENUM.AMQPType.MAP_32:
                    // Map < TLVAmqp, TLVAmqp > map32 = new LinkedHashMap<>();
                    var map32 = {}

                    var map32size = buf.readUInt32BE(index.i);
                    index.i += 4;
                    var map32count = buf.readUInt32BE(index.i);
                    index.i += 4;
                    var stop32 = index.i + map32size - 4;
                    while (buf.length - index.i < stop32) {
                        map32[this.getTlv(buf, index)] = this.getTlv(buf, index);
                        index.i++;
                    }
                    tlv = new TLVMap(code, map32);
                    break;

                case ENUM.AMQPType.ARRAY_8:
                    var arr8 = [];
                    try {
                        var array8size = buf.readUInt8(index.i) & 0xff;
                        index.i++;
                        var array8count = buf.readUInt8(index.i) & 0xff;
                        index.i++;
                        var arr8constructor = this.getConstructor(buf, index);
                        for (var i = 0; i < array8count; i++) {
                            var item = this.getElement(arr8constructor, buf, index)

                            arr8.push(item);

                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        tlv = new TLVArray(code, arr8);
                    } catch (e) {
                        console.log(e)
                    }

                    break;

                case ENUM.AMQPType.ARRAY_32:
                    var arr32 = [];

                    var array32size = buf.readUInt32BE(index.i);
                    index.i += 4;
                    var array32count = buf.readUInt32BE(index.i);
                    index.i += 4;
                    var arr32constructor = this.getConstructor(buf, index);
                    for (var i = 0; i < array32count; i++)
                        arr32.push(this.getElement(arr32constructor, buf, index.i));
                    tlv = new TLVArray(code, arr32);

                    break;

                default:
                    break;
            }

            if (constructor.getClassName() == 'DescribedConstructor') {
                tlv.setConstructor(constructor);
            }

            return tlv;
        }

    }
}
module.exports = TLVFactory();