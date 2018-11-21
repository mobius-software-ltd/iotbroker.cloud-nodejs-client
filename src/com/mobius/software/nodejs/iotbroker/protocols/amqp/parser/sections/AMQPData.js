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

var AMQPType = require('../avps/AMQPType');
var SectionCode = require('../avps/SectionCode');
var DescribedConstructor = require('../constructor/DescribedConstructor');
var AMQPHeader = require('../header/api/AMQPHeader');
var AMQPUnwrapper = require('../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../header/api/AMQPWrapper');
var TLVAmqp = require('../tlv/api/TLVAmqp');
var TLVFixed = require('../tlv/impl/TLVFixed');
var TLVNull = require('../tlv/impl/TLVNull');
var ENUM = require('../../lib/enum');

function AMQPData(data) {
    var vm = this;
    vm.data = data;
    return {
        getClassName: function() {
            return 'AMQPData'
        },
        getValue: function () {
            var bin = null;
            var wrapper = new AMQPWrapper();

            if (vm.data != null)
                bin = wrapper.wrapBinary(vm.data);
            else
                bin = new TLVNull();
         
            var constructor = new DescribedConstructor(bin.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1,0x75)));           
          
            bin.setConstructor(constructor);
         
            return bin;
        },
        fill: function (value) {
            var unwrapper = new AMQPUnwrapper();            
            if (value != null)
            vm.data = unwrapper.unwrapBinary(value);           
        },
        getCode: function () {
            return ENUM.SectionCode.DATA;
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + Arrays.hashCode(data);
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            var other = obj;
            // if (!Arrays.equals(data, other.data))
            //     return false;

            if (data.length !== other.data.length) {
                return false;
            }
            for (var i = 0, l = data.length; i < l; i++) {
                if (data[i] instanceof Array && other.data[i] instanceof Array) {
                    if (data[i] != other.data[i]) {
                        return false;
                    }
                }
                else if (data[i] !== other.data[i]) {
                    return false;
                }
            }
            return true;
        },
        getData: function () {
            return vm.data;
        },
        setValue: function (value) {
            vm.data = value;
        },
        getLength: function() {           
              return this.getValue().getLength()  
        }
    }
}
module.exports = AMQPData;