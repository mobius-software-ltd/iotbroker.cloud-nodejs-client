
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

function TLVArray(code, elements) {
    var elementConstructor = new SimpleConstructor(code)
    var constructor = {};
    var size = 0;
    var code = code;
    var elements = elements;
    var width = (code == AMQPType.ARRAY_8) ? 1 : 4;
    size += width;
    if (elements)
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];           
            size += element.getLength() - element.getConstructor().getLength();
          
            if (elementConstructor == null && element != null)
                elementConstructor = element.getConstructor();
        }
    if (elementConstructor)
        size += elementConstructor.getLength();
    if (elements)
        var count = elements.length;
    return {
        getList: function() {
            return elements;
        },
        getClassName: function() {
            return 'TLVArray'
        },
        getCode: function () {
            return code;
        },
        setCode: function (code) {
            var code = code;
        },
        getElementConstructor: function () {
            return elementConstructor;
        },
        getConstructor: function() {
            return constructor;
        },
        setConstructor: function(constructor) {
            constructor = constructor
        },
        getElemetsCode: function () {
            return elementConstructor.getCode();
        },
        addElement: function (element) {
            if (!elements.length) {
                elementConstructor = element.getConstructor();
                size += width;
                size += elementConstructor.getLength();
            }
            elements.add(element);
            count++;
            size += element.getLength() - elementConstructor.getLength();
            if (width == 1 && size > 255) {
                constructor.setCode(AMQPType.ARRAY_32);
                width = 4;
                size += 3;
            }
        },
        getBytes: function () {
            var constructorBytes = constructor.getBytes();
            var sizeBytes = Buffer.alloc(width);
            switch (width) {
                case 0:
                    break;
                case 1:
                    sizeBytes[0] = Buffer.from(size);
                    break;
                case 4:
                    sizeBytes.writeUInt32BE(size);
                    break;
            }

            var countBytes = Buffer.alloc(width);
            switch (width) {
                case 0:
                    break;
                case 1:
                    countBytes[0] = Buffer.from(count);
                    break;
                case 4:
                    countBytes.writeUInt32BE(count);
                    break;
            }
            var elemetConstructorBytes = elementConstructor.getBytes();
            var valueBytes = Buffer.alloc(size - width - elemetConstructorBytes.length);
            var pos = 0;
            var tlvBytes;
            elements.forEach(function (tlv) {
                tlvBytes = tlv.getBytes();
                valueBytes.write(tlvBytes.splice(elemetConstructorBytes.length, tlvBytes.length - elemetConstructorBytes.length), pos)
                pos += tlvBytes.length - elemetConstructorBytes.length;
            })

            var bytes = Buffer.alloc(constructorBytes.length + sizeBytes.length + countBytes.length + elemetConstructorBytes.length + valueBytes.length);
            //System.arraycopy(constructorBytes, 0, bytes, 0, constructorBytes.length);
            bytes.write(constructorBytes.splice(0, constructorBytes.length), constructorBytes.length)
            if (size > 0) {
                // System.arraycopy(sizeBytes, 0, bytes, constructorBytes.length, sizeBytes.length);
                bytes.write(sizeBytes.splice(0, sizeBytes.length), constructorBytes.length)
                // System.arraycopy(countBytes, 0, bytes, constructorBytes.length + sizeBytes.length, countBytes.length);
                bytes.write(countBytes.splice(0, countBytes.length), constructorBytes.length + sizeBytes.length)
                // System.arraycopy(elemetConstructorBytes, 0, bytes, constructorBytes.length + sizeBytes.length + countBytes.length, elemetConstructorBytes.length);
                bytes.write(elemetConstructorBytes.splice(0, elemetConstructorBytes.length), constructorBytes.length + sizeBytes.length + countBytes.length)
                // System.arraycopy(valueBytes, 0, bytes, constructorBytes.length + sizeBytes.length + countBytes.length + elemetConstructorBytes.length, valueBytes.length);
                bytes.write(valueBytes.splice(0, valueBytes.length), constructorBytes.length + sizeBytes.length + countBytes.length + elemetConstructorBytes.length)
            }

            return bytes;

        },
        getLength: function () {
            return elementConstructor.getLength() + size + width;
        }
    }

}
module.exports = TLVArray;