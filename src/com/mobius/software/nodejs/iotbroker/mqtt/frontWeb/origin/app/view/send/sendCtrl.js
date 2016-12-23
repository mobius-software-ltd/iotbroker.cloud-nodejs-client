(function() {
    'use strict';

    sendCtrl.$inject = ["dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('sendCtrl', sendCtrl)

    /** @ngInject */
    function sendCtrl(dataFactory, sessionFactory) {
        var vm = this;
        var sessionData;

        vm.message;
        vm.publish = publish;


        vm.message = {
            retain: false,
            isDupe: false
        };

        function publish(params) {
            vm.message.username = sessionData.username;
            dataFactory.publish(vm.message);
        }

        init();

        function init() {
            sessionData = sessionFactory.getSessionData();
        }

    }

}());