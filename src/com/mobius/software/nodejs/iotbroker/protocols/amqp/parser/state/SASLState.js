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

var HeaderCode = require('../avps/HeaderCode')
function SASLState() {
    var NONE, MECHANISMS_SENT, INIT_RECEIVED, CHALLENGE_SENT, RESPONSE_RECEIVED, NEGOTIATED;
    return {
        validate: function (code) {
            switch (code) {
                case HeaderCode.MECHANISMS:
                    return this == NONE;
                case HeaderCode.INIT:
                    return this == MECHANISMS_SENT;
                case HeaderCode.CHALLENGE:
                    return this == INIT_RECEIVED;
                case HeaderCode.RESPONSE:
                    return this == CHALLENGE_SENT;
                case HeaderCode.OUTCOME:
                    return this == RESPONSE_RECEIVED;
                default:
                    return this == NEGOTIATED;
            }
        }
    }

}
module.exports = SASLState;