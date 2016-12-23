(function() {
    'use strict';

    ConfigFn.$inject = ["$locationProvider", "$routeProvider", "$httpProvider"];
    angular
        .module('mqtt')
        .config(ConfigFn)

    /** @ngInject */
    function ConfigFn($locationProvider, $routeProvider, $httpProvider) {
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        });

        $httpProvider.defaults.cache = true;

        $routeProvider
            .when('/', {
                templateUrl: 'view/login/login.html',
                controller: 'loginCtrl as Ctrl',
                // resolve: {
                //     routes: ['dataFactory', function(dataFactory) {
                //         return dataFactory.listRoutesByCustomerDate({
                //             pageNumber: 1,
                //             pageSize: 1000
                //         });
                //     }],
                //     tasks: ['dataFactory', function(dataFactory) {
                //         return dataFactory.listTasksByCustomerDate({
                //             pageNumber: 1,
                //             pageSize: 1000
                //         });
                //     }],

                // }
            })
            .when('/topics', {
                templateUrl: 'view/topics/topics.html',
                controller: 'topicsCtrl as Ctrl',
            })
            .when('/send', {
                templateUrl: 'view/send/send.html',
                controller: 'sendCtrl as Ctrl',
            })
            .when('/messages', {
                templateUrl: 'view/messages/messages.html',
                controller: 'messagesCtrl as Ctrl',
            })
            .otherwise('/');
    }

}());