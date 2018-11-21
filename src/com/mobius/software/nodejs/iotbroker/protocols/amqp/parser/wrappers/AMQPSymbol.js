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

function AMQPSymbol(value, type) {

    var value = value;
    var type = type;
    return {   
        getBytes: function() {
            
        },
        getAMQPType: function() {
            return type;
        },
        setAMQPType: function(type) {
            type = type;
        },
        getValue: function () {
            return value;
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((value == null) ? 0 : value.hashCode());
            return result;
        },
        equals(obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            var other = obj;
            if (value == null) {
                if (other.value != null)
                    return false;
            }
            else if (value != other.value)
                return false;
            return true;
        },
        getLength: function() {
            return this.getValue().length;
        }
    }
}
module.exports = AMQPSymbol;