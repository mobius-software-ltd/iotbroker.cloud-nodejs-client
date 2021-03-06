(function () {
    'use strict';

    dataFactory.$inject = ["$http", "mqttConstants", "$location", "toastr", "$q", "sessionFactory", "$rootScope"];
    angular
        .module('mqtt')
        .factory('dataFactory', dataFactory)

    /** @ngInject */
    function dataFactory($http, mqttConstants, $location, toastr, $q, sessionFactory, $rootScope) {

        return {
            connect: connect,
            getMessages: getMessages,
            publish: publish,
            getTopics: getTopics,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
            disconnect: disconnect,
            getUsers: getUsers,
            removeUser: removeUser,
            checkConnection: checkConnection
        }

        function connect(customer) {
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_CONNECT_URL, customer)
                .then(function (data) {
                    if (data.data.length < 1) {
                        toastr.error('Login failed!');
                        return;
                    }
                    $location.path('/topics');                    
                    sessionFactory.setSessionData(customer);                   
                    toastr.success('Successfully logged in!', data);                   
                }, function (data) {
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function (error) {

                });
        }

        function disconnect(params) {
            var session = angular.fromJson(sessionStorage.getItem('mqttSession'));          

            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_DISCONNECT_URL, params)
                .then(function (data) {
                    $location.path('/');
                    toastr.success('Successfully logged out!', data);
                    $rootScope.auth = false;
                }, function (data) {
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function (error) {
                    console.log(error);
                });
        }

        function getMessages(params) {
            var data = {

            }
            var def = $q.defer();

            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_MESSAGES_URL, params)
                .then(function (data) {
                    def.resolve(data);
                }, function (data) {
                    toastr.error(data.data, 'Oops some error in getting messages!');

                })
                .catch(function (error) {

                });
            return def.promise;
        }

        function publish(params) {
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_PUBLISH_URL, params)
                .then(function (data) {
                    toastr.success('Successfully published!', data);
                }, function (data) {
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function (error) {

                });
        }

        function getTopics(params) {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_TOPICS_URL, params)
                .then(function (data) {
                    def.resolve(data);
                }, function (data) {
                    console.log(data);
                    toastr.error(data.data, 'Oops some error here!');

                })
                .catch(function (error) {

                });

            return def.promise;
        }

        function subscribe(params) {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_SUBSCRIBE_URL, params)
                .then(function (data) {
                    def.resolve(data);                  
                     toastr.success('Successfully subscribed!');
                     
                })
                .catch(function (data) {
                    toastr.error('Subscribe error!');
                    console.log(data);
                });
            return def.promise;
        }

        function unsubscribe(params) {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_UNSUBSCRIBE_URL, params)
                .then(function (data) {
                    def.resolve(data);
                    toastr.success('Successfully unsubscribed!')
                })
                .catch(function (data) {
                    console.log(data);
                });
            return def.promise;
        }

        function getUsers() {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_USERS_LIST_URL)
                .then(function (data) {
                    def.resolve(data.data);
                })
                .catch(function (data) {
                    console.log(data);
                });
            return def.promise;
        }

        function removeUser(params) {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_USERS_REMOVE_URL, params)
                .then(function (data) {
                    def.resolve(data.data);
                })
                .catch(function (data) {
                    console.log(data);
                });
            return def.promise;
        }

        function checkConnection(params) {
            var def = $q.defer();
            $http.post(mqttConstants.API_SERVER_URL + mqttConstants.API_CONNECTION_URL, params)
                .then(function (data) {                   
                    def.resolve(data.data);
                })
                .catch(function (data) {
                    $location.path('/');
                });
            return def.promise;
        }
    }

}());