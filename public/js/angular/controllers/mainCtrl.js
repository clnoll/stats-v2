app.controller('mainCtrl', ['$scope',
    function($scope) {
        // Set filter options - outside of D3 due to asynchronicity
        $scope.filterOptions = {
            filters: ['App', 'Category', 'Platform'],
            selectedFilter: 'App'
        };
        $scope.metricOptions = {
            metrics: ['D1 Retention', 'DAU'],
            selectedMetric: 'DAU'
        };
        $scope.appOptions = {
            apps: ['CandyBash', 'Words with Enemies', 'Crappy Birds', 'Zuber', 'Carry']
        };

        // Assign filter to the scope by watching changes to the $scope.filterOptions object
        $scope.$watch("filterOptions.selectedFilter", function(newVal, oldVal, scope) {
            var initializing = true;
            if (newVal === oldVal && !initializing) {
                initializing = false;
                return;
            }

            // scope.filterOptions.selectedFilter = newVal;

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

                    // Use d3's nest method to reorganize data by the selected filter and date
                    var nestFunction = d3.nest().key(function(d) {
                        if ($scope.filterOptions.selectedFilter === "App") {
                            return d.App;
                        } else if ($scope.filterOptions.selectedFilter === "Category") {
                            return d.Category;
                        } else if ($scope.filterOptions.selectedFilter === "Platform") {
                            return d.Platform;
                        }
                    }).key(function(d) {
                        return d.Date;
                    });

                    // Format date for line chart labels
                    var dateLabels = function(d) {
                        str = d3.time.format('%m/%Y')(new Date(d));
                        return str.substr(0, 3) + str.substr(5);
                    };

                    // Format nested data prior to rollup, for cumulative charts
                    var entriesFxn = function(d) {
                        // Parse date values to JavaScript date object
                        var format = d3.time.format("%m/%d/%Y");
                        var parseFormat = format.parse(d.Date);
                        d.Date = format.parse(d.Date);
                        // Assign x and y variables for import into chart
                        d.x = d.Date;
                        if (d.Metric === "DAU") {
                            d.y = +d.Value;
                        } else if (d.Metric === "D1 Retention") {
                            var str = d.Value;
                            d.y = +(str.substring(0, str.length - 1)); // remove % sign and change string to numerical value
                        }
                        return d;
                    };

                    // Format nested data prior to rollup, for detail charts
                    var entriesDetailFxn = function(d) {
                        if (d.Metric === "DAU") {
                            d.y = +d.Value;
                        } else if (d.Metric === "D1 Retention") {
                            var str = d.Value;
                            d.x = d.Platform;
                            d.y = +(str.substring(0, str.length - 1)); // remove % sign and change string to numerical value
                        }
                        return d;
                    };

                    // Function to get DAU charts
                    var getDau = function(dataset) {
                        var datasetMax = 0;
                            // Sum values by category and date
                        var rollup = nestFunction.rollup(function(d) {
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
                                return entriesFxn(d);
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
                                    return dateLabels(d);
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
                        var rollup = nestFunction.rollup(function(d) {
                            return d3.mean(d, function(g) {
                                return +g.y;
                            });
                        });

                        // Map data to nested App
                        var chartRetentionData = rollup.entries(
                            dataset.map(function(d) {
                                return entriesFxn(d);
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
                                    return dateLabels(d);
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
                        // Create stats object to house data for charts
                        var stats = {
                                app: dataset[0].App,
                                totalDAU: 0,
                                minDailyValue: 0,
                                maxDailyValue: 0,
                                iOSMinDailyValue: 0,
                                iOSMaxDailyValue: 0,
                                androidMinDailyValue: 0,
                                androidMaxDailyValue: 0
                            };
                        // Reorganize data by platform
                        var nestFunction = d3.nest().key(function(d) {
                            val = parseInt(d.Value);
                            if (d.Platform === "iOS") {
                                if (stats.iOSMinDailyValue == 0 || val < stats.iOSMinDailyValue) {
                                    stats.iOSMinDailyValue = val;
                                }
                                if (val > stats.iOSMaxDailyValue) {
                                    stats.iOSMaxDailyValue = val;
                                }
                            } else if (d.Platform === "Android") {
                                if (stats.androidMinDailyValue == 0 || val < stats.androidMinDailyValue) {
                                    stats.androidMinDailyValue = val;
                                }
                                if (val > stats.androidMaxDailyValue) {
                                    stats.androidMaxDailyValue = val;
                                }
                            }
                            return d.Platform;
                        });

                        // Sum values by category
                        var rollup = nestFunction.rollup(function(d) {
                            if (d[d.length - 1].Platform === "iOS") {
                                stats.iOSLatest = parseInt(d[d.length - 1].Value);
                            } else if (d[d.length - 1].Platform === "Android") {
                                stats.androidLatest = parseInt(d[d.length - 1].Value);
                            }
                            if (d[d.length - 2].Platform === "iOS") {
                                stats.iOSLatest = parseInt(d[d.length - 1].Value);
                            } else if (d[d.length - 2].Platform === "Android") {
                                stats.androidLatest = parseInt(d[d.length - 2].Value);
                            }

                            return d3.sum(d, function(g) {
                                return +g.y;
                            });
                        });

                        // Map data to nested App
                        var chartDAUData = rollup.entries(
                            dataset.map(function(d) {
                                return entriesDetailFxn(d);
                            })
                        );

                        // Calculate stats
                        for (var item in chartDAUData) {
                            var objKey = chartDAUData[item].key;
                            stats[objKey] = chartDAUData[item].values;
                            stats.totalDAU += chartDAUData[item].values;
                        }
                        stats.minDailyValue = stats.iOSMinDailyValue + stats.androidMinDailyValue;
                        stats.maxDailyValue = stats.iOSMaxDailyValue + stats.androidMaxDailyValue;
                        stats.meanDailyValue = parseInt((stats.minDailyValue + stats.maxDailyValue) / 2);
                        stats.latestValue = stats.iOSLatest + stats.androidLatest;

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
                                    { x: 'Min', y: stats.iOSMinDailyValue/1000000 },
                                    { x: 'Max', y: stats.iOSMaxDailyValue/1000000 },
                                    { x: 'Latest', y: stats.iOSLatest/1000000 }
                                  ]},
                                { key: 'Android',
                                  color: "#FFFF78",
                                  values: [
                                    { x: 'Min', y: stats.androidMinDailyValue/1000000 },
                                    { x: 'Max', y: stats.androidMaxDailyValue/1000000 },
                                    { x: 'Latest', y: stats.androidLatest/1000000 }
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
                                "title": stats.app,
                                "subtitle": "DAU (m)",
                                "ranges": [stats.minDailyValue/1000000, stats.meanDailyValue/1000000, stats.maxDailyValue/1000000], //Minimum, mean and maximum values.
                                "measures": [stats.maxDailyValue/1000000], //Value representing current measurement (the thick blue line in the example)
                                "markers": [stats.latestValue/1000000] //Place a marker on the chart (the white triangle marker)
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
