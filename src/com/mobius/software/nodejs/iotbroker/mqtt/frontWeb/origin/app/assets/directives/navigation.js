(function() {
    'use strict';

    navigation.$inject = ["$location", "$rootScope"];
    angular
        .module('mqtt')
        .directive('navigation', navigation);


    /** @ngInject */
    function navigation($location, $rootScope) {

        function navigationController() {
            var vm = this;

            init();

            $rootScope.$on('$routeChangeSuccess', function() {
                vm.route = $location.$$url;

            })

            function init() {
                vm.route = $location.$$url;

            }
        }

        function link() {

        }

        return {
            bindToController: true,
            controller: navigationController,
            controllerAs: 'Ctrl',
            link: link,
            restrict: 'AE',
            scope: {},
            templateUrl: 'assets/directives/navigation.html'
        }
    }

}());