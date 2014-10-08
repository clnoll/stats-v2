app.factory("dataService", ['$q', function($q) {

  // Set filter options for scope
  var filterOptions =  {
    filters: ['App', 'Category', 'Platform'],
    selectedFilter: "App"
  };
  var metricOptions =  {
    metrics: ['D1 Retention', 'DAU'],
  };
  var appOptions = {
    apps: ['CandyBash', 'Words with Enemies', 'Crappy Birds', 'Zuber', 'Carry']
  };

  // CUMULATIVE CHARTS

  // Format date for line chart labels
  var dateLabels = function(d) {
      str = d3.time.format('%m/%Y')(new Date(d));
      return str.substr(0, 3) + str.substr(5);
  };

  // Use d3's nest method to reorganize data by date
  var nestByDateFunction = d3.nest().key(function(d) {
      return d.Metric;
  }).key(function(d) {
      return d.Date;
  });

  // Use d3's nest method to reorganize data by the selected filter and date
  var nestFunction = d3.nest().key(function(d) {
      if (filterOptions.selectedFilter === "App") {
          return d.App;
      } else if (filterOptions.selectedFilter === "Category") {
          return d.Category;
      } else if (filterOptions.selectedFilter === "Platform") {
          return d.Platform;
      }
  }).key(function(d) {
      return d.Date;
  });

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

  // DETAIL CHARTS

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

  return {
    filterOptions: filterOptions,
    metricOptions: metricOptions,
    appOptions: appOptions,
    nestFunction: nestFunction,
    nestByDateFunction: nestByDateFunction,

    // nestFunctionDetails: nestFunctionDetails,
    entriesFxn: entriesFxn,
    entriesDetailFxn: entriesDetailFxn,
    dateLabels: dateLabels
    // stats: stats
  }

}])
