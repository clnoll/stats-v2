var app = angular.module("RenzuApp", ['nvd3ChartDirectives', 'ngRoute']);

app.config(function($routeProvider) {
    $routeProvider

    // route for the display page
        .when('/', {
            templateUrl: '/views/display.html',
        })
        .when('/app/:appname', {
            templateUrl: 'views/details.html',
        });
});

