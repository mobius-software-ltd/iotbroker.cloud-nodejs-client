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

'use strict'

function OPTION(number, length, value) {
    var number = number;
    var length = length;
    var value = value;

    return {
        reInit: function(number, length, value) {
            number = number;
            length = length;
            value = value;
            return this;
        },
        getNumber: function() {
            return number;
        },
        setNumber: function(value) {
            number = value;
        },
        getLength: function() {
            return length;
        },
        setLength: function() {
            length = value;
        },
        setValue: function(newValue) {
            value = newValue;
        },
        setLength: function(value) {
            length = value;
        },
        getValue: function() {
           return value;
        },
        numberlessThan: function(op1, op2) {
            return op1.getNumber() < op2.getNumber();
        },
       
       
    }
}


module.exports = OPTION;