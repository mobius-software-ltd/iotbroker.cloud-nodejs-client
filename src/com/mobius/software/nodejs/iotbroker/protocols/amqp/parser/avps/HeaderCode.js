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


 var AMQPBegin = require('../header/impl/AMQPBegin');
 var AMQPClose = require('../header/impl/AMQPClose');
 var AMQPDetach = require('../header/impl/AMQPDetach');
 var AMQPDisposition = require('../header/impl/AMQPDisposition');
 var AMQPEnd = require('../header/impl/AMQPEnd');
var AMQPFlow = require('../header/impl/AMQPFlow');
var AMQPOpen = require('../header/impl/AMQPOpen');
var AMQPTransfer = require('../header/impl/AMQPTransfer');
var SASLChallenge = require('../header/impl/SASLChallenge');
var SASLInit = require('../header/impl/SASLInit');
var SASLMechanisms = require('../header/impl/SASLMechanisms');
var SASLOutcome = require('../header/impl/SASLOutcome');
var SASLResponse = require('../header/impl/SASLResponse');
var AMQPAttach = require('../header/impl/AMQPAttach');
var ENUM = require('../../lib/enum'); 

function HeaderCode(value) {
    this.value = value;
     var value = value;
    return {        
        getValue: function () {
            return value;
        },
        setCode: function (leg) {
            value = leg;
        },
        getName: function (){

        },
        valueOf: function (code) {
            var result = null;
          
           // var result = this.HeaderCode.code[code];            
            for(var key in ENUM.HeaderCode) { 
               
                if(ENUM.HeaderCode[key] == code) {
                    result = key;                  
                }
            }
            if (!result)
                throw new Error("Unrecognized header argument code: " + code)

            return result;
        },
        emptyHeader: function () {
            var obj = ENUM.HeaderCode;
            switch (value) {
                case obj.ATTACH:
                    return new AMQPAttach();
                case obj.BEGIN:
                    return new AMQPBegin();
                case obj.CLOSE:
                    return new AMQPClose();
                case obj.DETACH:
                    return new AMQPDetach();
                case obj.DISPOSITION:
                    return new AMQPDisposition();
                case obj.END:
                    return new AMQPEnd();
                case obj.FLOW:
                    return new AMQPFlow();
                case obj.OPEN:
                    return new AMQPOpen();
                case obj.TRANSFER:
                    return new AMQPTransfer();
                default: 
                    throw new Error("Received amqp-header with unrecognized performative");
            }
        },
        emptySASL: function (code) {           
            var obj = ENUM.HeaderCode;     
           
            switch (value) {                
                case obj.CHALLANGE:
                    return new SASLChallenge();
                case obj.INIT:
                    return new SASLInit();
                case obj.MECHANISMS:
                    return new SASLMechanisms();
                case obj.OUTCOME:
                    return new SASLOutcome();
                case obj.RESPONSE:
                    return new SASLResponse();
                default: 
                    throw new Error("Received sasl-header with unrecognized arguments code")
            }
        }
    }
}

module.exports = HeaderCode;