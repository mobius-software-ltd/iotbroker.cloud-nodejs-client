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


var args = process.argv.slice(2);

var bus = require('servicebus').bus({
    queuesFile: `.queues.sn-udp.${process.pid}`
});

var cluster = require('cluster');
var Connect = require('./lib/SNconnect');
const dgram = require('dgram');
var udp = dgram.createSocket('udp4');
var numCPUs = args[0] || require('os').cpus().length;
var parser = require('./SNParser');
var dtls = require('nodejs-dtls');
var dns = require('dns');
var forge = require('node-forge');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var vm = this;
var connections = {};
var connectionParams = {};
var timers = {};
var tokens = {};
var host;
var port;
var unique;
if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function () {

        bus.listen('udp.newSocket', function (msg) {           
            unique = msg.params.connection.unique;
              
            bus.listen('udp.senddata' + unique, function (msg) { sendData(msg); });
            bus.listen('udp.done'  + unique, function (msg) { connectionDone(msg); });

            createSocket(msg);
        })
    }, 100 * (cluster.worker.id + 4));
}

function createSocket(msg) {
    host = msg.params.connection.host;
    port = msg.params.connection.port;
    vm.port = msg.params.connection.port;
    vm.host = msg.params.connection.host;
    vm.secure = msg.params.connection.secure
    if (msg.params.connection.will) {
        msg.params.connection.flag = msg.params.connection.will.topic && msg.params.connection.will.content ? 1 : 0;
    } else {
        msg.params.connection.flag = 0;
    }
    // var oldUnique=vm.clientID;
    var oldUnique = vm.unique;
    vm.clientID = msg.params.connection.clientID || 'MQTT-SN-' + Math.random().toString(18).substr(2, 16);
    vm.unique = msg.params.connection.unique;

    if (typeof oldUnique != 'undefined') {
        timers[oldUnique].releaseTimer(-1);
        timers[oldUnique].releaseTimer(-2);
        // tokens[oldUnique].releaseToken(data.getPacketID());
        delete timers[oldUnique];
        delete connections[oldUnique];
        delete connectionParams[oldUnique];
        delete tokens[oldUnique];
        udp.close()
        oldUnique = undefined;
        connections = {};
        connectionParams = {};
        timers = {};
        tokens = {};
        udp = dgram.createSocket('udp4');
    }

    if (vm.secure) {          
        var certificate = null;
        var privateKey = null;
        if (msg.params.connection.certificate) {
            certificate = '';
            privateKey = '';
            var arr = [];
            var arrStr = [];
            arr = msg.params.connection.certificate.split('-----BEGIN CERTIFICATE-----');
            arr.forEach(function (str, index) {
                arrStr = str.split('-----END CERTIFICATE-----')
                if(arrStr[0]) {
                    certificate += '-----BEGIN CERTIFICATE-----' + arrStr[0] + '-----END CERTIFICATE-----';
                    if(index != arr.length-1) {
                        certificate += '\n'
                    }
                } if(arrStr[1]) {
                    privateKey += arrStr[1]
                }   
            })
            certificate = certificate.replace(/(?:\n)/g, '\r\n');
            certificate = Buffer.from(certificate, 'utf8');
            if(msg.params.connection.privateKey && msg.params.connection.certificate.indexOf('ENCRYPTED') != -1) {
                var pki = forge.pki;
                var privateKeyPki = pki.decryptRsaPrivateKey(privateKey, msg.params.connection.privateKey);
                var pem = pki.privateKeyToPem(privateKeyPki);
                privateKey = Buffer.from(pem, 'utf8') 
            } else {
                privateKey = Buffer.from(privateKey, 'utf8')
            }
        }        
        dns.lookup(vm.host, function (err, address, family) {
            var options = {
                socket: udp,
                remotePort: vm.port,
                remoteAddress: address,
                certificate: certificate,
                certificatePrivateKey: privateKey,
            }
            try { 
                udp = dtls.connect(options);
                if (typeof oldUnique == 'undefined') {
                    udp.on('data', function onDataReceived(data) {
                        bus.send('sn.datareceived' + unique, {
                            payload: data,
                            clientID: vm.clientID,
                            unique: vm.unique
                        });
                    })
                    }
            } catch (e) {
                console.log(e)
            }
        })
    }

    udp.clientID = msg.params.connection.clientID;
    udp.unique = msg.params.connection.unique;
    udp.connection = msg.params.connection;

    if (typeof oldUnique == 'undefined') {
        if (!vm.secure) {
            udp.on('message', function onDataReceived(data, rinfo) {
                bus.send('sn.datareceived' + unique, {
                    payload: data,
                    clientID: vm.clientID,
                    unique: vm.unique
                });
            });            
        }

    }

    try {
        var connect = Connect({
            clientID: msg.params.connection.clientID || 'MQTT-SN-' + Math.random().toString(18).substr(2, 16),
            cleanSession: msg.params.connection.isClean,
            keepalive: msg.params.connection.keepalive,
            willFlag: msg.params.connection.flag,
        })


        vm.connectCount = 0;
        var message = parser.encode(connect);
        bus.send('udp.senddata' + unique, {
            payload: message,
            clientID: msg.params.connection.clientID,
            unique: msg.params.connection.unique,
            parentEvent: 'sn.connect',
            connectCount: 1
        });

    } catch (e) {
        console.log('Unable to establish connection to the server. Error: ', e);
    }
    connectionParams[msg.params.connection.unique] = msg;
    connections[msg.params.connection.unique] = udp;
    timers[msg.params.connection.unique] = new TIMERS();
}

function sendData(msg) {
    if (msg.parentEvent == 'snwilltopic' || msg.parentEvent == 'snwillmsg') {
        timers[msg.unique].releaseTimer(-1);
    }


    if (typeof connections[msg.unique] == 'undefined') return;
    if (msg.parentEvent != 'snpublishQos0' && msg.parentEvent != 'snregackout' && msg.parentEvent != 'snpubackout' && msg.parentEvent != 'snregister' && msg.parentEvent != 'sn.disconnect' && msg.parentEvent != 'sn.disconnectin' && msg.parentEvent != 'snpubackout' && msg.parentEvent != 'snpubrecout' && msg.parentEvent != 'snpubcompout' && msg.parentEvent != 'snwilltopic' && msg.parentEvent != 'snwillmsg') {
        var newTimer = Timer({
            callback: function () {
                try {
                    if (msg.parentEvent == 'sn.connect') {
                        msg.connectCount++
                        if (msg.connectCount == 5) {
                            timers[msg.unique].releaseTimer(-1);
                        }
                    }

                    var message = Buffer.from(msg.payload)
                    if (vm.secure) {
                        udp.write(message);
                    } else {
                        udp.send(message, vm.port, vm.host, function (err) {
                        });
                    }
                } catch (e) {
                    socketEndOnError(e, msg.unique, msg.packetID);
                    return;
                }
            },
            interval: connections[msg.unique].connection.keepalive * 1000
        });
        if (msg.parentEvent == 'sn.connect') {
            timers[msg.unique].setTimer(-1, newTimer);
        } else if (msg.parentEvent == 'snpingreq') {
            timers[msg.unique].setTimer(-2, newTimer);
        } else if (msg.parentEvent == 'snpublish' || msg.parentEvent == 'snpubrel' || msg.parentEvent == 'snsubscribe' || msg.parentEvent == 'snunsubscribe') {
            timers[msg.unique].setTimer(msg.packetID, newTimer);

        }
    }
    try {
        if (vm.secure) {
            udp.write(Buffer.from(msg.payload));
        } else {
            udp.send(Buffer.from(msg.payload), vm.port, vm.host, function (err) {
            });
        }


        if (msg.parentEvent == 'sn.disconnect') {
            // timers[msg.unique].releaseTimer(msg.packetID); 
            timers[msg.unique].releaseTimer(-2);
            timers[msg.unique].releaseTimer(-1);
            delete timers[msg.unique];
            delete connections[msg.unique];
            delete connectionParams[msg.unique];
        }
    } catch (e) {
        socketEndOnError(e, msg.unique, msg.packetID);        
        return;
    }
}

function connectionDone(msg) {
    if (msg.parentEvent == 'snconnack') {
        timers[msg.unique].releaseTimer(-1);
    }
    if (msg.parentEvent == 'snpuback' || msg.parentEvent == 'snpubrec' || msg.parentEvent == 'snpubcomp' || msg.parentEvent == 'snsuback' || msg.parentEvent == 'snunsuback') {
        timers[msg.unique].releaseTimer(msg.packetID);
    }

    if (typeof timers[msg.unique] == 'undefined') return;


    if (msg.parentEvent == 'sn.disconnect' || msg.parentEvent == 'sn.disconnectin') {
        timers[msg.unique].releaseTimer(-1);
        timers[msg.unique].releaseTimer(-2);
        timers[msg.unique].releaseTimer(msg.packetID);
        //connections[msg.unique].close();
        delete timers[msg.unique];
        delete connections[msg.unique];
        delete connectionParams[msg.unique];

    }
}

function socketEndOnError(e, unique, packetID) {
    console.log('Unable to establish connection to the server. Error: ', e);
    if (typeof timers[unique] != 'undefined') {
        timers[unique].releaseTimer(packetID);
        delete timers[unique];
    }
    if (typeof connections[unique] != 'undefined') {
        connections[unique].end();
        delete connections[unique];
    }
    if (typeof connectionParams[unique] != 'undefined')
        delete connectionParams[unique];
}