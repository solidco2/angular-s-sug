var module_solid_sug = angular.module("solid-sug", []);
module_solid_sug.directive("sSug", [
    "$parse", "$timeout",
    function ($parse, $timeout) {

        const globalCallbackPrefix = "_GCB_S_SUG_JSONP_";

        function getGlobalCallback(callback) {
            if (!window[globalCallbackPrefix]) window[globalCallbackPrefix] = 0;
            var cbName = globalCallbackPrefix + (window[globalCallbackPrefix]++);
            window[cbName] = callback;
            return cbName;
        }


        var html = [];
        html.push("<div>");
            html.push('<input class="s-sug-input" ng-model="inputModel" />');
            html.push('<ul class="s-sug-layer" ng-if="sugResult.show && sugResult.items.length">');
                html.push('<li class="s-sug-item" ng-repeat="item in sugResult.items track by $index" ng-mousedown="chosen(item.text, item.value)">');
                    html.push('{{item.text}}');
                html.push('</li>');
            html.push('</ul>');
        html.push("</div>");

        var scopePipes = {
            exp_inputModel: '=sSugModel',
            exp_sugValue: '=sSugValueModel',
            exp_sugExport: '=sSugExport',
        };

        return {
            scope: scopePipes,
            restrict: 'EA',
            template: html.join(" "),
            replace: true,
            link: {
                pre: function (scope, element, attrs) {
                    var input = element.find("input");
                    input.attr("placeholder", attrs.placeholder);
                    var type = (attrs.sSugType || "json").toLowerCase();

                    input[0].addEventListener("focus", function () {
                        var res = scope.sugResult = scope.sugResult || {};
                        res.show = true;
                        scope.$apply();
                    });
                    input[0].addEventListener("blur", function () {
                        var res = scope.sugResult = scope.sugResult || {};
                        $timeout(function () {
                            res.show = false;
                        }, 200);
                    });
                    scope.chosen = function (text, value) {
                        var res = scope.sugResult || {};
                        res.show = false;
                        if (scope.inputModel != text) {
                            scope.inputModel = text;
                            scope.sugValue = value;
                            scope.hasChosen = true;
                        }
                    };
                    scope.$watch('inputModel', function (newval, oldval) {
                        if (scope.hasChosen) {
                            scope.hasChosen = false;
                            return;
                        }
                        scope.sugValue = null;
                        if (newval != oldval) {
                            var res = {
                                KEYWORD: newval,
                                TIME: +new Date,
                            };
                            if (type == "jsonp") {
                                res.CALLBACK = getGlobalCallback(onComplete);
                            }
                            var url = attrs.sSugUrl.replace(/([:\$])(\w+)/g,
                                function (all, lead, token) {
                                    if (res.hasOwnProperty(token)) {
                                        return res[token];
                                    } else {
                                        return lead + token;
                                    }
                                }
                            );
                            function onComplete(data) {
                                if (scope.inputModel == newval) {
                                    var arr = data;
                                    attrs.sSugDataKey.split(".").forEach(
                                        function (item) {
                                            item = item.trim();
                                            if (item) {
                                                arr = arr[item];
                                            }
                                        }
                                    );
                                    var res = scope.sugExport = scope.sugResult = scope.sugResult || {};
                                    if (arr && arr.length) {
                                        res.items = arr.map(
                                            function (item) {
                                                return {
                                                    text: item[attrs.sSugTextKey],
                                                    value: item[attrs.sSugValueKey],
                                                };
                                            }
                                        );
                                    } else {
                                        res.items = [];
                                    }
                                    scope.$apply();
                                }
                            }
                            switch (type) {
                                case "jsonp":
                                    var scr = document.createElement("script");
                                    scr.src = url;
                                    scr.onerror = function () {
                                        window[res.CALLBACK] = null;
                                        delete window[res.CALLBACK];
                                        scr.parentNode.removeChild(scr);
                                        scr = null;
                                    };
                                    scr.onload = function () {
                                        setTimeout(scr.onerror, 1000);
                                    };
                                    document.head.appendChild(scr);
                                    break;
                                case "json":
                                default:
                                    var xhr = new XMLHttpRequest();
                                    xhr.open("get", url);
                                    xhr.onload = function () {
                                        onComplete(JSON.parse(xhr.responseText));
                                    };
                                    xhr.send(null);
                            }
                            
                        }
                    });

                    if (attrs.sSugModel) {
                        scope.inputModel = scope.exp_inputModel;
                        scope.$watch('inputModel', function () {
                            scope.exp_inputModel = scope.inputModel;
                        });
                    }
                    if (attrs.sSugValueModel) {
                        scope.sugValue = scope.exp_sugValue;
                        scope.$watch('sugValue', function () {
                            scope.exp_sugValue = scope.sugValue;
                        });
                    }
                    if (attrs.sSugExport) {
                        scope.sugExport = scope.exp_sugExport;
                        scope.$watch('sugExport', function () {
                            scope.exp_sugExport = scope.sugExport;
                        });
                    }
                }
            }
        };
    }
]);
