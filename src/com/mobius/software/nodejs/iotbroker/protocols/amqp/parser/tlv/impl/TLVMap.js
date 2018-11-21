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

function TLVMap(code, map) {
    this.code = code;
    this.map = map;
    var width = 1;
    var size = 1;
    var count = 0;
    width = code != AMQPType.MAP_8 ? 1 : 4;
    size += width;

    for (let [key, value] of map) {
        size += key.getLength();
        size += value.getLength();
    }

    count = map.size;
    return {
        getClassName: function() {
            return 'TLVMap'
        }, 
        getConstructor: function() {
            return new SimpleConstructor(code);
        },
        getCode: function () {
            return code;
        },
        setCode: function (code) {
            this.code = code;
        },
        getValue: function () {
            return null;
        },
        putElement: function (key, value) {
            map.set(key, value);
            size += key.getLength() + value.getLength();
            count++;
            update();
        },
        toString: function () {
            var sb = '';

            for (let [key, value] of map) {

                sb += key.toString();
                sb += " : ";
                sb += value.toString();
                sb += "\n";
            }
            return sb.toString();
        },
        getBytes: function () {
            var constructorBytes = constructor.getBytes();
            var sizeBytes = Buffer.alloc(width);
            switch (width) {
                case 1:
                    sizeBytes.writeUInt8(size)
                    break;
                default:
                    sizeBytes.writeUInt32BE(size)
                    break;
            }

            var countBytes = Buffer.alloc(width);
            switch (width) {
                case 1:
                    countBytes.writeUInt8(count * 2)
                    break;
                default:
                    countBytes.writeUInt32BE(count * 2)
                    break;
            }

            var valueBytes = Buffer.alloc(size - width);
            var pos = 0;
            var keyBytes;
            var valBytes;
            map.forEach(function (value, key) {
                keyBytes = key.getBytes();
                valBytes = value.getBytes();
                valueBytes.write(keyBytes.splice(0, keyBytes.length), pos)
                pos += keyBytes.length;
                valueBytes.write(valBytes.splice(0, valBytes.length), pos)
                pos += valBytes.length;
            })

            var bytes = Buffer.alloc(constructorBytes.length + sizeBytes.length + countBytes.length + valueBytes.length);
            bytes.write(constructorBytes.splice(0, constructorBytes.length), 0)
            if (size > 0) {
                bytes.write(sizeBytes.splice(0, sizeBytes.length), constructorBytes.length)
                bytes.write(countBytes.splice(0, countBytes.length), constructorBytes.length + sizeBytes.length)

                bytes.write(valueBytes.splice(0, valueBytes.length), constructorBytes.length + sizeBytes.length + countBytes.length)
            }
            return bytes;
        },
        update: function () {
            if (width == 1 && size > 255) {
                constructor.setCode(AMQPType.MAP_32);
                width = 4;
                size += 3;
            }
        },
        getMap: function () {
            return map;
        },
        getLength: function () {
            return constructor.getLength() + width + size;
        }
    }
}

module.exports = TLVMap;