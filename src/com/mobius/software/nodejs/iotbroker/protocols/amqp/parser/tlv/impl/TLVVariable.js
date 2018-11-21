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
var TLVAmqp = require('../api/TLVAmqp');

function TLVVariable(code, value) {
    var vm = this;
    vm.constructor = new SimpleConstructor(code);    
   // var constructor = new SimpleConstructor(code);
    this.code = code;
    this.value = value;
    //this.constructor = constructor;
    var width = value.length > 255 ? 4 : 1;
    return {
        getAMQPType: function () {
            return this.code;
        },
        setAMQPType: function (type) {
            this.code = code;
        },
        getClassName: function () {
            return 'TLVVariable'
        },
        getCode: function () {
            return code;
        },
        setCode: function (code) {
            this.code = code;
        },
        getBytes: function () {
            var bytes = this.getConstructor().getBytes();
           
            var widthBytes = Buffer.alloc(width);
           
            if (width == 1)
                widthBytes.writeUInt8(value.length);
            else if (width == 4)
                widthBytes.writeUInt32BE(value.length);
                 
            bytes = Buffer.concat([bytes, widthBytes], bytes.length + widthBytes.length);
            
            if(value.length > 0) {
                bytes = Buffer.concat([bytes, value], bytes.length + value.length);
            }
          
          
            return bytes;
        },
        getLength: function () {            
        
            var length=this.getValue()?this.getValue().length:0;
            return    length + this.getConstructor().getLength() + width;
        },
        getValue: function () {
            return value;
        },
        getConstructor: function () {           
            return vm.constructor;
        },
        setConstructor: function (constructor) {                   
           vm.constructor = constructor
        }

    }
}
module.exports = TLVVariable;