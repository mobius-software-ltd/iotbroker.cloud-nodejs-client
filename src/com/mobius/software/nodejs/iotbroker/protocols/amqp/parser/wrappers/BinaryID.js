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

var crypto = require('crypto');

function BinaryID(id) {
    this.id = id;
    return {
        hashCode: function () {
            var hash = crypto.createHash('sha256');
            id.forEach(function(i){
                hash.update(i)
            })
            var prime = 31;
            var result = 1;
            result = prime * result + hash.digest('hex');
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
            if (id.length !== other.id.length) {
                return false;
            }
            for (var i = 0, l = id.length; i < l; i++) {
                if (id[i] instanceof Array && other.id[i] instanceof Array) {
                    if (id[i] != other.id[i]) {
                        return false;
                    }
                }
                else if (id[i] !== other.id[i]) {
                    return false;
                }
            }

            return true;
        },
        getString: function () {
            return null;
        },
        getBinary: function () {
            return id;
        },
        getLong: function () {
            return null;
        },
        getUuid: function () {
            return null;
        }
    }
}
module.exports = BinaryID;