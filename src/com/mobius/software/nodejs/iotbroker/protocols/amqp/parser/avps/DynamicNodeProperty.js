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

function DynamicNodeProperty() {
    var name;
    return {
        DynamicNodeProperty: {
            SUPPORTED_DIST_MODES: "supported-dist-modes",
            DURABLE: "durable",
            AUTO_DELETE: "auto-delete",
            ALTERNATE_EXCHANGE: "alternate-exchange",
            EXCHANGE_TYPE: "exchange-type"
        },
        getName: function() {
            return name;
        },
        DynamicNodeProperty: function(leg) {
            name = leg
        },
        checkName: function (policy) {
            return this.DynamicNodeProperty[policy];           
            
        }
    }
}
module.exports = DynamicNodeProperty;