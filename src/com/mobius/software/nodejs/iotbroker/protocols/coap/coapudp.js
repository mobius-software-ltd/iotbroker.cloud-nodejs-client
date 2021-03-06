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
    queuesFile: `.queues.coap-udp.${process.pid}`
});
var cluster = require('cluster');
var dgram = require('dgram');
var dtls = require('nodejs-dtls');
var forge = require('node-forge');
var dns = require('dns');
var numCPUs = args[0] || require('os').cpus().length;
var parser = require('./COAPParser');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var ENUM = require('./lib/enum');
var COAPmessage = require('./lib/message');
var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var vm = this;
var unique;
var connections = {};
var connectionParams = {};
var timers = {};
var tokens = {};

if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {


    setTimeout(function () {

        cluster.worker.on('message', function (id) {
            if (timers[id]) {
                timers[id].releaseTimer(-1);
                delete timers[id];
            }
        })

        bus.listen('coapudp.newSocket', function (msg) { 
           
            unique = msg.params.connection.unique;
           
                bus.listen('coapudp.senddata' + unique, function (msg) { sendData(msg) });
                bus.listen('coapudp.done' + unique, function (msg) { connectionDone(msg) });
         
            createSocket(msg);           
        })


       

    }, 100 * (cluster.worker.id + 4));
}

function createSocket(msg) {
    connections[msg.params.connection.unique] = dgram.createSocket('udp4');  
    connectionParams[msg.params.connection.unique] = msg;
    vm.port = msg.params.connection.port;
    vm.host = msg.params.connection.host;
    vm.secure = msg.params.connection.secure
    vm.clientID = msg.params.connection.clientID

    var oldUniqueCoap = vm.unique;
    vm.unique = msg.params.connection.unique;
    // if (typeof oldUniqueCoap != 'undefined') {
    //     if(typeof timers[oldUniqueCoap] != 'undefined') {
    //     timers[oldUniqueCoap].releaseTimer(-1);
    //     }
    //     // tokens[oldUniqueCoap].releaseToken(data.getPacketID());
    //     delete timers[oldUniqueCoap];
    //     delete connections[oldUniqueCoap];
    //     delete connectionParams[oldUniqueCoap];
    //     delete tokens[oldUniqueCoap];
    //    // udp.close()
    //     oldUniqueCoap = undefined;
    //     connections = {};
    //     connectionParams = {};
    //     timers = {};
    //     tokens = {};
    //     udp = dgram.createSocket('udp4');
    // }

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
                socket: connections[msg.params.connection.unique],
                remotePort: vm.port,
                remoteAddress: address,
                certificate: certificate,
                certificatePrivateKey: privateKey,
                // passphrase: msg.params.connection.privateKey
            }
            try {
                connections[msg.params.connection.unique] = dtls.connect(options);
                connections[msg.params.connection.unique].on('data', function onDataReceived(data) {
                        bus.send('coap.datareceived' + unique, {
                            payload: data,
                            clientID: vm.clientID,
                            unique: vm.unique
                        });
                    })                
            } catch (e) {
                console.log(e)
            }
        })
    }

    connections[msg.params.connection.unique].clientID = msg.params.connection.clientID;
    connections[msg.params.connection.unique].unique = msg.params.connection.unique;
    connections[msg.params.connection.unique].connection = msg.params.connection;
    
	setTimeout(function () {
		bus.send('coap.startping' + unique, {
		    clientID: vm.clientID,
		    unique: vm.unique
		});
	},1500);

        if (!vm.secure) {
            connections[msg.params.connection.unique].on('message', function onDataReceived(data, rinfo) {
                bus.send('coap.datareceived' + unique, {
                    payload: data,
                    clientID: vm.clientID,
                    unique: vm.unique
                });
            });           
        }

    timers[msg.params.connection.unique] = new TIMERS();
}

function sendData(msg) {
    if (typeof connections[msg.unique] == 'undefined') return;
    if (msg.parentEvent == 'coappingreq' || msg.parentEvent == 'coappublish' || msg.parentEvent == 'coapsubscribe' || msg.parentEvent == 'coapunsubscribe') {
        var interval = connectionParams[msg.unique].params.connection.keepalive * 1000
        if (msg.parentEvent == 'coappublish') {
            interval = 3000;
        }
        var newTimer = Timer({
            callback: function () {
                try {
                    var message = Buffer.from(msg.payload)
		    if (vm.secure) {
                        if (connections[msg.unique])
                        connections[msg.unique].write(message)
                    } else {
                        if (connections[msg.unique])
                        connections[msg.unique].send(message, vm.port, vm.host, function (err) {
                        });
                    }
                } catch (e) {
                    socketEndOnError(e, msg.unique, msg.packetID);                    
                    return;
                }
            },
            interval: interval
        });
        if (msg.parentEvent == 'coappingreq') {
            timers[msg.unique].setTimer(-1, newTimer);
        }
        if (msg.parentEvent == 'coappublish' || msg.parentEvent == 'coapsubscribe' || msg.parentEvent == 'coapunsubscribe') {
            timers[msg.unique].setTimer(msg.token, newTimer);
        }
    }
    try {
	if (vm.secure) {            
	    if (connections[msg.unique])
            connections[msg.unique].write(Buffer.from(msg.payload))
        } else {
            if (connections[msg.unique])
            connections[msg.unique].send(Buffer.from(msg.payload), vm.port, vm.host, function (err) {

            });
        }

    } catch (e) {
        socketEndOnError(e, msg.unique, msg.packetID);                    
        return;

    }
}
function connectionDone(msg) {
    if (typeof msg.unique == 'undefined') return;

            if (msg.parentEvent == 'coapackreceived') {
                if (msg.token)
                    timers[msg.unique].releaseTimer(msg.token);
            }

            if (msg.parentEvent == 'coap.disconnect') {
                db.loadDatabase();
                db.remove({ type: 'connack', unique: msg.unique });
                timers[msg.unique].releaseTimer(-1);
                delete timers[msg.unique];
                delete connections[msg.unique];
                delete connectionParams[msg.unique];
            }
}

function socketEndOnError(e, unique, packetID) {
    console.log('Unable to establish connection to the server. Error: ', e);
    db.loadDatabase();
    db.remove({ type: 'connack', unique: unique });
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
