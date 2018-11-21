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
var HeaderCode = require('../../avps/HeaderCode');
var SectionCode = require('../../avps/SectionCode');
var StateCode = require('../../avps/StateCode');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVFactory = require('../../tlv/api/TLVFactory');
var AMQPData = require('../../sections/AMQPData');
var AMQPFooter = require('../../sections/AMQPFooter');
var AMQPProperties = require('../../sections/AMQPProperties');
//var AMQPSection = require('../../sections/AMQPSection');
var AMQPSequence = require('../../sections/AMQPSequence');
var AMQPValue = require('../../sections/AMQPValue');
var ApplicationProperties = require('../../sections/ApplicationProperties');
var DeliveryAnnotations = require('../../sections/DeliveryAnnotations');
var MessageAnnotations = require('../../sections/MessageAnnotations');
var MessageHeader = require('../../sections/MessageHeader');
var AMQPAccepted = require('../../tlv/impl/AMQPAccepted');
var AMQPModified = require('../../tlv/impl/AMQPModified');
var AMQPReceived = require('../../tlv/impl/AMQPReceived');
var AMQPRejected = require('../../tlv/impl/AMQPRejected');
var AMQPReleased = require('../../tlv/impl/AMQPReleased');
var ENUM = require('../../../lib/enum')

function HeaderFactory() {
    return {
        getAMQP: function (buf, index) {
            try {
                var ind = { i: index }
                var list = TLVFactory.getTlv(buf, ind);              
                var type = list.getConstructor().getCode().getType()
                if (type != ENUM.AMQPType.LIST_0 && type != ENUM.AMQPType.LIST_8 && type != ENUM.AMQPType.LIST_32)
                    throw new Error("Received amqp-header with malformed arguments");                   
                   
                var byteCode = list.getConstructor().getDescriptor().getBytes()[1];;
               
                var code = new HeaderCode(byteCode);
               
                var header = code.emptyHeader();
                header.fromArgumentsList(list);
                return {
                    header: header,
                    index: ind 
                };
            } catch (e) {
                console.log(e)
            }

        },
        getSASL: function (buf, index) {
            var ind = { i: index }
            try {
                var list = TLVFactory.getTlv(buf, ind);
            } catch (e) {
                console.log(e)
            }

            if (list.getCode() != ENUM.AMQPType.LIST_0 && list.getCode() == ENUM.AMQPType.LIST_8 && list.getCode() == ENUM.AMQPType.LIST_32)
                throw new Error("Received sasl-header with malformed arguments");
            try {
                           
                var byteCode = list.getConstructor().getDescriptor().getBytes()[1];
            } catch (e) {
                console.log(e)
            }

           

            try {
                var code = new HeaderCode(byteCode);
            } catch (e) {
                console.log(e);
            }          
            try {
                var header = code.emptySASL(list.getCode());
            } catch (e) {
                console.log(e)
            }           
            header.fromArgumentsList(list);

            return{
                header: header,
                index: ind 
            };;

        },
        getSection: function (buf, index) {
            var ind = { i: index }
            
            var value = TLVFactory.getTlv(buf, ind);
            var section = null;
           
         
            var byteCode = value.getConstructor().getDescriptor().getBytes()[1];
            
            var code = HeaderCode.valueOf(byteCode);
             
            switch (byteCode) {
                case ENUM.SectionCode.APPLICATION_PROPERTIES:
                    section = new ApplicationProperties();
                    break
                case ENUM.SectionCode.DATA:
                    section = new AMQPData();
                    break
                case ENUM.SectionCode.DELIVERY_ANNOTATIONS:
                    section = new DeliveryAnnotations();
                    break
                case ENUM.SectionCode.FOOTER:
                    section = new AMQPFooter();
                    break
                case ENUM.SectionCode.HEADER:
                    section = new MessageHeader();
                    break
                case ENUM.SectionCode.MESSAGE_ANNOTATIONS:
                    section = new MessageAnnotations();
                    break
                case ENUM.SectionCode.PROPERTIES:
                    section = new AMQPProperties();
                    break
                case ENUM.SectionCode.SEQUENCE:
                    section = new AMQPSequence();
                    break
                case ENUM.SectionCode.VALUE:
                    section = new AMQPValue();
                    break
                default:
                    throw new Error("Received header with unrecognized message section code");
            }
           
            section.fill(value);

            return {
                section: section,
                index: ind.i
            };
        },
        getState: function (list) {
            var state = null;
            var byteCode = list.getConstructor().getDescriptorCode();
            var code = StateCode.valueOf(byteCode);
            switch (code) {
                case ENUM.StateCode.ACCEPTED:
                    state = new AMQPAccepted();
                    break;
                case ENUM.StateCode.MODIFIED:
                    state = new AMQPModified()
                    break;
                case ENUM.StateCode.RECEIVED:
                    state = new AMQPReceived();
                    break;
                case ENUM.StateCode.REJECTED:
                    state = new AMQPRejected();
                    break;
                case ENUM.StateCode.RELEASED:
                    state = new AMQPReleased();
                    break;
                default:
                    throw new Error("Received header with unrecognized state code");
            }
            return state;
        },
        getOutcome: function (list) {
            var outcome = null;
            var byteCode = list.getConstructor().getDescriptorCode();
            var code = StateCode.valueOf(byteCode);
            switch (code) {
                case ENUM.StateCode.ACCEPTED:
                    outcome = new AMQPAccepted();
                    break;
                case ENUM.StateCode.MODIFIED:
                    outcome = new AMQPModified()
                    break;
                case ENUM.StateCode.REJECTED:
                    outcome = new AMQPRejected();
                    break;
                case ENUM.StateCode.RELEASED:
                    outcome = new AMQPReleased();
                    break;
                default:
                    throw new Error("Received header with unrecognized outcome code");
            }
            return outcome;
        }
    }
}

module.exports = HeaderFactory();