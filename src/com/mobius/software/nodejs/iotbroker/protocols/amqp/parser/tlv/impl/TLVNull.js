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
var ENUM = require('../../../lib/enum')

function TLVNull(constructor) {
    this.constructor = constructor;
    return {
        getCode: function () {
            return ENUM.AMQPType.NULL;
        },
        getClassName: function () {
            return 'TLVNull'
        },
        getConstructor: function () {
            return new SimpleConstructor(ENUM.AMQPType.NULL);
        },
        setConstructor: function (constructor) {
            this.constructor = constructor;
        },
        getBytes: function () {
            return this.getConstructor().getBytes();
        },
        getLength: function () {
            return 1;
        },
        getValue: function () {
            return null;
        },
        toString: function () {
            return "NULL";
        }
    }
}

module.exports = TLVNull;