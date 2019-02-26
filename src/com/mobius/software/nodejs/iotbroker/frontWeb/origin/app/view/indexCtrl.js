(function() {
    'use strict';

    indexCtrl.$inject = ["$scope", "$location", "dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('indexCtrl', indexCtrl)

    /** @ngInject */
    function indexCtrl($scope, $location, dataFactory, sessionFactory) {
        var vm = this;
        var sessionData = {};
        vm.exit = exit;
        $scope.route = $location.$$url;

        function exit() {
            var user = sessionFactory.getSessionData();
            dataFactory.disconnect(user);
           // sessionFactory.setSessionData();
        }

        init();

        function init() {
           // sessionData = sessionFactory.getSessionData();
        }
        
    }

}());