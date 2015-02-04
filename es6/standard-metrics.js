angular.module('standardMetrics', ['ngResource', 'standardData'])
    .directive('standardChartPanel', function () { // standard-chart-panel directive
        return {
            restrict: 'E',
            scope: {
                chartId: '@',
                config: '=',
                staticData: '=',
                chartHeight: '@',
                chartWidth: '@',
                heightClass: '@',
                footerInfo: '@',
                cursorPoint: '@'
            },
            templateUrl: 'templates/standard-chart-panel.html',
            link: function (scope) {
                scope.cursorPoint = {x: 0, y: 0}
            }
        };

    })
    .directive('standardChart', ['$window', function ($window) { // standard-chart directive
        return {
            restrict: 'E',
            scope: {
                chartId: '@',
                config: '=',
                sData: '@',
                staticData: '=',
                chartHeight: '@',
                chartWidth: '@',
                cursorPoint: '=',
                isSpace: '@',
                drawInterval: '@'
            },
            controller: ['$scope', 'd3', '$window', '$interval', function ($scope, d3, $window, $interval) { // standard-chart controller
                var svgPoint = null;

                if ($scope.config) {
                    $scope.chartId = $scope.config.chartId;
                }
                else {
                    if ($scope.chartId) {
                        // get config from db
                    }
                }

                $scope.init = function (element) {
                    var $svg = d3.select(element).append('svg').style('height', $scope.chartHeight).style('width', $scope.chartWidth);
                    $scope.svg = $svg.node();
                    $scope.$svg = $window.jQuery($scope.svg);
                    $scope.g = $svg.append('g').node();
                    svgPoint = $scope.svg.createSVGPoint();
                }

                $scope.setCursorPoint = function ($event) {
                    $scope.$apply(function () {
                        svgPoint.x = $event.clientX;
                        svgPoint.y = $event.clientY;
                        $scope.cursorPoint = svgPoint.matrixTransform($scope.g.getScreenCTM().inverse());
                    });
                }

                $scope.select = {
                    svg: function () {
                        return d3.select($scope.svg);
                    },
                    g: function () {
                        return d3.select($scope.g);
                    }
                }

                $scope.setupCartesian = function (bounds) {
                    var g = $scope.g,
                        svgWidth = $scope.$svg.width(),
                        svgHeight = $scope.$svg.height(),
                        x0 = 0,
                        y0 = 0;

                    if (g) {
                        g.setAttribute("transform", "matrix(" + svgWidth / (bounds.xMax - bounds.xMin) + "," +
                        0 + "," +
                        0 + "," +
                        (-svgHeight / (bounds.yMax - bounds.yMin)) + "," +
                        (-svgWidth / (bounds.xMax - bounds.xMin) * bounds.xMin + x0) + "," +
                        (svgHeight / (bounds.yMax - bounds.yMin) * bounds.yMax + y0) + ")");
                    }
                }

                $scope.drawAxes = function (bounds) {
                    var axisLines = [{x1: bounds.xMin, y1: 0, x2: bounds.xMax, y2: 0},
                        {x1: 0, y1: bounds.yMin, x2: 0, y2: bounds.yMax}];
                    $scope.select.g().selectAll('line').data(axisLines).enter()
                        .append('line')
                        .attr('stroke-width', 1)
                        .attr('stroke', 'black')
                        .attr('x1', function (d) {
                            return d.x1;
                        })
                        .attr('y1', function (d) {
                            return d.y1;
                        })
                        .attr('x2', function (d) {
                            return d.x2;
                        })
                        .attr('y2', function (d) {
                            return d.y2;
                        });
                }

                $scope.drawCircles = function (data) {
                    return $scope.select.g().selectAll('circle').data(data).enter()
                        .append('circle')
                        .attr('r', 1)
                        .attr('cx', function (d) {
                            return d.x;
                        })
                        .attr('cy', function (d) {
                            return d.y;
                        });
                }

                $scope.drawContinuous = function (data) {
                    var bounds = $scope.calculations.getBounds(data);
                    $scope.drawAxes(bounds);
                    var circles = $scope.drawCircles(data),
                        drawInterval = parseInt($scope.drawInterval);
                    $interval(function () {
                        circles.data(data)
                            .transition().duration(drawInterval)
                            .attr('cx', function (d) {
                                return d.x;
                            })
                            .attr('cy', function (d) {
                                return d.y;
                            })
                    }, drawInterval);
                }

                //TODO: Combine charting models
                $scope.drawSpace = function () {
                    $scope.drawAxes($scope.config.defaults.bounds);
                    //var circles = $scope.drawCircles($scope.config.data),
                    var drawInterval = parseInt($scope.drawInterval),
                        items = $scope.select.g().selectAll('.ionic-ship').data($scope.config.data).enter()
                            .append(function (d) {
                                return document.createElementNS('http://www.w3.org/2000/svg', d.data.shape);
                            });
                    items.classed('ionic-ship');
                    items.each(function (d) {
                        var $this = d3.select(this);
                        for (var key in d.data.dynamic) {
                            if (d.data.dynamic.hasOwnProperty(key)) {
                                $this.attr(key, function () {
                                    return d.data.dynamic[key];
                                });
                            }
                        }
                    });

                    $interval(function () {
                        items.data($scope.config.data)
                            .transition().duration(drawInterval)
                            .each(function (d) {
                                var $this = d3.select(this);
                                for (var key in d.data.dynamic) {
                                    if (d.data.dynamic.hasOwnProperty(key)) {
                                        $this.attr(key, function () {
                                            return d.data.dynamic[key];
                                        });
                                    }
                                }
                            });
                    }, drawInterval);
                }

                $scope.calculations = {
                    getBounds: function (points) {
                        var initialized = false,
                            xMin = 0,
                            xMax = 0,
                            yMin = 0,
                            yMax = 0,
                            key,
                            point;
                        for (key in points) {
                            point = points[key];
                            if (initialized) {
                                if (xMin > point.x) {
                                    xMin = point.x;
                                }
                                if (xMax < point.x) {
                                    xMax = point.x;
                                }
                                if (yMin > point.y) {
                                    yMin = point.y;
                                }
                                if (yMax < point.y) {
                                    yMax = point.y;
                                }
                            }
                            else {
                                xMin = xMax = point.x;
                                yMin = yMax = point.y;
                                initialized = true;
                            }
                        }
                        return {
                            xMin: xMin,
                            xMax: xMax,
                            yMin: yMin,
                            yMax: yMax
                        }
                    }
                }
            }],
            link: function (scope, element) {
                if (!scope.sData) {
                    scope.sData = [];
                }

                var mapDynamic = function () {
                    scope.sData = [];
                    for (var attributeKey in scope.config.attributes) {
                        var mapKey = scope.config.attributes[attributeKey];
                        var mapping = scope.config.attributeMappings[mapKey];
                        for (var i = 0; i < mapping.values.length; i++) {
                            if (!scope.sData[i]) {
                                scope.sData[i] = {};
                            }
                            scope.sData[i][attributeKey] = mapping.values[i];
                        }
                    }
                };

                if (scope.isSpace) {
                    scope.sData = scope.config.data;
                }
                else {
                    mapDynamic();
                }


                scope.init(element[0]);


                if (!scope.isSpace) {
                    element.bind('mouseover', function () {
                        element.bind('mousemove', function ($event) {
                            scope.setCursorPoint($event);
                            return false;
                        });
                        return false;
                    })
                    element.bind('mouseout', function () {
                        element.unbind('mousemove');
                    })
                    scope.$on('$destroy', function () {
                        element.unbind('mouseover');
                        element.unbind('mouseout');
                        element.unbind('mousemove');
                    });
                }

                if (!scope.isSpace) {
                    scope.$watch(element, function () {
                        var bounds = scope.calculations.getBounds(scope.sData);
                        scope.setupCartesian(bounds);
                    });
                    $window.onresize = function (event) {
                        var bounds = scope.calculations.getBounds(scope.sData);
                        scope.setupCartesian(bounds);
                    };
                    scope.drawContinuous(scope.sData);

                }
                if (scope.isSpace) {
                    scope.$watch(element, function () {
                        scope.setupCartesian(scope.config.defaults.bounds);
                    });
                    $window.onresize = function (event) {
                        scope.setupCartesian(scope.config.defaults.bounds);
                    };
                    scope.drawSpace();
                }
            }
        }
    }]);