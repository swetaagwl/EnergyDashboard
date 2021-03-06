angular.module('dataTableModule').component('datatable', {
    templateUrl: 'data-table/data-table.template.html',
    bindings: {
        tableSrc: '<',
        searchEnabled: '<',
        reorderEnabled: '<',
        isLoading: '<',
    },
    controller: ['$filter', '$scope', '$http', function TableController($filter, $scope, $http) {
        var self = this;
        this.data = [];
        this.sums = {};
        this.averages = {};
        this.columnNames = [];
        this.columnNamesObjs = [];
        this.templates = [];
        this.showTemplates = false;

        var defaultValues = [
            // Start of AHU default values
            "ACH",
            "Air Flow Differential",
            "Air Flow Differential Setpoint",
            "Calculated Occ Total Exhaust",
            "Calculated Unocc Total Exhaust",
            "Canopy Hood High Daily Duration",
            "Canopy Hood High Monthly Duration",
            'Cooling Driving Lab',

            //Start of SubSystem default values
            "Coil Heating Energy BTU per Hr",
            "Cooling Energy BTU per Hr",
            "Heating Energy BTU per Hr",
            "Reheating Energy BTU per Hr",
            "Total Air Flow Avoided"
        ];

        this.formatValue = function(value) {
            if (value === undefined || value.value === undefined) {
                return "N/A";
            } else if (typeof(value.value) === "number") {
                return $filter('number')(value.value, 2);
            } else {
                return value.value;
            }
        };

        this.valueStyle = function(value) {
            if (value === undefined) {
                return 'missingValue';
            } else if (value.good) {
                return 'goodValue';
            } else {
                return 'badValue';
            }
        }

        this.getters = {
            value: function(key, element) {
                return element[key].value;
            }
        };

        this.$onChanges = function() {
            if (this.searchEnabled === undefined) {
                this.searchEnabled = false;
            }
            if (this.reorderEnabled === undefined) {
                this.reorderEnabled = false;
            }
            if (this.tableSrc.length == 0) {
                return;
            }

            var columnSet = {};

            for (var element of this.tableSrc) {
                for (var key in element) {
                    if (key !== "name" && key !== "building") {
                        columnSet[key] = true;
                    }
                }
            }

            this.columnNamesObjs = [];

            this.columnNames = Object.keys(columnSet);

            var firstValues = 0;
            for (var columnName of this.columnNames) {
                var column = {};

                column.name = columnName;

                try{
                    column.units = self.tableSrc[0][column.name].unitsAbbreviation;
                }
                catch(e){
                    column.units = "";
                }
                // check if the string element is in the defaultValues array
                if (defaultValues.includes(columnName) || firstValues < 10) {
                    column.isChecked = true;
                } else {
                    column.isChecked = false;
                }
                this.columnNamesObjs.push(column);
                firstValues++;
            }

            self.data = self.tableSrc;
            this.displayed = this.data;

            // Get templates from server
            $http({
                method: 'GET',
                url: '/getTemplates',
            }).then(function successCallback(response) {
                console.log("get templates success", response.data);
                self.templates = response.data;
            }, function errorCallback(response) {
                console.error("get templates failed ", response);
            });

        }; //end $onChanges

        this.ShowColumnList = function(columnsNames) {
            // just a check to make sure the button can not be clicked when there is nothing to show
            if (columnsNames.length != 0) {
                document.getElementById("myDropdown").classList.toggle("show");
            }
        };

        // save template/profile for cols
        this.SaveColumnList = function(columnObjs) {
            var colObjToAdd = JSON.parse(angular.toJson(columnObjs));
            var template = {"colObj": colObjToAdd,
                            "templateName": this.currTemplateName};
            this.templates.push(template);
            console.log("added template ", this.templates);

            // POST template/profile to server
            $http({
                method: 'POST',
                url: '/templates',
                data: angular.toJson(template),
                headers: {'Content-Type': 'application/json'}
            }).then(function successCallback(response) {
                console.log("POST Templates Success");
                document.getElementById("templateInput").value = "";
            }, function errorCallback(response) {
                console.error("POST Failed ", response);
            });
        };

        this.ApplyTemplate = function(template){
            this.columnNamesObjs = template.colObj;
        };

        this.updateCalculations = function() {
            this.sums = {};
            this.averages = {};
            for (var column of this.columnNamesObjs) {
                this.sums[column.name] = this.sumColumn(column.name);
                this.averages[column.name] = this.averageColumn(column.name);
            }
        }

        this.sumColumn = function(columnName) {
            var acc = this.reduceColumn(columnName, { sum: 0 }, function(val, acc) { acc.sum += val; });
            return acc.sum;
        };

        this.averageColumn = function(columnName) {
            var acc = this.reduceColumn(columnName, { sum: 0, len: 0 }, function(val, acc) {
                acc.sum += val;
                acc.len++;
            });
            return acc.len > 0 ? acc.sum / acc.len : 0;
        };

        // For every currently displayed row in column 'columnName', applies the function 'opFunc' to the cell's value and the accumulator object 'accumulator'.
        // Returns the accumulated value object.
        this.reduceColumn = function(columnName, accumulator, opFunc) {
            var a = accumulator;
            for (var element of this.displayed) {
                var colVal = element[columnName];
                if (colVal && colVal.good && colVal.value) {
                    opFunc(colVal.value, a);
                }
            }
            return a;
        }

        // Whenever the displayed data is changed, recalculate sum and average of the shown rows only
        $scope.$watch('$ctrl.displayed', function(newValue, oldValue) {
            console.log("Recalculating...");

            self.updateCalculations();
        });

    }]
});




// this function was for the old dropdown (non-bootstrap) just thought I would leave it just in case

// Close dropdowns if there is a click outside of it
// window.onclick = function(event) {
//   if (!event.target.matches('.dropbtn')) {
//     if (!event.target.matches('.dropdownelm')) {
//         if (!event.target.matches('.dropDownCheckBox')) {
//             var dropdowns = document.getElementsByClassName("dropdown-content");
//             var i;
//             for (i = 0; i < dropdowns.length; i++) {
//               var openDropdown = dropdowns[i];
//               if (openDropdown.classList.contains('show')) {
//                 openDropdown.classList.remove('show');
//               }
//             }
//           }
//         }
//     }
// }
