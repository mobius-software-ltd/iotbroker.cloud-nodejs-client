
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
var SimpleConstructor = require('../../constructor/SimpleConstructor');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var TLVAmqp = require('../api/TLVAmqp');
var ENUM = require('../../../lib/enum')

function TLVFixed(code, value) {
   
    var vm = this;
    vm.code = code;
    vm.value = value;
    vm.constructor = new SimpleConstructor(code);;
    //  this.constructor = new SimpleConstructor(code);
    return {
        getClassName: function () {
            return 'TLVFixed'
        },
        getCode: function () {
            return vm.code;
        },
        setCode: function (code) {
            vm.code = code;
        },
        getBytes: function () {
            try {
              
                var bytes = this.getConstructor().getBytes();
                
                if (vm.value.length > 0) {
                   
                    var bytesVal = vm.value

                   
                    bytes = Buffer.concat([bytes, bytesVal], bytes.length + bytesVal.length);
                }

                return bytes;
            } catch (e) {
                console.log(e)
            }

        },
        getConstructor: function () {
          
            return vm.constructor
            
        },
        setConstructor: function (constructor) {
            vm.constructor = constructor;
            
        },
        getLength: function () {
                    
           
            return (vm.value.toString().length + vm.constructor.getLength());
        },
        getValue: function () {
            return vm.value;
        },
        toString: function () {
            var s = null;

            switch (this.getConstructor().getCode()) {
                case ENUM.AMQPType.BOOLEAN_TRUE:
                    s = "1";
                    break;

                case ENUM.AMQPType.BOOLEAN_FALSE:
                case ENUM.AMQPType.UINT_0:
                case ENUM.AMQPType.ULONG_0:
                    s = "0";
                    break;

                case ENUM.AMQPType.BOOLEAN:
                case ENUM.AMQPType.BYTE:
                case ENUM.AMQPType.UBYTE:
                case ENUM.AMQPType.SMALL_INT:
                case ENUM.AMQPType.SMALL_LONG:
                case ENUM.AMQPType.SMALL_UINT:
                case ENUM.AMQPType.SMALL_ULONG:
                    s = value.toString('utf-8')
                    break;

                case ENUM.AMQPType.SHORT:
                case ENUM.AMQPType.USHORT:
                    s = value.readUInt16BE(0).toString()
                    break;

                case ENUM.AMQPType.CHAR:
                case ENUM.AMQPType.DECIMAL_32:
                case ENUM.AMQPType.FLOAT:
                case ENUM.AMQPType.INT:
                case ENUM.AMQPType.UINT:
                    // s = Integer.toString(ByteBuffer.wrap(value).getInt());
                    s = value.readUInt32BE(0).toString()
                    break;

                case ENUM.AMQPType.DECIMAL_64:
                case ENUM.AMQPType.DOUBLE:
                case ENUM.AMQPType.LONG:
                case ENUM.AMQPType.ULONG:
                case ENUM.AMQPType.TIMESTAMP:
                    // s = Long.toString(ByteBuffer.wrap(value).getLong());
                    s = value.readDoubleBE(0).toString()
                    break;

                case ENUM.AMQPType.DECIMAL_128:
                    s = "decimal-128";
                    break;

                case ENUM.AMQPType.UUID:
                    // s = new String(value);
                    s = value.toString();
                    break;

                default:
                    break;
            }

            return s;
        }

    }
}
module.exports = TLVFixed;