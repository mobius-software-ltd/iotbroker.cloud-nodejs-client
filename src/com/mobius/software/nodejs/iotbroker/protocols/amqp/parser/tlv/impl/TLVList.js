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
var TLVArray = require('../impl/TLVArray');
var TLVNull = require('../impl/TLVNull');
var TLVMap = require('../impl/TLVMap');
var ENUM = require('../../../lib/enum');

function TLVList(code, value) {
    var vm = this;
     vm.width = 0;
    vm.count = 0;
    vm.size = 0;
  
    vm.code = code ? code : ENUM.AMQPType.LIST_0;
    var list = value ? value : [];
    //this.list = value
    vm.constructor = new SimpleConstructor(vm.code); 
    
    if(vm.code != ENUM.AMQPType.LIST_0) {
        vm.width = (vm.code == ENUM.AMQPType.LIST_8) ? 1 : 4; 
        vm.size+=vm.width;
    }
        

    try {
        if (value)
            value.forEach(function (tlv) {
                vm.size += tlv.getLength();
            })
    } catch (e) {
        console.log(e)
    }


    if (value)
        vm.count = value.length;

    return {
        getClassName: function () {
            return 'TLVList'
        },
        getConstructor: function () {
            return vm.constructor;
        },
        setConstructor: function (constructor) {
            vm.constructor = constructor;
        },
        getCode: function () {
            return vm.code;
        },
        setCode: function (code) {
            vm.code = code;
        },

        //test method
        setElement: function (index, element) {
            if (index < list.length) {
                vm.size -= list[index].getLength();
                list[index] = element;

                vm.size += element.getLength();
                this.update();
            }

        },
        //test method

        setElementWithIndex(index, element) {
           
            if(list[index])
            vm.size -= list[index].getLength();

            list[index] = element;
            vm.size += element.getLength();
            this.update();
        },
        addElementIndex: function (index, element) {
            var diff = index - vm.count;

            do {
                this.addElement(1, new TLVNull());
            } while (diff-- > 0);


            this.setElementWithIndex(index, element);
            //test
            // this.setElement(index, element);
        },
        addElement(index, element) {
            if (vm.width==0) {
                this.setConstructor(new SimpleConstructor(ENUM.AMQPType.LIST_8));
                this.setCode(ENUM.AMQPType.LIST_8);
                vm.size += 1;
                vm.width = 1;
                
            }
            list.push(element);
            vm.count++;

            if (element) {
                vm.size += element.getLength();
            }                            

            this.update();
        },
        addToList: function (index, elemIndex, element) {
            if (vm.count <= index)
                addElement(index, new TLVList());
            var list = list.get(index);
            if (list == null)
                setElement(index, new TLVList());
            (list.get(index)).addElement(elemIndex, element);
            vm.size += element.getLength();
            this.update();
        },
        addToMap: function (index, key, value) {
            if (vm.count <= index)
                addElement(index, new TLVMap());
            var map = list.get(index);
            if (map == null)
                setElement(index, new TLVMap());
            (list.get(index)).putElement(key, value);
            vm.size += key.getLength() + value.getLength();

            this.update();
        },
        addToArray: function (index, element) {
            if (vm.count <= index)
                addElement(index, new TLVArray());
            var array = list.get(index);
            if (array == null)
                setElement(index, new TLVArray());
            (list.get(index)).addElement(element);
            vm.size += element.getLength();

            this.update();
        },
        getBytes: function () {

            var constructorBytes = this.getConstructor().getBytes();
            var sizeBytes = Buffer.alloc(vm.width);          
            switch (vm.width) {
                case 0:
                    break;
                case 1:
                    sizeBytes.writeUInt8(vm.size)
                    break;
                default:
                    sizeBytes.writeUInt32BE(vm.size)
                    break;
            }

            var countBytes = Buffer.alloc(vm.width);
            switch (vm.width) {
                case 0:
                    break;
                case 1:
                    countBytes.writeUInt8(vm.count)
                    break;
                default:
                    countBytes.writeUInt32BE(vm.count)
                    break;
            }
            var valueBytes = Buffer.alloc(0);
            var pos = 0;
            var tlvBytes;
           

            list.forEach(function (tlv) {
                tlvBytes = tlv.getBytes();
               
                valueBytes = Buffer.concat([valueBytes, tlvBytes], valueBytes.length + tlvBytes.length);
            })




            // }
            var bytes = constructorBytes;

          

            if (vm.size > 0) {
               
                bytes = Buffer.concat([bytes, sizeBytes], bytes.length + sizeBytes.length);
               
                bytes = Buffer.concat([bytes, countBytes], bytes.length + countBytes.length);
               
                bytes = Buffer.concat([bytes, valueBytes], bytes.length + valueBytes.length);
               
            }

            return bytes;
        },
        toString: function () {
            var sb = ''
            list.forEach(function (element) {
                sb += element.toString() + "\n"
            })
            return sb.toString();
        },
        update: function () {
            if (vm.width == 1 && vm.size > 255) {
                this.setConstructor(new SimpleConstructor(ENUM.AMQPType.LIST_32));
                vm.width = 4;
                vm.size += 3;
            }
        },
        getList: function () {
            return list;
        },
        getValue: function () {
            return null;
        },
         getLength: function () {      
            return this.getConstructor().getLength() + (vm.width ? vm.width : 0) + (vm.size ? vm.size : 0);
        }
    }
}

module.exports = TLVList;