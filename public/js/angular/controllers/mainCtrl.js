app.controller('mainCtrl', ['$scope', 'dataService',
    function($scope, dataService) {

        // Set filter options - outside of D3 due to asynchronicity
        $scope.filterOptions = dataService.filterOptions
        $scope.metricOptions = dataService.metricOptions
        $scope.appOptions = dataService.appOptions

        $scope.selectedMetric =  $scope.selectedMetric || dataService.metricOptions.metrics[1]

        // Assign filter to the scope by watching changes to the $scope.filterOptions object
        $scope.$watch("filterOptions.selectedFilter", function(newVal, oldVal, scope) {
            var initializing = true;
            if (newVal === oldVal && !initializing) {
                initializing = false;
                return;
            }
            // Pull in csv file with d3
            d3.csv('resources/challenge-dataset.csv', function(dataset) {
                    // Set start and end dates for dataset
                    var startDate = dataset[0].Date;
                    var endDate = dataset[dataset.length - 1].Date;

                    // Set dimensions for aggregate charts
                    var dimensions = {
                        'width': 550,
                        'height': 350
                    };

                    // Filter dataset to return Retention
                    var retention = dataset.filter(function(row) {
                        return row['Metric'] == 'D1 Retention';
                    });

                    // Filter dataset to return DAU
                    var dataset = dataset.filter(function(row) {
                        return row['Metric'] == 'DAU';
                    });

                    // Function to get DAU charts
                    var getDau = function(dataset) {
                        var datasetMax = 0;
                            // Sum values by category and date
                        var rollup = dataService.nestFunction.rollup(function(d) {
                            return d3.sum(d, function(g) {
                                return +g.y;
                            });
                        });

                        // Map data to nested App
                        var chartDAUData = rollup.entries(
                            dataset.map(function(d) {
                                if (d.y > datasetMax) {
                                    datasetMax = d.y;
                                }
                                return dataService.entriesFxn(d);
                            })
                        );

                        // Use NVD3 library to add Line Chart for cumulative app use
                        nv.addGraph(function() {
                            var chart = nv.models.lineChart()
                                .x(function(d) {
                                    return new Date(d.key);
                                })
                                .y(function(d) {
                                    return d.values;
                                })
                                .useInteractiveGuideline(true)
                                .clipEdge(true);

                            chart.xAxis
                                .axisLabel("Date")
                                .tickFormat(function(d) {
                                    return dataService.dateLabels(d);
                                })
                                .scale()
                                .domain([startDate, endDate]);

                            chart.yAxis
                                .axisLabel("Users")
                                // .axisLabelDistance(100)
                                .tickFormat(d3.format(',f'))
                                .scale()
                                .domain([0, datasetMax]);

                            d3.select('#dau-chart svg')
                                .datum(chartDAUData)
                                .style(dimensions)
                                .call(chart);

                            nv.utils.windowResize(chart.update);
                            return chart;
                        });
                    };

                    // Function to get Retention charts
                    var getRetention = function(dataset) {
                        // Get avg percentages by category and date
                        var rollup = dataService.nestFunction.rollup(function(d) {
                            return d3.mean(d, function(g) {
                                return +g.y;
                            });
                        });

                        // Map data to nested App
                        var chartRetentionData = rollup.entries(
                            dataset.map(function(d) {
                                return dataService.entriesFxn(d);
                            })
                        );

                        // Use NVD3 library to add Line Chart for cumulative app use
                        nv.addGraph(function() {
                            var chart = nv.models.lineChart()
                                .x(function(d) {
                                    return new Date(d.key);
                                })
                                .y(function(d) {
                                    return d.values;
                                })
                                .useInteractiveGuideline(true)
                                .clipEdge(true);

                            chart.xAxis
                                .axisLabel("Date")
                                .tickFormat(function(d) {
                                    return dataService.dateLabels(d);
                                })
                                .scale()
                                .domain([startDate, endDate]);

                            chart.yAxis
                                .axisLabel("% Retention")
                                // .axisLabelDistance(100)
                                .tickFormat(d3.format(',f'))
                                .scale()
                                .domain([0, 100]);

                            d3.select('#retention-chart svg')
                                .datum(chartRetentionData)
                                .style(dimensions)
                                .call(chart);

                            nv.utils.windowResize(chart.update);

                            return chart;
                        });
                    };

                    // Function to get DAU detail charts (by App)
                    var getDauDetails = function(dataset) {

                        // Sum values by category
                        var rollup = dataService.nestFunctionDetails.rollup(function(d) {
                            if (d[d.length - 1].Platform === "iOS") {
                                dataService.stats.iOSLatest = parseInt(d[d.length - 1].Value);
                            } else if (d[d.length - 1].Platform === "Android") {
                                dataService.stats.androidLatest = parseInt(d[d.length - 1].Value);
                            }
                            if (d[d.length - 2].Platform === "iOS") {
                                dataService.stats.iOSLatest = parseInt(d[d.length - 1].Value);
                            } else if (d[d.length - 2].Platform === "Android") {
                                dataService.stats.androidLatest = parseInt(d[d.length - 2].Value);
                            }

                            return d3.sum(d, function(g) {
                                return +g.y;
                            });
                        });

                        // Map data to nested App
                        var chartDAUData = rollup.entries(
                            dataset.map(function(d) {
                                return dataService.entriesDetailFxn(d);
                            })
                        );

                        // Calculate stats
                        for (var item in chartDAUData) {
                            var objKey = chartDAUData[item].key;
                            dataService.stats[objKey] = chartDAUData[item].values;
                            dataService.stats.totalDAU += chartDAUData[item].values;
                        }
                        dataService.stats.minDailyValue = dataService.stats.iOSMinDailyValue + dataService.stats.androidMinDailyValue;
                        dataService.stats.maxDailyValue = dataService.stats.iOSMaxDailyValue + dataService.stats.androidMaxDailyValue;
                        dataService.stats.meanDailyValue = parseInt((dataService.stats.minDailyValue + dataService.stats.maxDailyValue) / 2);
                        dataService.stats.latestValue = dataService.stats.iOSLatest + dataService.stats.androidLatest;

                        // Global variable to increment class
                        var i = 1;

                        // Generate bullet chart
                        nv.addGraph(function() {
                            var chart = nv.models.bulletChart();

                            d3.select('.nvd3-bullet-chart' + i)
                                .append('svg')
                                .attr('class', 'nvd3-bullet-chart1')
                                .datum(exampleData())
                                .transition()
                                .duration(1000)
                                .call(chart);

                            nv.utils.windowResize(chart.update);

                            return chart;
                        });

                        // Generate stacked bar chart
                        nv.addGraph(function() {
                            barStats = [
                                { key: 'iOS',
                                  color: "#A865CD",
                                  values: [
                                    { x: 'Min', y: dataService.stats.iOSMinDailyValue/1000000 },
                                    { x: 'Max', y: dataService.stats.iOSMaxDailyValue/1000000 },
                                    { x: 'Latest', y: dataService.stats.iOSLatest/1000000 }
                                  ]},
                                { key: 'Android',
                                  color: "#FFFF78",
                                  values: [
                                    { x: 'Min', y: dataService.stats.androidMinDailyValue/1000000 },
                                    { x: 'Max', y: dataService.stats.androidMaxDailyValue/1000000 },
                                    { x: 'Latest', y: dataService.stats.androidLatest/1000000 }
                                  ]
                                }];

                            var chart = nv.models.multiBarChart();

                            chart.yAxis
                                .tickFormat(d3.format(',.1f'));

                            chart.x(function(d) {
                                return d.x; });
                            chart.y(function(d) {
                                return d.y; });
                            chart.showLegend(false);

                            d3.select('.nvd3-bar-chart' + i)
                              .append('svg')
                              .attr('class', 'nvd3-bar-chart1')
                              .datum(barStats)
                              .transition()
                              .duration(500)
                              .call(chart);

                            nv.utils.windowResize(chart.update);

                            return chart;
                        });
                        // Generate pie chart
                        nv.addGraph(function() {
                            var myColors = ["#A865CD", "#FFFF78"];
                            d3.scale.myColors = function() { return d3.scale.ordinal().range(myColors); };

                            var pieChart = nv.models.pieChart()
                                .x(function(d) {
                                    return d.key;
                                })
                                .y(function(d) {
                                    return d.values;
                                })
                                .showLabels(true)
                                .color(myColors);

                            d3.select(".nvd3-pie-chart" + i)
                                .append('svg')
                                .attr('class', 'nvd3-pie-chart1')
                                .datum(chartDAUData)
                                .transition().duration(350)
                                .call(pieChart);

                            return pieChart;
                        });

                        function exampleData() {
                            return {
                                "title": dataService.stats.app,
                                "subtitle": "DAU (m)",
                                "ranges": [dataService.stats.minDailyValue/1000000, dataService.stats.meanDailyValue/1000000, dataService.stats.maxDailyValue/1000000], //Minimum, mean and maximum values.
                                "measures": [dataService.stats.maxDailyValue/1000000], //Value representing current measurement (the thick blue line in the example)
                                "markers": [dataService.stats.latestValue/1000000] //Place a marker on the chart (the white triangle marker)
                            };
                        }

                        i+= 1;
                    };

                    // Call functions to create the overview charts
                    getDau(dataset);
                    getRetention(retention);

                    var canData = dataset.filter(function(row) {
                        return row['App'] == 'CandyBash';
                    });
                    var wweData = dataset.filter(function(row) {
                        return row['App'] == 'Words With Enemies';
                    });
                    var craData = dataset.filter(function(row) {
                        return row['App'] == 'Crappy Birds';
                    });
                    var zubData = dataset.filter(function(row) {
                        return row['App'] == 'Zuber';
                    });
                    var carData = dataset.filter(function(row) {
                        return row['App'] == 'Carry';
                    });
                    getDauDetails(canData);
                    getDauDetails(wweData);
                    getDauDetails(craData);
                    getDauDetails(zubData);
                    getDauDetails(carData);

                    var tooltip = d3.select("div.tooltip");

                    // Removes duplicate DOM elements on watch event
                    $scope.$apply(function() {
                        $(document).ready(function() {
                            $('.nvd3-bullet-chart1').remove();
                            $('.nvd3-bar-chart1').remove();
                            $('.nvd3-pie-chart1').remove();
                        });
                    });
                }); // closes scope.watch
        });
    }
])
