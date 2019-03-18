(function() {
    'use strict';

    sendCtrl.$inject = ["dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('sendCtrl', sendCtrl)

    /** @ngInject */
    function sendCtrl(dataFactory, sessionFactory) {
        var vm = this;
        vm.sessionData = sessionFactory.getSessionData();;

        vm.message;
        vm.publish = publish;


        vm.message = {
            retain: false,
            isDupe: false
        };

        function publish(params) {
            vm.message.username = vm.sessionData.username;
            vm.message.clientID = vm.sessionData.clientID;
            vm.message.type = vm.sessionData.type;
            vm.message.unique = vm.sessionData.unique;
            dataFactory.publish(vm.message);
            vm.message = {
                retain: false,
                isDupe: false
            };
        }

        init();

        function init() {
            vm.sessionData = sessionFactory.getSessionData();
           
        }

    }

}());