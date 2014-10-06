app.directive('resizeable', function($window, $scope) {
    $scope.initializeWindowSize = function() {
        $scope.windowHeight = $window.innerHeight;
        $scope.windowWidth = $window.innerWidth;
    }

    $scope.initializeWindowSize();
    angular.element($window).bind('resize', function() {
        $scope.initializeWindowSize();
        $scope.$apply();
    })
})
