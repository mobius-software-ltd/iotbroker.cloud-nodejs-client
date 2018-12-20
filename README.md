# IoTBroker.Cloud Node.js Client

IoTBroker.cloud Node.js Client is an application that allows you to connect to the server using MQTT, MQTT-SN, 
AMQP or COAP protocols. IoTBroker.cloud Node.js Client gives the opportunity to exchange messages using protocols 
mentioned above. Your data can be also encrypted with **TLS** or **DTLS** secure protocols.   

Below you can find a brief description of each protocol that can help you make your choice. 
If you need to get more information, you can find it in our [blog](https://www.iotbroker.cloud/clientApps/Node.js/MQTT).
 
**MQTT** is a lightweight publish-subscribe based messaging protocol built for use over TCP/IP.  
MQTT was designed to provide devices with limited resources an easy way to communicate effectively. 
You need to familiarize yourself with the following MQTT features such as frequent communication drops, low bandwidth, 
low storage and processing capabilities of devices. 

Frankly, **MQTT-SN** is very similar to MQTT, but it was created for avoiding the potential problems that may occur at WSNs. 

Creating large and complex systems is always associated with solving data exchange problems between their various nodes. 
Additional difficulties are brought by such factors as the requirements for fault tolerance, 
the geographical diversity of subsystems, the presence a lot of nodes interacting with each others. 
The **AMQP** protocol was developed to solve all these problems, which has three basic concepts: 
exchange, queue and routing key. 

If you need to find a simple solution, it is recommended to choose the **COAP** protocol. 
The CoAP is a specialized web transfer protocol for use with constrained nodes and constrained (e.g., low-power, lossy) 
networks. It was developed to be used in very simple electronics devices that allows them to communicate interactively 
over the Internet. It is particularly targeted for small low power sensors, switches, valves and similar components 
that need to be controlled or supervised remotely, through standard Internet networks. 

### Prerequisites

The following programs should be installed before starting to clone IoTBroker.Cloud Node.js Client:

* [Node.js](https://nodejs.org/en/download)
* [npm](https://docs.npmjs.com/cli/install)
* [RabbitMQ](https://www.rabbitmq.com/download.html)
* [gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) (if you want to run the client locally)

### Installation

* First, you have to clone IoTBroker.Cloud-nodejs-client;

* Then you should run RabbitMQ server if you haven't done it before:

```
sudo service rabbitmq-server start
```

* Next run the following сommands in the **Origin** folder. The path will be as follows *\iotbroker.cloud-nodejs-client\src\com\mobius\software\nodejs\iotbroker\frontWeb\origin*

```
npm install 
```
 
```
bower install
```
```
gulp 
```

* Then run the following сommand in the **Server** folder. The path will be as follows *\iotbroker.cloud-nodejs-client\src\com\mobius\software\nodejs\iotbroker\server*:
```
node web.js
```
* Finally you should go to the URL where it is deployed. Usually it is http://localhost:8080/

When you finished with deployment, you can log in to your account and connect to the server. Please note that at this stage it is not possible to register as a client. You can log in to your existing account.

IoTBroker Node.js Client is developed by [Mobius Software](http://mobius-software.com).

## [License](LICENSE.md)
