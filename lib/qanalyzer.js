'use strict';


class QueryAnalyzer {

	
    constructor() {
        if (window.neo4jDesktopApi) {
            window.neo4jDesktopApi.showMenuOnRightClick(false);
        }
        this.SUMMARY_TABLE_KEY = "__summaryTable";
        this.FILTER_INPUT_KEY = "__filterInput";
        this.SUMMARY_FILTER_KEY = "__summaryFilter";

        this.LOG_DATE_FILTER_KEY = "__logdatefilter";
        this.LOG_QUERY_FILTER_KEY = "__logqueryfilter";
        this.LOG_DATE_FILTER_INPUT = "__logdatefilter_INP";
        this.LOG_QUERY_FILTER_INPUT = "__logqueryfilter_INP";
        this.LOG_HEADER_SECTION_KEY = "__logheadersection";
        this.LOG_FILTER_SECTION_KEY = "__logfiltersection";
        this.LOG_TABLE_SECTION_KEY = "__logtablesection";
        this.UNFINISHED_QUERY_HEADER= "unfinishedQueriesHeader";
        this.UNFINISHED_QUERY_FILTER= "unfinishedQueriesFilter";
        this.UNFINISHED_QUERY_TABLE= "unfinishedQueriesTable";
        this.UNFINISHED_FILTER_KEY = "__unfinishedFilter_";
        this.UNFINISHED_FILTER_INPUT = "__unfinishedFilter_INP";
        this.ANALYSE_MESSAGE_ID = "analyseMessage";

        this.filterActiveBackground_color = '#fafab7';
        this.filterInActiveBackground_color = '#ffffff';
        this.logFilterChangeDelay = false;
        this.logFilterChangeDelayTime = 1000; // milliseconds
        this.summaryFilterChangeDelay = false;
        this.summaryFilterChangeDelayTime = 1000; // milliseconds

        //console.log("QueryAnalyze initialized");
        this.log = [];
        this.ana = [];
        this.onlyStarted = new Map();
        this.lastFilter = "";
        this.lastLogFilter = "";
        this.lastUnFinishedFilter = "";
        this._prepareSummarytab();
        this.maxQueryId = -1;
        this.qlOrder = "";

        // unfinished queries fixed table config
        this.unfinishedQueriesConfig = { subContainerWidth: 1620
                                        , height : 675
                                        , columns: [{ name: "@", size: 40}
                                        ,{ name: "query Id", size: 80}
                                        ,{ name: "logDate", size: 175}
                                        ,{ name: "query", size: 600}
                                        ,{ name: "user", size: 120}
                                        ,{ name: "dbname", size : 120}
                                        ,{ name: "client", size : 180}
                                        ,{ name: "driver", size : 250}
                                        ,{ name: "parameters", size : 250}
                                        ,{ name: "txmeta", size : 250}
                                        ]
        }
	}
    async init() {

        let prms;
        // needed for a cluster setup
        if (nac.neodb && nac.neodb.isCluster == true) {
            this.configMap = new Map();
        }
        if (nac.neoConnection && nac.neoConnection == true && nac.neodb.isAdmin == true) {
            let session = nac.getReadSession(nac.neodb.defaultDatabase); // without a name it will be the default database
            // getting the query log settings
            nac.neodb.supportDynamicSettings = false;
            if (nac.neodb.majorVersion > 3 || (nac.neodb.majorVersion == 3 && nac.neodb.minorVersion > 1 )) {
                let qry = 'call dbms.listConfig() yield name, value, dynamic, description where name in\n' +
                    '["dbms.logs.query.allocation_logging_enabled","dbms.logs.query.enabled","dbms.logs.query.page_logging_enabled","dbms.logs.query.parameter_logging_enabled","dbms.logs.query.path","dbms.logs.query.threshold","dbms.logs.query.time_logging_enabled","dbms.track_query_allocation","dbms.track_query_cpu_time","dbms.logs.query.runtime_logging_enabled"]\n' +
                    'return name, description, value, dynamic';
                if (nac.neodb.majorVersion > 4) {
                    // a big cleanup was here
                    qry = "call dbms.listConfig() yield name, value, dynamic, description \n" +
                        "return [ y in collect ({name: name, value : value, dynamic : dynamic, description: description}) where y.name in  [\"db.logs.query.enabled\"\n" +
                        "              ,\"db.logs.query.early_raw_logging_enabled\"\n" +
                        "              ,\"db.logs.query.parameter_logging_enabled\"\n" +
                        "              ,\"db.logs.query.plan_description_enabled\"\n" +
                        "              ,\"db.logs.query.threshold\"\n" +
                        "              ,\"db.track_query_cpu_time\"]] as values";

                    // qry = "call dbms.listConfig() yield name, value, dynamic, description \n" +
                    //     "where name in [\"db.logs.query.enabled\"\n" +
                    //     "              ,\"db.logs.query.early_raw_logging_enabled\"\n" +
                    //     "              ,\"db.logs.query.parameter_logging_enabled\"\n" +
                    //     "              ,\"db.logs.query.plan_description_enabled\"\n" +
                    //     "              ,\"db.logs.query.threshold\"\n" +
                    //     "              ,\"db.track_query_cpu_time\"]\n" +
                    //     "return name, value, dynamic, description";
                }
                if (nac.neodb.majorVersion == 3 && nac.neodb.minorVersion < 5) {
                    // no dynamic in the query
                    qry = 'call dbms.listConfig() yield name, value, description where name in\n' +
                        '["dbms.logs.query.allocation_logging_enabled","dbms.logs.query.enabled","dbms.logs.query.page_logging_enabled","dbms.logs.query.parameter_logging_enabled","dbms.logs.query.path","dbms.logs.query.threshold","dbms.logs.query.time_logging_enabled","dbms.track_query_allocation","dbms.track_query_cpu_time","dbms.logs.query.runtime_logging_enabled"]\n' +
                        'return name, description, value';
                } else {
                    nac.neodb.supportDynamicSettings = true;
                }
                if (nac.neodb && nac.neodb.isCluster == true) {
                    // each server in the cluster must be asked.
                    let srvcount = 1;
                    for (let ii = 0; ii < nac.driverMap.size; ii++) {
                        let session = null;
                        try {
                            let key = "" + srvcount;
                            let drv = nac.driverMap.get(key);
                            // nac.neodb.defaultDatabase
                            if (nac.neodb.defaultDatabase && nac.neodb.defaultDatabase != '') {
                                session = drv.session({
                                    defaultAccessMode: neo4j.session.READ,
                                    database: nac.neodb.defaultDatabase
                                });
                            } else {
                                if (nac.neodb.majorVersion >= 5) {
                                    session = drv.session({
                                        defaultAccessMode: neo4j.session.READ,
                                        database: 'system'
                                    });
                                } else {
                                    session = drv.session(neo4j.session.READ);
                                }
                            }
                            // console.log(qry);
                            let rs = await nac.runQuery(session, qry, {});

                            this.configMap.set(key,this._QueryLogSettingsInfo(rs));
                            session.close();

                        } catch (eer) {
                            session.close();
                            console.log("oops having a problem with connection " + srvcount + " error message: " + eer.message);
                            console.log(eer);
                        }
                        srvcount ++;
                    }
                } else {
                    let rs = await nac.runQuery(session, qry,{});
                    this.logConfig = this._QueryLogSettingsInfo(rs);
                }

                this._buildQSettingsScreen();

            }
        }

        // && nac.neodb.isAdmin && nac.neodb.isAdmin == true
        if (nac.neodb && nac.neodb.apocAvailable && nac.neodb.apocAvailable == true && nac.neodb.apocLogStreamAvailable == true ) {
            this._enableElement("analyseStreamButton");
            document.getElementById(this.ANALYSE_MESSAGE_ID).innerHTML = "";
        }
        // adding the keyup event listener
        let current = this;
        document.getElementById(this.FILTER_INPUT_KEY).addEventListener("keyup", function(event) {
            // tricky if we use 'current' in the constructor than you get the 'current' snapshot in time for 'this' which is not completely filled
            // Putting it here than it is save
            current.onFilterChange(event);
        });


        return prms;
    }

    _prepareSummarytab() {
        //onkeyup='qan.onFilterChange(event);'
        let appSummaryElement = document.getElementById("appSummary");
        let html =  "<div id='"+ this.SUMMARY_FILTER_KEY+ "' class='ui fluid left icon input'><input  id='"+ this.FILTER_INPUT_KEY + "' type='text' placeholder='Hit enter to Filter the queries containing this text. When empty all the distinct queries will be shown. Use db:<dbname>[@<serverid>] to filter on database and server. Example \"db:neo4j@2 caches\" '/><i class='filter icon'></i></div>";
        html += "<div id='" + this.SUMMARY_TABLE_KEY +"'></div>";
        //html += "<div style='height: 640px;' id='" + this.SUMMARY_TABLE_KEY +"'></div>";
        //html += "<div>The values for Avg Time, Min Time, Max Time, Avg CPU, Max PLanning and Avg Waiting are in milliseconds</div>";

        appSummaryElement.innerHTML = html;
        $('.menu .item')
        ;
    }

    _isEnter(event) {
        if (event.key != undefined) {
            return (event.key === "Enter");
        }
        if (event.code != undefined) {
            return (event.code === "Enter");
        }
        // this one is deprecated
        if (event.keyCode != undefined) {
            return (event.keyCode === 13);
        }
        return false;
    }

    onFilterChange(event) {
        let tableSection = document.getElementById(this.SUMMARY_TABLE_KEY);
        if (this._isEnter(event)) {
            // enter is pressed
            if (this.ana.length > 0) {
                this._onFilterChangeImpl();
            }
        } else {
            // new characters are entered removed, set no the color back
            let filterInput = document.getElementById(this.FILTER_INPUT_KEY);
            let filter = filterInput.value;
            if (filter !== this.lastFilter) {
                // clear the table
                document.getElementById(this.SUMMARY_TABLE_KEY).innerHTML = "";
                filterInput.style = 'background-color: ' + this.filterInActiveBackground_color;
            }
        }
    }

    _onFilterChangeImpl() {
        let filterInput = document.getElementById(this.FILTER_INPUT_KEY);
        let filter = filterInput.value;
        if (this.ana.length == 0) return;
        if (filter.length > 0 && filter !== this.lastFilter ) {
            filterInput.style = 'background-color: ' + this.filterActiveBackground_color;
            this._showFilteredSummary("Loading using filter: " + filter);
            this.lastFilter = filter;
        } else {
            // we are erasing now character and the filter length
            filterInput.style = 'background-color: ' + this.filterInActiveBackground_color;
            this._showFilteredSummary("Loading " + this.ana.length + " summaries");
            this.lastFilter = "";
        }
    }
    _showFilteredSummary(aloadingmessage) {
        let lmsg = "Loading";
        if (aloadingmessage && aloadingmessage.length > 0) {
            lmsg = aloadingmessage;
        }
        let tableSummary = document.getElementById(this.SUMMARY_TABLE_KEY);
        tableSummary.innerHTML = "<div class=\"ui segment\">\n" +
            "  <div class=\"ui active inverted dimmer\">\n" +
            "    <div class=\"ui text loader\">" + lmsg + "</div>\n" +
            "  </div>\n" +
            "  <p><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/></p>\n" +
            "</div>";
        let current = this;
        setTimeout(function() {
            current._buildSummary();
        }, 50);
    }

    _enableElement(aId) {
        let key = "#" + aId;
        if ($(key).hasClass('disabled')) {
            $(key).removeClass('disabled');
        }
    }

    _disableElement(aId) {
        let key = "#" + aId;
        if (!$(key).hasClass('disabled')) {
            $(key).addClass('disabled');
        }
    }
    _buildQSettingsScreen() {
        if (nac.neodb && nac.neodb.isCluster == true) {
            this._buildQSettingsScreenCluster();
        } else {
            this._buildQSettingsScreenSingle();
        }
    }

    _buildQSettingsScreenSingle() {

        // we probably have to check here the version of the neo4j server also
        let settingsContainer = document.getElementById("queryLogSettings");
        let html = "<table onChange='qan._onChangeSettings()' class=\"ui celled table\">\n" +
            "  <thead>\n" +
            "    <tr><th width='250px'>Setting</th>\n" +
            "    <th width='250px'>Value</th>\n" +
            "    <th>Description</th>\n" +
            "  </tr></thead>\n" +
            "  <tbody>\n" ;
        // queryLog
        html +=  "<tr>\n" +
            "      <td data-label=\"Setting\">Query Log</td>\n";


        if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
            html += "      <td data-label=\"Value\">" + this.logConfig.queryLog.value + "</td>\n";
        } else {
            // this is the version 3.5 or higher
            html += "      <td data-label=\"Value\">";
            // console.log(this.logConfig);
            if (nac.neodb.majorVersion == 3) {
                // simply true/false
                html += this._createCheckbox('queryLog', this.logConfig.queryLog.value);
            } else {
                // radio group with OFF, INFO, VERBOSE
                // OFF
                html += " <div class='ui radio checkbox'>";
                if (this.logConfig.queryLog.value == "OFF")  {
                    html += "<input type='radio' name='r_queryLog' checked='checked'/>";
                } else {
                    html += "<input type='radio' name='r_queryLog'/>";
                }
                html += "<label>OFF</label>\n";

                html += " </div>";
                //INFO
                html += " <div class='ui radio checkbox'>";
                if (this.logConfig.queryLog.value == "INFO")  {
                    html += "<input type='radio' name='r_queryLog' checked='checked'/>";
                } else {
                    html += "<input type='radio' name='r_queryLog'/>";
                }
                html += "<label>INFO</label>\n";

                html += " </div>";


                // VERBOSE
                html += " <div class='ui radio checkbox'>";
                if (this.logConfig.queryLog.value == "VERBOSE")  {
                    html += "<input type='radio' name='r_queryLog' checked='checked'/>";
                } else {
                    html += "<input type='radio' name='r_queryLog'/>";
                }
                html += "<label>VERBOSE</label>\n";
                html += " </div>";
            }
            html += " </td>\n";

        }
        html += "      <td data-label=\"Description\">" + this.logConfig.queryLog.description + "</td>\n" +
            "    </tr>\n" ;


        // queryTreshold
        html +=  "<tr>\n" +
            "      <td data-label=\"Setting\">Query Threshold</td>\n" ;
        if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
            html += "      <td data-label=\"Value\">" + this.logConfig.queryThreshold.value + "</td>\n";
        } else {
            html += "      <td data-label=\"Value\"><input type='text' id='tresHold' value='"+ this.logConfig.queryThreshold.value   + "'></input></td>\n";
        }
        html += "      <td data-label=\"Description\">" + this.logConfig.queryThreshold.description + "</td>\n" +
            "    </tr>\n" ;

        // parameters
        html +=  "<tr>\n" +
            "      <td data-label=\"Setting\">Query Parameters</td>\n" +
            "      <td data-label=\"Value\">";
        if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
            html += "" + this.logConfig.parameterLog.value + " ";
        } else {
            html += this._createCheckbox('parameterLog', this.logConfig.parameterLog.value);
        }
        html+= "</td>\n" +
            "      <td data-label=\"Description\">" + this.logConfig.parameterLog.description + "</td>\n" +
            "    </tr>\n" ;

        // runtime not available in neo4j server < 3.4
        if (this.logConfig.runtimeLog) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">Show Runtime</td>\n" +
                "      <td data-label=\"Value\">";
            if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
                html += ""+  this.logConfig.runtimeLog.value + " " ;
            } else {
                html += this._createCheckbox('runtimeLog', this.logConfig.runtimeLog.value);
            }
            html += "</td>\n" +
                "      <td data-label=\"Description\">" + this.logConfig.runtimeLog.description + "</td>\n" +
                "    </tr>\n" ;
        }

        // pageLog
        if (this.logConfig.pageLog) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">Page Cache</td>\n" +
                "      <td data-label=\"Value\">";
            if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "" + this.logConfig.pageLog.value + " ";
            } else {
                html += this._createCheckbox('pageLog', this.logConfig.pageLog.value);
            }
            html += "</td>\n" +
                "      <td data-label=\"Description\">" + this.logConfig.pageLog.description + "</td>\n" +
                "    </tr>\n" ;
        }


        // cpuTrack
        html +=  "<tr>\n" +
            "      <td data-label=\"Setting\">CPU tracking</td>\n" +
            "      <td data-label=\"Value\">";
        if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
            html += "" + this.logConfig.cpuTrack.value + " ";
        } else {
            html += this._createCheckbox('cpuTrack', this.logConfig.cpuTrack.value);
        }
        html += "</td>\n" +
            "      <td data-label=\"Description\">" + this.logConfig.cpuTrack.description + "</td>\n" +
            "    </tr>\n" ;
        // timeLog (dependend on cpuTrack=true
        if (this.logConfig.timeLog) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">CPU Time Logging</td>\n" +
                "      <td data-label=\"Value\">";
            if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "" + this.logConfig.timeLog.value + " ";
            } else {
               // console.log(this.logConfig);
                html += this._createCheckbox('timeLog', this.logConfig.timeLog.value);
            }
            html += "</td>\n" +
                "      <td data-label=\"Description\">" + this.logConfig.timeLog.description + "</td>\n" +
                "    </tr>\n" ;
        }

        // allocationTrack
        if (this.logConfig.allocationTrack) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">Allocation tracking</td>\n" +
                "      <td data-label=\"Value\">";
            if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "" + this.logConfig.allocationTrack.value + " ";
            } else {
                html += this._createCheckbox('allocationTrack', this.logConfig.allocationTrack.value);
            }
            html += "</td>\n" +
                "      <td data-label=\"Description\">" + this.logConfig.allocationTrack.description + "</td>\n" +
                "    </tr>\n" ;
        }
        // allocationLog dependend on allocationTrack = true
        if (this.logConfig.allocationLog) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">Allocation Log</td>\n" +
                "      <td data-label=\"Value\">";
            if (this.logConfig.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "" +  this.logConfig.allocationLog.value + " ";
            } else {
                html += this._createCheckbox('allocationLog', this.logConfig.allocationLog.value);
            }
            html += "</td>\n" +
                "      <td data-label=\"Description\">" + this.logConfig.allocationLog.description + "</td>\n" +
                "    </tr>\n" ;
        }


        // queryPath if exists
        if (this.logConfig.queryPath != undefined) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">Querylog File</td>\n" +
                "      <td data-label=\"Value\">" + this.logConfig.queryPath.value + "</td>\n" +
                "      <td data-label=\"Description\">" + this.logConfig.queryPath.description + "</td>\n" +
                "    </tr>\n" ;
        }

        if (this.logConfig.queryLog.dynamic == true  && !nac.neodb.isAura) {
            // apply
            html +=  "<tr>\n" +
                "      <td colspan=2><button id='btSaveQueryLogSettings' onClick='qan._saveQueryLogSettings();' class='ui positive disabled button'>Apply Runtime Settings</button><div id='saveMessage'></div></td>\n" +
                "      <td><div class='ui message'>Note: Changes to the configuration at runtime are not persisted. To avoid losing changes when restarting Neo4j make sure to update neo4j.conf as well.</div></td>"
                "    </tr>\n" ;
        }

        html +=    "  </tbody>\n" +
            "</table>";

        settingsContainer.innerHTML = html;
    }
    _buildQSettingsScreenCluster() {
        // it is cluster for each cluster member a 'value' column is needed
        // console.log(this.configMap);

        let settingsContainer = document.getElementById("queryLogSettings");
        let html = "<table onChange='qan._onChangeSettings()' class=\"ui celled table\">\n" +
            "  <thead>\n" +
            "    <tr><th width='250px'>Setting</th>\n";
        for (let key of this.configMap.keys()) {
            html += "<th width='200px'>Value@" + key + "</th>";
        }
        html += "    <th>Description</th>\n" +
            "  </tr></thead>\n" +
            "  <tbody>\n";
        // queryLog
        html += "<tr>\n" +
            "      <td data-label=\"Setting\">Query Log</td>\n";
        // query log values
        for (let key of this.configMap.keys()) {
            let config = this.configMap.get(key);
            if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "      <td data-label=\"Value\">" + config.queryLog.value + "</td>\n";
            } else {
                // this is the version 3.5 or higher
                html += "      <td data-label=\"Value\">";
                if (nac.neodb.majorVersion == 3) {
                    // simply true/false
                    html += this._createCheckbox('queryLog@' + key, config.queryLog.value);
                } else {
                    // radio group with OFF, INFO, VERBOSE
                    // OFF
                    html += " <div class='ui radio checkbox'>";
                    if (config.queryLog.value == "OFF") {
                        html += "<input type='radio' name='r_queryLog@" + key + "' checked='checked'/>";
                    } else {
                        html += "<input type='radio' name='r_queryLog@" + key + "'/>";
                    }
                    html += "<label>OFF</label>\n";

                    html += " </div>";
                    //INFO
                    html += " <div class='ui radio checkbox'>";
                    if (config.queryLog.value == "INFO") {
                        html += "<input type='radio' name='r_queryLog@" + key + "' checked='checked'/>";
                    } else {
                        html += "<input type='radio' name='r_queryLog@" + key + "'/>";
                    }
                    html += "<label>INFO</label>\n";

                    html += " </div>";


                    // VERBOSE
                    html += " <div class='ui radio checkbox'>";
                    if (config.queryLog.value == "VERBOSE") {
                        html += "<input type='radio' name='r_queryLog@" + key + "' checked='checked'/>";
                    } else {
                        html += "<input type='radio' name='r_queryLog@" + key + "'/>";
                    }
                    html += "<label>VERBOSE</label>\n";
                    html += " </div>";
                }
                html += " </td>\n";

            }
        }

        html += "      <td data-label=\"Description\">" + this.configMap.get("1").queryLog.description + "</td>\n" +
            "    </tr>\n";


        // queryTreshold
        html += "<tr>\n" +
            "      <td data-label=\"Setting\">Query Threshold</td>\n";
        for (let key of this.configMap.keys()) {
            let config = this.configMap.get(key);
            if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "      <td data-label=\"Value\">" + config.queryThreshold.value + "</td>\n";
            } else {
                html += "      <td data-label=\"Value\"><input type='text' id='tresHold@" + key + "' value='" + config.queryThreshold.value + "'></input></td>\n";
            }
        }

        html += "      <td data-label=\"Description\">" + this.configMap.get("1").queryThreshold.description + "</td>\n" +
            "    </tr>\n";

        // parameters
        html += "<tr>\n" +
            "      <td data-label=\"Setting\">Query Parameters</td>\n";
        for (let key of this.configMap.keys()) {
            let config = this.configMap.get(key);
            html += "      <td data-label=\"Value\">";
            if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "" + config.parameterLog.value + " ";
            } else {
                html += this._createCheckbox('parameterLog@' + key, config.parameterLog.value);
            }
            html+= "</td>";
        }

        html+= "\n" +
            "      <td data-label=\"Description\">" + this.configMap.get("1").parameterLog.description + "</td>\n" +
            "    </tr>\n" ;

        // runtime
        if (this.configMap.get("1").runtimeLog) {

            html += "<tr>\n" +
                "      <td data-label=\"Setting\">Show Runtime</td>\n";

            for (let key of this.configMap.keys()) {
                let config = this.configMap.get(key);
                html += "      <td data-label=\"Value\">";
                if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                    html += "" + config.runtimeLog.value + " ";
                } else {
                    html += this._createCheckbox('runtimeLog@' + key, config.runtimeLog.value);
                }
                html += "</td>\n";
            }
            html += " " +
                "      <td data-label=\"Description\">" + this.configMap.get("1").runtimeLog.description + "</td>\n" +
                "    </tr>\n";
        }
        // pageLog
        if (this.configMap.get("1").pageLog) {
            html +=  "<tr>\n" +
                "      <td data-label=\"Setting\">Page Cache</td>\n";
            for (let key of this.configMap.keys()) {
                let config = this.configMap.get(key);
                html += "      <td data-label=\"Value\">";
                if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                    html += "" + config.pageLog.value + " ";
                } else {
                    html += this._createCheckbox('pageLog@' + key, config.pageLog.value);
                }
                html += "</td>\n";
            }
            html += " " +
                "      <td data-label=\"Description\">" + this.configMap.get("1").pageLog.description + "</td>\n" +
                "    </tr>\n" ;
        }

        // cpuTrack
        html +=  "<tr>\n" +
            "      <td data-label=\"Setting\">CPU tracking</td>\n" ;
        for (let key of this.configMap.keys()) {
            let config = this.configMap.get(key);
            html += "      <td data-label=\"Value\">";
            if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                html += "" + config.cpuTrack.value + " ";
            } else {
                html += this._createCheckbox('cpuTrack@' + key, config.cpuTrack.value);
            }
            html += "</td>\n";
        }

        html += "      <td data-label=\"Description\">" + this.configMap.get("1").cpuTrack.description + "</td>\n" +
            "    </tr>\n" ;
        // timeLog (dependend on cpuTrack=true
        if (this.configMap.get("1").timeLog) {

            html += "<tr>\n" +
                "      <td data-label=\"Setting\">CPU Time Logging</td>\n";
            for (let key of this.configMap.keys()) {
                let config = this.configMap.get(key);

                html += "      <td data-label=\"Value\">";
                if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                    html += "" + config.timeLog.value + " ";
                } else {
                    html += this._createCheckbox('timeLog@' + key, config.timeLog.value);
                }
                html += "</td>\n";
            }

            html += "      <td data-label=\"Description\">" + this.configMap.get("1").timeLog.description + "</td>\n" +
                "    </tr>\n";
        }

        // allocationTrack
        if (this.configMap.get("1").allocationTrack) {

            html += "<tr>\n" +
                "      <td data-label=\"Setting\">Allocation tracking</td>\n";
            for (let key of this.configMap.keys()) {
                let config = this.configMap.get(key);
                html += "      <td data-label=\"Value\">";
                if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                    html += "" + config.allocationTrack.value + " ";
                } else {
                    html += this._createCheckbox('allocationTrack@' + key, config.allocationTrack.value);
                }
                html += "</td>\n";
            }

            html += "      <td data-label=\"Description\">" + this.configMap.get("1").allocationTrack.description + "</td>\n" +
                "    </tr>\n";
        }
        // allocationLog dependend on allocationTrack = true
        if (this.configMap.get("1").allocationLog) {

            html += "<tr>\n" +
                "      <td data-label=\"Setting\">Allocation Log</td>\n";
            for (let key of this.configMap.keys()) {
                let config = this.configMap.get(key);

                html += "      <td data-label=\"Value\">";
                if (config.queryLog.dynamic == false || nac.neodb.isAura) {
                    html += "" + config.allocationLog.value + " ";
                } else {
                    html += this._createCheckbox('allocationLog@' + key, config.allocationLog.value);
                }
                html += "</td>\n";
            }

            html += "      <td data-label=\"Description\">" + this.configMap.get("1").allocationLog.description + "</td>\n" +
                "    </tr>\n";
        }

        if (this.configMap.get("1").queryPath) {

            // queryPath
            html += "<tr>\n" +
                "      <td data-label=\"Setting\">Querylog File</td>\n";
            for (let key of this.configMap.keys()) {
                let config = this.configMap.get(key);
                html += "      <td data-label=\"Value\">" + config.queryPath.value + "</td>\n";
            }
            html += "      <td data-label=\"Description\">" + this.configMap.get("1").queryPath.description + "</td>\n" +
                "    </tr>\n";
        }

        if (this.configMap.get("1").queryLog.dynamic == true && !nac.neodb.isAura) {
            // apply
            html += "<tr>\n" +
                "      <td colspan=2><button id='btSaveQueryLogSettings' onClick='qan._saveQueryLogSettings();' class='ui positive disabled button'>Apply Runtime Settings</button><div id='saveMessage'></div></td>\n" +
                "      <td colspan=" + this.configMap.size + "><div class='ui message'>Note: Changes to the configuration at runtime are not persisted. To avoid losing changes when restarting Neo4j make sure to update neo4j.conf as well.</div></td>"
            "    </tr>\n";
        }
        html +=    "  </tbody>\n" +
            "</table>";

        settingsContainer.innerHTML = html;
    }
    _onChangeSettings() {
        this._enableElement("btSaveQueryLogSettings");
        let saveMessage = document.getElementById("saveMessage");
        saveMessage.innerHTML = "";
    }


    async _saveQueryLogSettings() {
        // console.log('saveQueryLogSettings');
        // read the data and prepare update statements
        if (nac.neodb && nac.neodb.isCluster == true) {
            for (let key of nac.driverMap.keys()) {
                this._saveQueryLogSettingsImpl(key, nac.driverMap.get(key));
            }
        } else {
            this._saveQueryLogSettingsImpl("", nac.neo4jDriver);
        }
    }

    async _saveQueryLogSettingsImpl(aKey, aDriver) {
        // console.log('saveQueryLogSettings ' + aKey);

        // read the data and prepare update statements
        let updateStatements = [];
        let saveMessage = document.getElementById("saveMessage");
        let queryLogVal = "";
        let key = "";
        let config;

        if (nac.neodb.isCluster && nac.neodb.isCluster == true) {
            config = this.configMap.get(aKey + "");
            key = "@" + aKey;
        } else {
            config = this.logConfig;
        }
        // console.log(" config : ");
        // console.log(config);
        if (nac.neodb.majorVersion > 3) {
            queryLogVal =  this._getRadioGroupValue(document.getElementsByName("r_queryLog"  + key));
            if (config.queryLog.value !== queryLogVal) {
                updateStatements.push("call dbms.setConfigValue('"+ config.queryLog.property+"','"+ queryLogVal +"')");
            }
        } else {
            queryLogVal =  "" + document.getElementById("queryLog" + key).checked;
            if (config.queryLog.value !== queryLogVal) {
                updateStatements.push("call dbms.setConfigValue('"+ config.queryLog.property+"','"+ queryLogVal +"')");
            }
        }

        // tresHold
        let treshold = document.getElementById('tresHold' + key).value;
        if (config.queryThreshold.value !== treshold) {
            updateStatements.push("call dbms.setConfigValue('"+ config.queryThreshold.property+"','"+ treshold +"')");
        }
        // parameterLog
        let parameterLog = "" + document.getElementById("parameterLog" + key).checked;
        if (config.parameterLog.value != parameterLog) {
            updateStatements.push("call dbms.setConfigValue('"+ config.parameterLog.property+"','"+ parameterLog +"')");
        }
        // showRuntime
        let runtimeLog = "false";
        if (config.runtimeLog) {
            console.log(config);
            runtimeLog ="" +  document.getElementById("runtimeLog" + key).checked;
            if (config.runtimeLog.value != runtimeLog) {
                updateStatements.push("call dbms.setConfigValue('"+ config.runtimeLog.property+"','"+ runtimeLog +"')");
            }
        }
        // pageLog
        let pageLog = "false";
        if (config.pageLog) {
            pageLog = "" + document.getElementById("pageLog" + key).checked;
            if (config.pageLog.value != pageLog) {
                updateStatements.push("call dbms.setConfigValue('"+ config.pageLog.property+"','"+ pageLog +"')");
            }
        }

        // cpuTrack
        let cpuTrack = "" + document.getElementById("cpuTrack" + key).checked;
        if (config.cpuTrack.value != cpuTrack) {
            updateStatements.push("call dbms.setConfigValue('"+ config.cpuTrack.property+"','"+ cpuTrack +"')");
        }
        // timeLog
        let timeLog = "false";
        if (config.timeLog) {
            timeLog = "" + document.getElementById("timeLog" + key).checked;
            if (config.timeLog.value != timeLog) {
                updateStatements.push("call dbms.setConfigValue('"+ config.timeLog.property+"','"+ timeLog +"')");
            }
        }
        // allocationTrack
        let allocationTrack = "false";
        if (config.allocationTrack) {
            allocationTrack = "" + document.getElementById("allocationTrack" + key).checked;
            if (config.allocationTrack.value != allocationTrack) {
                updateStatements.push("call dbms.setConfigValue('"+ config.allocationTrack.property+"','"+ allocationTrack +"')");
            }
        }
        // allocationLog
        let allocationLog = "false";
        if (config.allocationLog) {
            allocationLog = "" + document.getElementById("allocationLog" + key).checked;
            if (config.allocationLog.value != allocationLog) {
                updateStatements.push("call dbms.setConfigValue('"+ config.allocationLog.property+"','"+ allocationLog +"')");
            }
        }

        // console.log("update statements");
        // console.log(updateStatements);
        // saving to the database
        try {
            let session;
            if (nac.neodb.majorVersion > 3) {
                // using system database
                session = aDriver.session({
                    defaultAccessMode: neo4j.session.WRITE,
                    database: "system"
                });
            } else {
                session = aDriver.session(neo4j.session.WRITE);
            }
            let cypher = "";
            // we may using the system database to call the statements
            // in v4 and v5 only one 'call' per statement can be done
            // so we have to use multiple calls to the database
            //
            for (let a = 0; a< updateStatements.length; a++) {
                cypher = " " + updateStatements[a] + " return 'ok';";
                // console.log(cypher);
                let rs = await nac.runQuery(session, cypher,{});
            }
            saveMessage.innerHTML = "Query Log Settings sucessfully saved.";
            // when successfull update the this.logConfig with the correct vallue
            this._disableElement("btSaveQueryLogSettings");

            config.queryLog.value = queryLogVal;
            config.queryThreshold.value = treshold;
            config.parameterLog.value = parameterLog;
            if (config.timeLog) {
                config.timeLog.value = timeLog;
            }
            if (config.runtimeLog) {
                config.runtimeLog.value = runtimeLog;
            }
            if (config.pageLog) {
                config.pageLog.value = pageLog;
            }
            config.cpuTrack.value = cpuTrack;
            if (config.allocationTrack) {
                config.allocationTrack.value = allocationTrack;
            }
            if (config.allocationLog) {
                config.allocationLog.value = allocationLog;
            }

            if (nac.neodb.isCluster === true) {
              this.configMap.set(aKey + "", config);
            } else {
               this.logConfig = config;
            }
            session.close();
        } catch (err) {
            console.log(err);
            this.__showMessage("<div style=\"color: red\">" + err.message.split(/\r?\n/)[0] + "</div>", "Problem with updating configuration");
        }


    }
    _getRadioGroupValue(elements) {
        // we used label tag here
        for (let i = 0; i < elements.length ; i++) {
            if (elements[i].checked) {
                return elements[i].nextElementSibling.firstChild.data;
            }
        }
    }
    __showMessage(message, title) {
        //messageModal
        let modalContent = document.getElementById("messageContent");
        let modalHeader = document.getElementById("messageHeader");
        modalHeader.innerHTML=title;
        // clear
        modalContent.innerHTML = message;
        // now initiate modal
        let current = this;
        $('#messageModal').modal({
            closable: true,
            onApprove: function () {
                // clear
                //console.log(" in modal approve ");
                let modalContent = document.getElementById("messageContent");
                let modalHeader = document.getElementById("messageHeader");
                modalHeader.innerHTML="";
                modalContent.innerHTML = "";
            }
        }).modal('show');
    }

    _createCheckbox(anId, aValue) {
        let ch = "";
        if (aValue === "true") {
            ch += "<input type='checkbox' name='" + anId + "' id='" + anId + "' checked />"
        } else {
            ch += "<input type='checkbox' name='" + anId + "' id='" + anId + "' />"
        }

        return ch;
    }

    _QueryLogSettingsInfoImpl(record, info) {

        let prop = record.name;
        let desc = record.description;
        let val = record.value;
        let dynamic = false;

        if (nac.neodb.supportDynamicSettings == true) {
            dynamic = record.dynamic;
        }
        if (prop.endsWith( ".logs.query.allocation_logging_enabled")) {
            info.allocationLog = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.enabled")) {
            info.queryLog = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.page_logging_enabled")) {
            info.pageLog = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.parameter_logging_enabled")) {
            info.parameterLog= { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.path")) {
            info.queryPath = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.threshold")) {
            info.queryThreshold= { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.time_logging_enabled")) {
            info.timeLog = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".track_query_allocation")) {
            info.allocationTrack = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".track_query_cpu_time")) {
            info.cpuTrack = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.runtime_logging_enabled")) {
            info.runtimeLog = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        } else if (prop.endsWith( ".logs.query.plan_description_enabled")) {
            info.planDescription = { description : desc,
                value : val,
                dynamic : dynamic,
                property : prop};
        }
        return info;
    }

     _QueryLogSettingsInfo(aresult) {
        let info = {};
        if (nac.neodb.majorVersion >= 5) {
            let recs = aresult.records[0].get("values");

            for (let it = 0; it < recs.length; it++) {
                let record = recs[it];
                info = this._QueryLogSettingsInfoImpl(record, info);
            }
        } else {
            let current = info;
            for (let it = 0; it < aresult.records.length; it++) {
                let record = aresult.records[it];
                info = this._QueryLogSettingsInfoImpl(record.toObject(), info);
            }
        }
        return info;
    }

    clearAppLogFile() {
        this._initQueryLog(true);
    }

    __analysisResults() {
        let ht = "<table width='100%' style='font-size: 0.9em'><tr><td width='530px'>" + (this.log.length) + " finished queries analysed, " + this.ana.length + " distinct queries found";

        if (this.onlyStarted.size > 0) {
            ht+= ", " + this.onlyStarted.size + " unfinished queries found"
        }
        ht += "<br/> queries from " + (new Date(this.minLogTime)).toUTCString() + " to " + (new Date(this.maxLogTime)).toUTCString() + "</td>";
        return ht;
    }
    _clearLogRelatedViews() {
        // corner case if login fails and then proceed without connection
        // some of the elements may not be there
        if (document.getElementById("appLogFile")) {
            document.getElementById("appLogFile").innerHTML = ""; // clear
        }
        if (document.getElementById(this.SUMMARY_TABLE_KEY)) {
            document.getElementById(this.SUMMARY_TABLE_KEY).innerHTML = "";
        }
        if (document.getElementById(this.UNFINISHED_QUERY_TABLE)) {
            document.getElementById(this.UNFINISHED_QUERY_TABLE).innerHTML = "";
        }
        if (document.getElementById(this.UNFINISHED_QUERY_HEADER)) {
            document.getElementById(this.UNFINISHED_QUERY_HEADER).innerHTML = "<div class='ui fluid segment'>\n            Log files created by neo4j version 4+ with the query log in VERBOSE mode also have log entries when queries are started.\n            In this tab we show the queries which are started but not finished at the moment the log is copied and uploaded or streamed.\n        </div>";
        }
    }

    analyseFile(aFileString) {
        let isAuraLog = aFileString.startsWith("[\n");

	    this.log = [];
	    this.ana = [];
	    this._clearLogRelatedViews();

        let summary = "summary here";
        document.getElementById(this.SUMMARY_TABLE_KEY).innerHTML = summary;
        //
        // analyzing log file
        //
        if (isAuraLog === true) {
            let afs = [];
            let jsonObject = JSON.parse(aFileString);
            for (let ri = 0; ri < jsonObject.length; ri++ ) {
                let entry = jsonObject[ri];
                afs.push(entry);
            }
            // console.log(afs);
            this.ana = this._analyseLog(afs, true);
        } else {
            this.ana = this._analyseLog(aFileString.match(/^.*([\n\r]+|$)/gm), false);
        }

        this._showFilteredSummary("Loading " + this.ana.length + " summaries");

        //console.log(" query log file line count :" + (this.entryCount));
        //console.log(" query finished line count :" + (this.log.length));
        //console.log(" query started line count :" + (this.startedOnlyCount));

        let ht = this.__analysisResults();
        if (nac.neoConnection && nac.neoConnection == true) {
            // we have a db connection with an uploaded file
            ht += "<td width='560px'><div class='ui yellow tiny message'>The uploaded file may not be created by the current connected database. The query explain functionilty may not be accurate when the current database has a different model and schema</div>";
        }
        ht += "</tr></table>";


        document.getElementById(this.ANALYSE_MESSAGE_ID).innerHTML = ht;
        this._initUnFinished();
        this._registerUnfinishedKeyUpEvent();
        this._initQueryLog(true);
        this._analyseQueriesPerMinuteUnit(); // first is 5 minutes
        $('.menu .item').tab("change tab", "first");


    }

    // unfinished queries

    _registerUnfinishedKeyUpEvent() {
        let filterInput = document.getElementById(this.UNFINISHED_FILTER_INPUT);
        let current = this;
        if (filterInput) {
            filterInput.addEventListener("keyup", function (event) {
                current.onUnfinishedFilterChange(event);
            });
        }
    }

    _initUnFinished() {
        let unfHeader = document.getElementById(this.UNFINISHED_QUERY_HEADER);
        let unfFilter = document.getElementById(this.UNFINISHED_QUERY_FILTER);
        let unfTable = document.getElementById(this.UNFINISHED_QUERY_TABLE);
        if (this.onlyStarted.size > 0 ) {
            let headerhtml = "<div class='ui segment'>There are unfinished queries found. The highest query id in this log is "
                           + this.maxQueryId + ". <button class='compact ui teal basic button' onClick='qan._showUnFinished();'>show all unfinshed queries</button></div>";
            unfHeader.innerHTML = headerhtml;
            let filterhtml = "<div id='"+ this.UNFINISHED_FILTER_KEY+ "' class='ui fluid left icon input'><input  id='"+ this.UNFINISHED_FILTER_INPUT + "' type='text' placeholder='Hit enter to Filter the queries containing this text. When empty all the unfinished queries will be shown. '/><i class='filter icon'></i></div>";
            unfFilter.innerHTML = filterhtml;
        }
    }

    _showUnFinished() {
        let filter = document.getElementById(this.UNFINISHED_FILTER_INPUT).value;
        let useFilter = false;
        if (filter && filter.length > 0) {
            useFilter = true;
        }

        let rxtable = new FixedHeaderTable(this.UNFINISHED_QUERY_TABLE, this.unfinishedQueriesConfig);
        // building up the row data of the table, the table itself is constructed in FixedHeaderTable
        // we aff the raw html <tr></tr> string to the FixedHeaderTable
        let rowbackground = false;
        for (let key of this.onlyStarted.keys() ) {
            let dta = this.onlyStarted.get(key);

            if (useFilter && useFilter === true) {
                if (dta.query.toLowerCase().indexOf(filter.toLowerCase()) == -1) {
                    continue;
                }
            }

            let rowtr = "";
            if (rowbackground) {
                rowtr += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
            } else {
                rowtr += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
            }
            // server instance @
            rowtr += "<td>" + dta.srv + "</td>";
            // query id
            rowtr += "<td>" + dta.qid + "</td>";
            // logdate
            rowtr += "<td>" + dta.logdate + "</td>";
            // cypher
            let dbn = "__";
            if (dta.dbname && dta.dbname != "" && dta.dbname !== "<none>") {
                dbn = dta.dbname;
            }

            rowtr += "<td ><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>";
            if (nac.neoConnection === true && dbn !== "system" && dbn !== "" && dta.query.indexOf("no query in log") == -1) {
                rowtr += "<div class='ui inverted green icon buttons'><button class='ui tiny button' title='Explain' onClick='qan._explainUnfilteredQuery(" + key + ", \"" + dbn + "\");'> <i class='vertically flipped sitemap icon' > </i></button></div>&nbsp;&nbsp;";
            }
            rowtr += this._formatCypher(dta.query) ;
            rowtr+= "</div></td>";
            // user
            rowtr += "<td>" + dta.neoUser + "</td>";
            // dbname
            rowtr += "<td>" + dta.dbname + "</td>";
            // client
            rowtr += "<td>" + dta.client + "</td>";
            // driver
            rowtr += "<td>" + dta.driver + "</td>";
            // params
            let sparams = "";
            if (dta.params) {
                sparams = "" + dta.params;
            }
            // rowtr += "<td>params here</td>";
            // rowtr += "<td>txmeta here</td>";

            rowtr += "<td><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + sparams + "</div></td>";
            // txmeta
            rowtr += "<td><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + dta.txmeta + "</div></td>";
            rowtr += "</tr>";

            rxtable.addTableRowAsHTML(rowtr);
            rowbackground = !rowbackground;
        }



        rxtable.showTable();
    }
    onUnfinishedFilterChange(event) {
        if (this.onlyStarted.size == 0) return;
        let tableSection = document.getElementById(this.UNFINISHED_QUERY_TABLE);
        if (this._isEnter(event)) {
            // enter is pressed
            let filter = document.getElementById(this.UNFINISHED_FILTER_INPUT).value;
            if (filter !== this.lastUnFinishedFilter) {
                this._onUnFinishedFilterChangeImpl();
                this.lastUnFinishedFilter = filter;
            }
        } else {
            // new characters are entered removed, set now the color back
            let filterInput = document.getElementById(this.UNFINISHED_FILTER_INPUT);
            let filter = filterInput.value;
            filterInput.style = 'background-color: ' + this.filterInActiveBackground_color;
            // remove the table in any cases
            tableSection.innerHTML = "";
        }

    }
    _onUnFinishedFilterChangeImpl() {
        if (this.onlyStarted.size == 0) return;

            let filterInput = document.getElementById(this.UNFINISHED_FILTER_INPUT);
        let filter = filterInput.value;

        //style='background-color: #00ff26'
        let tableSummary = document.getElementById(this.UNFINISHED_QUERY_TABLE);
        if (filter.length > 0 ) {
            filterInput.style = 'background-color: ' + this.filterActiveBackground_color;
            this._showFilteredUnfinished("Loading using filter: " + filter);
            this.lastUnFinishedFilter = filter;
        } else {
            this._showFilteredUnfinished("Loading " + this.ana.length + " summaries");
            this.lastUnFinishedFilter = "";
        }
    }
    _showFilteredUnfinished(aloadingmessage) {
        let lmsg = "Loading";
        if (aloadingmessage && aloadingmessage.length > 0) {
            lmsg = aloadingmessage;
        }
        let tableSummary = document.getElementById(this.UNFINISHED_QUERY_TABLE);
        tableSummary.innerHTML = "<div style='height: 600px' class=\"ui segment\">\n" +
            "  <div class=\"ui active inverted dimmer\">\n" +
            "    <div class=\"ui text loader\">" + lmsg + "</div>\n" +
            "  </div>\n" +
            "</div>";
        let current = this;
        setTimeout(function() {
            current._showUnFinished();
        }, 50);
    }


    async analyseLogStream() {
        // only when there is a db connection
        // clear the file input field
        let msg = document.getElementById(this.ANALYSE_MESSAGE_ID);
        msg.innerHTML = "";
        this._clearLogRelatedViews();

        document.getElementById("queryLogFile").value='';


        if (nac.neoConnection && nac.neoConnection == true && nac.neodb.apocAvailable == true) {
            msg.innerHTML = "start streaming the query log from the server....";

            // multiple cluster
            let lgLines = [];
            let qry = "call apoc.log.stream('query.log') yield lineNo, line return line ";
            let srvcount = 1;
            try {
                if (nac.driverMap && nac.driverMap.size > 0) {
                    let key = "" + srvcount;
                    for (let ii = 0; ii < nac.driverMap.size; ii++) {
                        try {
                            key = "" + srvcount;
                            let drv = nac.driverMap.get(key);
                            // check if query logging is on
                            let qlval = this.configMap.get(key).queryLog.value;
                            // the query log can tamporarely be switched off
                            // only if there is no query.log file found
                            // then a message makes sense
                            //
                            let session = null;
                            if (nac.neodb.defaultDatabase && nac.neodb.defaultDatabase != '') {
                                session = drv.session({
                                    defaultAccessMode: neo4j.session.READ,
                                    database: nac.neodb.defaultDatabase
                                });
                            } else {
                                session = drv.session(neo4j.session.READ);
                            }
                            msg.innerHTML = "\n" +
                                "  <div class=\"ui active inverted dimmer \"><div class=\"ui mini text loader\">start streaming the query log from the server....</div></div>";

                            let rs = await nac.runQuery(session, qry, {});
                            rs.records.forEach(function (record) {
                                lgLines.push({line: record.get("line"), srv: srvcount});
                            });
                            // console.log(" loaded " + lgLines.length);
                        } catch (eer) {
                            console.log("oops having a problem with connection " + srvcount + " error message: " + eer.message);
                            let qlval = this.configMap.get(key).queryLog.value;
                            let ermsg = eer.message;
                            if (ermsg.indexOf("Exception",0) > -1
                                && ermsg.indexOf("apoc.log.stream", 0) > -1) {
                                ermsg = "There is no query.log file available on server @" + srvcount + ", try to switch on Query logging in the Query Log Settings tab<br/>";
                                msg.innerHTML = msg.innerHTML + ermsg;
                            }
                        }
                        srvcount ++;
                    }
                } else {
                    // single server
                    let qlval = this.logConfig.queryLog.value;
                    // if (qlval == "OFF" || qlval == false || qlval == "false") {
                    //     msg.innerHTML = "query logging is switched off please change your query log settings";
                    //     return;
                    // }

                    let session = null;
                    if (nac.neodb.defaultDatabase && nac.neodb.defaultDatabase != '') {
                        session = nac.getReadSession(nac.neodb.defaultDatabase);
                    } else {
                        session = nac.getReadSession(null);
                    }
                    msg.innerHTML = "\n" +
                        "  <div class=\"ui active inverted dimmer \"><div class=\"ui mini text loader\">start streaming the query log from the server....</div></div>";

                    let rs = await nac.runQuery(session, qry,{});
                    rs.records.forEach(function(record) {
                        lgLines.push({line: record.get("line"), srv: ""});
                    });
                    // console.log(" loaded " +  lgLines.length);
                }
                this.log = [];
                this.ana = [];
                let appLogFile = document.getElementById("appLogFile");
                appLogFile.innerHTML = ""; // clear
                let tableSummary = document.getElementById(this.SUMMARY_TABLE_KEY);
                tableSummary.innerHTML = ""; // clear

                let summary = "summary here";
                tableSummary.innerHTML = summary;
                //
                // analyzing log file
                //
                this.ana = this._analyseLog(lgLines);
                this._showFilteredSummary("Loading " + this.ana.length + " summaries");

                msg.innerHTML = this.__analysisResults();

                this._initUnFinished();
                this._registerUnfinishedKeyUpEvent();
                this._initQueryLog(true);
                this._analyseQueriesPerMinuteUnit(); // first is 5 minutes

            } catch (err) {
                console.log(err);
                let ermsg = err.message;
                if (ermsg.indexOf("NoSuchFileException",0) > -1 && ermsg.indexOf("apoc.log.stream", 0) > -1) {
                    ermsg = "There is no query.log file available on the server, try to switch on Query logging in the Query Log Settings tab";
                }
                msg.innerHTML = ermsg;
            }
            if (lgLines.length == 0) {
                let ermsg = "There is no query.log file available on the server, try to switch on Query logging in the Query Log Settings tab";
                msg.innerHTML = ermsg;
            }
        } else {
            msg.innerHTML = 'A database connection is needed to stream the query log, or upload a file via "Choose File" ';
        }
        $('.menu .item').tab("change tab", "first");

    }

    // _prepareShowLogtab(withFilters) {
    //     let appLogFile = document.getElementById("appLogFile");
    //     let html = "";
    //     if (withFilters && withFilters == true) {
    //         html +="<table width='100%'><tr><td style='width: 300px'><div id='"+ this.LOG_DATE_FILTER_KEY+ "' class='ui fluid left icon input'><input onkeyup='qan.onLogFilterChange();' id='"+ this.LOG_DATE_FILTER_INPUT + "' type='text' placeholder='Hit enter to apply filter on log date.'/><i class='filter icon'></i></div></div>";
    //         html += "</td><td><div id='"+ this.LOG_QUERY_FILTER_KEY+ "' class='ui fluid left icon input'><input onkeyup='qan.onLogFilterChange();' id='"+ this.LOG_QUERY_FILTER_INPUT + "' type='text' placeholder='Hit enter to filter on query.'/><i class='filter icon'></i></div></td></tr></table>";
    //     }
    //     html += "<div id='" + this.SUMMARY_TABLE_KEY +"'></div>"
    //     appLogFile.innerHTML = html;
    // }

    _initQueryLog(withFilters) {
        this._initQueryLogImpl(withFilters);
        let current = this;
        document.getElementById(this.LOG_DATE_FILTER_INPUT).addEventListener("keyup", function(event) {
            current.onLogFilterChange(event);
        });
        document.getElementById(this.LOG_QUERY_FILTER_INPUT).addEventListener("keyup", function(event) {
            current.onLogFilterChange(event);
        });
    }
    _showAllQueryLogSection() {
        return "<button class='compact ui teal basic button' onClick='qan._showLogLoading()'>Show Query Log</button> Note showing all queries can take some time. Try to use the filters below instead.";

    }
    _initQueryLogImpl(withFilters){
        let appLogFile = document.getElementById("appLogFile");
        let html = "";

        html +="<div id='" + this.LOG_HEADER_SECTION_KEY + "'>";
        html += this._showAllQueryLogSection();
        html +="</div>";

        if (withFilters && withFilters == true) {
            // onkeyup='qan.onLogFilterChange();'
            html += "<div id='" + this.LOG_FILTER_SECTION_KEY + "'>"
            html += "<table width='100%' style='border-spacing: 0px; padding: 0px;'><tr><td style='width: 230px'><div id='"+ this.LOG_DATE_FILTER_KEY+ "' class='ui fluid left icon input'><input id='"+ this.LOG_DATE_FILTER_INPUT + "' type='text' placeholder='Hit Enter to filter on log date.'/><i class='filter icon'></i></div></div>";
            html += "</td><td><div id='"+ this.LOG_QUERY_FILTER_KEY+ "' class='ui fluid left icon input'><input  id='"+ this.LOG_QUERY_FILTER_INPUT + "' type='text' placeholder='Hit enter to filter on query.'/><i class='filter icon'></i></div></td></tr></table>";
            html += "</div>";
        } else {
            html +="<div id='" + this.LOG_FILTER_SECTION_KEY + "'></div>";
        }
        html += "<div id='" + this.LOG_TABLE_SECTION_KEY +"'></div>";

        appLogFile.innerHTML = html;
    }
    __getDate(aDateString) {
        // if there is a space replace it with a T
        let ds = aDateString;
        if (aDateString.indexOf(' ') > -1 ) {
            ds = aDateString.substring(0, aDateString.indexOf(' ') ) + "T" + aDateString.substring( aDateString.indexOf(' ') + 1 );
        }
        return new Date(ds);
    }

    __analyseLogEntry(curLine, srv, map) {
        let proceed = true;
        let record = [];
        let isJSON = false;
        let isAuraJSON = false;
        if (typeof curLine == "string") {
            record = curLine.trim().split("\t");

            isJSON = curLine.substring(0,9) == '{"time":"';
        } else {
            isAuraJSON = true;
        }


        // console.log(" is JSON " + isJSON  + " curLine.substring(0,8) :" + curLine.substring(0,8) );
        //
        //  The query log record first split is on tab characters
        //  only in the lower range it makes sense to check the length
        //  if the log file contains an java error stack then on each line of the stack there is also a tab
        //  therefore record.length > 9 is also allowed
        //
        if (isJSON === true || isAuraJSON === true ||record.length == 9 || record.length == 8 || record.length == 5 || record.length == 3 || record.length == 7 || record.length > 9 ) {
            let qrec = '';
            if (isJSON === true) {
                qrec = this._parseJSONLine(record);
            } else if (isAuraJSON === true) {
                qrec = this._parseAuraJSONLine(curLine);
            } else {
                if (record[1] == "bolt") {
                    qrec = this._parseBoltLine(record);
                } else if (record[1] == "http"){
                    qrec = this._parseHttpLine(record);
                } else {
                    qrec = this._parseEmbeddedLine(record);
                }
            }
            if (qrec === null) {
                return false; // skipping the explain records
            }
            qrec.srv = srv;

            // we only create a summary for completed queries
            if (qrec.startOnly != undefined && qrec.startOnly === false) {
                // startOnly = false means that the query is finished
                if (this.onlyStarted.has(qrec.qid)) {
                    this.onlyStarted.delete(qrec.qid);
                    this.startedOnlyCount--;
                }
            }
            if (qrec.startOnly != undefined  && qrec.startOnly === true) {
                // console.log("aaaaa : " + (qrec.startOnly === true));
                // maintain here the query started and
                this.onlyStarted.set(qrec.qid, qrec);
                this.startedOnlyCount++;
                return false;
            }
            // determining minLogTime and maxLogTime


            // let d = new Date(qrec.logdate);
            let d = this.__getDate(qrec.logdate);
            //console.log(d);
            if (this.minLogTime == 0 && this.maxLogTime == 0) {
                this.minLogTime = d.getTime();
                this.maxLogTime = d.getTime();
            } else {
                if (d.getTime() < this.minLogTime) this.minLogTime = d.getTime();
                if (d.getTime() > this.maxLogTime) this.maxLogTime = d.getTime();
            }

            // adding the log record to log array
            this.log.push(qrec);

            // statistics
            let qs = this._createQueryStat();
            qs.srv = srv;
            let qskey = srv + "_" + qrec.dbname + qrec.query;
            if (map.has(qskey)) {
                qs = map.get(qskey);
            } else {
                qs.query = qrec.query;
                qs.dbname = qrec.dbname;
            }
            if (!this._arrayContains(qs.protocols, qrec.protocol)) qs.protocols.push(qrec.protocol);
            if (!this._arrayContains(qs.clients, qrec.client)) qs.clients.push(qrec.client);

            // from to logdate
            if (qs.minLogTime == 0 && qs.maxLogTime == 0) {
                qs.minLogTime = d.getTime();
                qs.maxLogTime = d.getTime();
            } else {
                if (d.getTime() < qs.minLogTime) qs.minLogTime = d.getTime();
                if (d.getTime() > qs.maxLogTime) qs.maxLogTime = d.getTime();
            }

            qs.count = qs.count + 1;
            qs.totalMillis = qs.totalMillis + qrec.queryMillis;
            qs.totalCPU = qs.totalCPU + qrec.cpu;
            qs.totalMem = qs.totalMem + qrec.mem;
            qs.totalPlanning = qs.totalPlanning + qrec.planning;
            qs.totalWaiting = qs.totalWaiting + qrec.waiting;
            // max time and min time
            if (qs.maxTime == 0 && qs.minTime == 0) {
                qs.maxTime = qrec.queryMillis;
                qs.minTime = qrec.queryMillis;
            } else {
                if (qrec.queryMillis < qs.minTime) qs.minTime = qrec.queryMillis;
                if (qrec.queryMillis > qs.maxTime) qs.maxTime = qrec.queryMillis;
            }
            //console.log(qs.maxTime);
            // if (isNaN(qs.maxTime)) {
            //     console.log(qs);
            // }
            //planning

            if (qs.maxPlanning == 0 && qs.minPlanning == 0) {
                qs.maxPlanning = qrec.planning;
                qs.minPlanning = qrec.planning;
            } else {
                if (qrec.planning < qs.minPlanning) qs.minPlanning = qrec.planning;
                if (qrec.planning > qs.maxPlanning) qs.maxPlanning = qrec.planning;
            }
            // cpu
            if (qs.maxCPU == 0 && qs.minCPU == 0) {
                qs.maxCPU = qrec.cpu;
                qs.minCPU = qrec.cpu;
            } else {
                if (qrec.cpu < qs.minCPU) qs.minCPU = qrec.cpu;
                if (qrec.cpu> qs.maxCPU) qs.maxCPU = qrec.cpu;
            }
            // waiting
            if (qs.maxWaiting == 0 && qs.minWaiting == 0) {
                qs.maxWaiting = qrec.waiting;
                qs.minWaiting = qrec.waiting;

            } else {
                if (qrec.waiting < qs.minWaiting) qs.minWaiting = qrec.waiting;
                if (qrec.waiting > qs.maxWaiting) qs.maxWaiting = qrec.waiting;
            }
            // mem usage
            if (qs.maxMem == 0 && qs.minMem == 0) {
                qs.maxMem = qrec.mem;
                qs.minMem = qrec.mem;

            } else {
                if (qrec.mem < qs.minMem) qs.minMem = qrec.mem;
                if (qrec.mem > qs.maxMem) qs.maxMem = qrec.mem;
            }
            // hit Ratio
            // percentage Cache Faults
            if (qrec.pageHits > 0 || qrec.pageFaults > 0) {
                // pageCache loggins is used
                qs.cacheLogging = true;
                let hitRatio = (((qrec.pageHits)/(qrec.pageHits + qrec.pageFaults)) * 100);
                qs.totalHitRatio = qs.totalHitRatio + hitRatio;
                if (qs.maxHitRatio == -1 && qs.minHitRatio == -1) {
                    qs.maxHitRatio = hitRatio;
                    qs.minHitRatio = hitRatio;
                } else {
                    if (hitRatio < qs.minHitRatio) qs.minHitRatio = hitRatio;
                    if (hitRatio > qs.maxHitRatio) qs.maxHitRatio = hitRatio;
                }
            }
            // console.log(qs);
            map.set(qskey, qs);
        } else {
            console.log("WARN unexpected record length " + record.length);
            console.log(record);
            console.log(curLine);
        }
        return proceed;
    }

    _analyseLog(logLines, auraType) {
        // check the latest line if this is an empty string then remove it
        // inputType = file: an uploaded query log
        // inputType = query then we have also the server number with it in
        this.minLogTime = 0;
        this.maxLogTime = 0;
        this.maxQueryId = -1;
        this.onlyStarted = new Map();
        let curLine = "";
        let map = new Map();
        this.startedOnlyCount = 0;
        this.entryCount = 0;
        if (auraType && auraType === true) {
            let row = "";
            let srv = "";// when connected this is always there.
            // console.log(" Aura file with " + logLines.length+ " entries");
            for (let ri = 0; ri < logLines.length; ri++ ) {
                let entry = logLines[ri];
                this.__analyseLogEntry(entry, srv, map);
            }
        } else {
            for (let ri = 0; ri < logLines.length; ri++ ) {
                let entry = logLines[ri];
                let row = "";
                let srv = "";// when connected this is always there.
                if (typeof entry == 'string' ) {
                    row = entry
                } else if (logLines[ri].line) {
                    row = logLines[ri].line.trim();
                    srv = logLines[ri].srv;
                    row += " \n";
                } else {
                    // assume it is a json object from aura
                }

                let isNewEntry = this._isNewEntry(row);
                let isLastRow = (ri === (logLines.length -1));
                if ( isNewEntry == true || isLastRow == true) {
                    // if the curLine !== "" then this must be processed note curLine can be spread over multiple line
                    // it is not a newEntry then it is a lastEntry
                    // then the current row must be added to the curLine
                    if (isNewEntry == false) {
                        // it is the last row add it to the curLine
                        curLine += row;
                        // this was the last row we have to process it anyway
                        this.__analyseLogEntry(curLine, srv, map);
                    } else {
                        //  log entry
                        this.entryCount++;
                        if (isLastRow == true) {
                            // a new entry and the last row
                            // we have to process here the previous row also
                            this.__analyseLogEntry(curLine, srv, map); // don't have to skip here
                            // we have to proces this row also
                            this.__analyseLogEntry(row, srv, map); // don't have to skip here
                            curLine = "";// clear
                        } else {
                            // this no last row and a new entry so the 'previous' line(s) must be processed
                            if (curLine == "") {
                                // nothing to do
                                curLine += row + " ";
                                continue; // skip this processing
                            } else {
                                //console.log(curLine);
                                // this is the previous row
                                if (this.__analyseLogEntry(curLine, srv, map) === false);
                                // put in here the current row
                                curLine = row + " ";
                            }
                        }
                    }

                } else {
                    // multiline log entry
                    curLine += row + " ";
                }
            }
        }


        // calculate average once
        let pana = [];
        for (let key of map.keys()) {
            let aqs = map.get(key);
            let cnt = aqs.count;
            aqs.avgTime = aqs.totalMillis/cnt;
            aqs.avgCPU = aqs.totalCPU/cnt;
            aqs.avgMem = aqs.totalMem/cnt;
            aqs.avgPlanning = aqs.totalPlanning/cnt;
            aqs.avgWaiting = aqs.totalWaiting/cnt;
            aqs.avgHitRatio = aqs.totalHitRatio/cnt;
            pana.push(aqs);

        }
        // sorting
        pana.sort(function(a,b) {
            let a_ =  a.avgTime * a.count;
            let b_ =  b.avgTime * b.count;
            if (a_ < b_) return 1;
            if (a_ > b_) return -1;
            return 0;
        });
        this.summaryOrder = "default"; // most expensive on top avgTime * count
        // if the last unfinished query is  "apoc.log.stream" then this one must be removed
        // this is actual the call to stream log records
        if (this.onlyStarted.size > 0 ) {
            let lastStartedQuery = this.onlyStarted.get(this.maxQueryId);
            if (lastStartedQuery && lastStartedQuery.query.indexOf("apoc.log.stream") > -1 ) {
                // remove from onlyStarted
                this.onlyStarted.delete(this.maxQueryId);

            }
        }

        return pana;
    }


    _orderSummaryColumn(property) {
        //console.log("_orderQueryCount()");
        let orderASC = false;
        let summaryOrderASC = property + "ASC";
        let summaryOrderDESC = property + "DESC";
        if (this.summaryOrder === summaryOrderASC || this.summaryOrder === summaryOrderDESC ) {
            if (this.summaryOrder === summaryOrderDESC) {
                this.summaryOrder = summaryOrderASC;
                orderASC = true;
            } else {
                this.summaryOrder = summaryOrderDESC;
                orderASC = false;
            }
        } else {
            this.summaryOrder = summaryOrderDESC;
            orderASC = false;
        }
        //console.log("1c");
        this.ana.sort(function(a,b) {
            let a_ =  a[property];
            let b_ =  b[property];
            //console.log("a_ " + a_ + " b_ " + b_ );
            if (orderASC) {
                if (a_ < b_) return -1;
                if (a_ > b_) return 1;
            } else {
                if (a_ < b_) return 1;
                if (a_ > b_) return -1;
            }
            return 0;
        });
        // let tableSummary = document.getElementById(this.SUMMARY_TABLE_KEY);
        // console.log(this.SUMMARY_TABLE_KEY);
        // tableSummary.innerHTML = ""; // clear
        // tableSummary.innerHTML  = this._buildSummary();
        this._buildSummary();
        // count_OrderIcon
        let iconElm = document.getElementById(property + "_OrderIcon");

        let iconclass = "caret down icon";
        if (orderASC) {
            iconclass = "caret up icon";
        }
        let curHTML = iconElm.innerHTML + "<i class='" + iconclass +  "'></i>";
        iconElm.innerHTML = curHTML;
    }

    _toolTip(aText) {
        return "<div class='tooltip'>" + aText + "</div>";
    }
    _buildSummary() {
        let anas = this.ana;
        let contents = "";
        let filter = document.getElementById(this.FILTER_INPUT_KEY).value;
        let applyQueryFilter = false;
        if (filter && filter.length > 0) {
            applyQueryFilter = true;
        }
        let fxconfig = { height: 700
            , subContainerWidth: 1620
            , columns: [{ name: "query count", size: 330
                        , thAttributes: "id='count_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"count\");'"}
                ,{ name: "avg time (ms)", size: 130
                    , thAttributes: "id='avgTime_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgTime\");'"}
                ,{ name: "min time (ms)", size: 130}
                ,{ name: "max time (ms)", size: 130}
                ,{ name: "avg cpu (ms)", size: 130
                   , thAttributes: "id='avgCPU_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgCPU\");'"}
                ,{ name: "max planning (ms)", size : 130
                   , thAttributes: "id='maxPlanning_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"maxPlanning\");'"}
                ,{ name: "avg waiting (ms)", size : 130
                   , thAttributes: "id='avgWaiting_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgWaiting\");'"}
                ,{ name: "cache hits (%)", size : 130
                   , thAttributes: "id='avgHitRatio_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgHitRatio\");'"}
                ,{ name: "avg mem (K)", size : 120
                   , thAttributes: "id='avgMem_OrderIcon' style='cursor : pointer' class='hover' onClick='qan._orderSummaryColumn(\"avgMem\");'"}
                ,{ name: "protocols = clients", size : 250}
            ]
        }

        let fxtable = new FixedHeaderTable(this.SUMMARY_TABLE_KEY, fxconfig);

        let rowbackground = false;
        for (let i = 0 ; i < anas.length; i++) {
            let dta = anas[i];
            let fxrow = "";
            //
            // filter check
            //
            if (applyQueryFilter && applyQueryFilter == true) {
                let dbFilter = "";
                let queryFilter = filter.toLowerCase();
                let dbpos = queryFilter.indexOf("db:");
                if (dbpos == -1) {
                    if (dta.query.toLowerCase().indexOf(filter.toLowerCase()) == -1) {
                        continue;
                    }
                } else {
                    // db:<dbname> can be everywhere in the query string
                    let spacePos = queryFilter.indexOf(' ', dbpos );
                    let dbname = '';
                    let queryPart = '';
                    if (spacePos > -1) {
                        dbname = queryFilter.substring(dbpos+3, spacePos).trim();
                        queryPart = queryFilter.substring(0,dbpos) + queryFilter.substring(spacePos).trim();
                    } else {
                        dbname = queryFilter.substring(dbpos+3).trim();
                        if (dbpos > 0) {
                            // there is something before it
                            queryPart = queryFilter.substring(0,dbpos).trim();
                        }
                    }
                    let instancePos = dbname.toLowerCase().indexOf("@");
                    let instance = -1;
                    if (instancePos > -1) {
                        // there is an @ sign
                        instance = parseInt(dbname.substring(instancePos + 1));
                        dbname = dbname.substring(0,instancePos);
                    }
                    if (dta.dbname.startsWith(dbname) === false) {
                        continue;
                    }
                    if (nac.neodb.isCluster === true) {
                        // there is a cluster instance
                        if (instance > -1 && dta.srv != instance) {
                            continue;
                        }
                    }
                    if (dta.query.toLowerCase().indexOf(queryPart) == -1) {
                        continue;
                    }
                }


            }

            // two rows are used here
            // second row 2 columns

            // tabular values row
            if (rowbackground) {
                fxrow += "<tr style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
            } else {
                fxrow += "<tr style='border-top: 1px solid lawngreen '>";
            }
            fxrow += "<td><div class='ui two column grid'><div class='row'><div class='column'>" + dta.count + "</div>" + this._getDBNameFormatted(dta) + "</div></div></td>";
            fxrow += "<td>" + Math.round(dta.avgTime) + "</td>";
            fxrow += "<td>" + dta.minTime + "</td>";
            fxrow += "<td>" + dta.maxTime + "</td>";

            fxrow += "<td class='hover'>" + Math.round(dta.avgCPU) + "<div class='tooltip'>min:" + dta.minCPU + " max:" + dta.maxCPU + "</div></td>";
            fxrow += "<td class='hover'>" + dta.maxPlanning + "<div class='tooltip'>min:" + dta.minPlanning + " avg:" + Math.round(dta.avgPlanning)+ "</div></td>";
            fxrow += "<td class='hover'>" + Math.round(dta.avgWaiting) + "<div class='tooltip'>min:" + dta.minWaiting + " max:" + dta.maxWaiting + "</div></td>";
            if (dta.cacheLogging === true) {
                fxrow += "<td class='hover'>" + Math.round(dta.avgHitRatio) + "<div class='tooltip'>min:" + Math.round(dta.minHitRatio) + " max:" + Math.round(dta.maxHitRatio) + "</div></td>";
            } else {
                fxrow += "<td> </td>";
            }
            fxrow += "<td class='hover'>" + Math.round(dta.avgMem/1024) + "<div class='tooltip'>min:" + Math.round(dta.minMem/1024)+ " max:" + Math.round(dta.maxMem/1024) + "</div></td>";
            fxrow += "<td>" + this._arrayToHtml(dta.protocols) + "</td>";
            fxrow += "</tr>";

            // query row
            if (rowbackground) {
                fxrow += "<tr valign='top' style='background-color: #DDD;'>";
            } else {
                fxrow += "<tr valign='top'>";
            }
            fxrow += "<td><div class='ui inverted green icon buttons'><button title='Filter' class='ui button' onClick='qan._showFilteredLog(" + i + ", false);'><i class='filter icon'></i></button>";
            fxrow += "<button class='ui button' title='Highlight' onClick='qan._showFilteredLog(" + i + ", true);'><i class='lightbulb outline icon'></i></button>";
            fxrow += "<button class='ui button' title='Timeline' onClick='qan._showQueryTimeline(" + i + ");'><i class='chart bar outline icon'></i></button>";
            if (nac.neoConnection === true) {
                if (dta.dbname && dta.dbname.length > 0) {
                    // no query in log
                    if (dta.dbname != "system" && dta.query.indexOf("no query in log") == -1) {
                        fxrow += "<button class='ui button' title='Explain' onClick='qan._explainQuery(" + i + ");'><i class='vertically flipped sitemap icon'></i></button>";
                    }
                } else {
                    fxrow += "<button class='ui button' title='Explain' onClick='qan._explainQuery(" + i + ");'><i class='vertically flipped sitemap icon'></i></button>";
                }
            }
            fxrow += "</div><br/>";
            if (dta.count == 1) {
                fxrow += "<div style='font-size: 0.8em'><b>" + this._formatDate(dta.minLogTime) + "</b></div></td>"
            } else {
                fxrow += "<div style='font-size: 0.8em'><b>" + this._formatDate(dta.minLogTime) + "</b> to <b>" + this._formatDate(dta.maxLogTime) + "</b></div></td>"
            }
            fxrow += "<td colspan='8'><div style='word-break: break-all; word-wrap: break-word;max-height: 300px; overflow-y: auto;''>" + this._formatCypher(dta.query) + "</div></td>";
            // contents += "<td><div style='font-family: monospace ; font-size: .9em; width: 1000px; word-wrap : normal'>" + dta.dbname + "</div></td>";
            if (dta.clients && dta.clients.length > 2) {
                fxrow += "<td><div style='font-size: .9em; width: 200px; word-wrap : normal'>" + this._arrayToHtml(dta.clients.slice(0,2))+ "<button class='compact ui teal basic button' onClick='qan._showClients(" + i + ");'>show all " + dta.clients.length + " clients</button></div><div id='clientsdiv_" + i + "'></div></td>";
            } else {
                fxrow += "<td><div style='font-size: .9em; width: 200px; word-wrap : normal'>" + this._arrayToHtml(dta.clients)+ "</div></td>";
            }
            fxrow += "</tr>";
            fxtable.addTableRowAsHTML(fxrow);
            rowbackground = !rowbackground;
        }

        fxtable.showTable();
    }
    _getDBNameFormatted(dta) {
        if (dta.dbname && dta.dbname.length > 0) {
            if (nac.neodb && nac.neodb.isCluster == true) {
                return "<div class='column'><div class='ui left pointing basic label'><i class='database icon'></i>" + dta.dbname + "@" + dta.srv +  "</div></div>";
            } else {
                return "<div class='column'><div class='ui left pointing basic label'><i class='database icon'></i>" + dta.dbname + "</div></div>";
            }
        } else {
            if (nac.neodb && nac.neodb.isCluster == true) {
                return "<div class='column'><div class='ui left pointing basic label'><i class='database icon'></i>@" + dta.srv + "</div></div>";
            } else {
                return "";
            }
        }
    }

    _explainQuery(aInd) {

        let dta = this.ana[aInd];
        let dbname = dta.dbname;
        let query = dta.query;
        let srv = dta.srv;
        //console.log(dta)
        // find the first parameter set for this query.
        //let params = this._getParametersFromLog(dbname, query);
        let params = {};
        querylistapp.showQueryModal (query, params, dbname, srv);
    }

    _getParametersFromLog(aDBname, aQuery) {

        if (aDBname) {
            for (let i = 0; i < this.log.length; i++) {
                let dta = this.log[i];
                if (aQuery == dta.query && aDBname == dta.dbname) {
                    return dta.params;
                }
            }
        } else {
            for (let i = 0; i < this.log.length; i++) {
                let dta = this.log[i];
                if (aQuery == dta.query) {
                    return dta.params;
                }
            }
        }
        return null;
    }

    _explainCurrentQuery(anId) {
        let dta = this.log[anId];

        let query = dta.query;
        let params = dta.params;

        querylistapp.showQueryModal (query, params, dta.dbname, dta.srv);
    }
    _explainUnfilteredQuery(anId) {
        let dta = this.onlyStarted.get(anId); //this is a map where the query id is the key

        let query = dta.query;
        let params = dta.params;

        querylistapp.showQueryModal (query, params, dta.dbname, dta.srv);
    }
    _doFilter(dta, aQuery, aSrv, aDbname) {
        let doit = false;
        if (aDbname && aDbname.length > 0) {
            doit = dta.dbname == aDbname && dta.srv == aSrv && dta.query.indexOf(aQuery) == 0 ;
        } else {
            doit = dta.srv == aSrv && dta.query.indexOf(aQuery) == 0;
        }
        return doit;
    }
    onLogFilterChange(event) {
        let dateFilterInp = document.getElementById(this.LOG_DATE_FILTER_INPUT);
        let queryFilterInp = document.getElementById(this.LOG_QUERY_FILTER_INPUT);
        let dateFilter = document.getElementById(this.LOG_DATE_FILTER_INPUT).value;
        let queryFilter = document.getElementById(this.LOG_QUERY_FILTER_INPUT).value;
        let logTableSection = document.getElementById(this.LOG_TABLE_SECTION_KEY);
        if (this._isEnter(event)) {
            this.__onLogFilterChangeImpl();
        } else {
            dateFilterInp.style = 'background-color: ' + this.filterInActiveBackground_color;
            queryFilterInp.style = 'background-color: ' + this.filterInActiveBackground_color;
            logTableSection.innerHTML = ""; // clear
            document.getElementById(this.LOG_HEADER_SECTION_KEY).innerHTML = this._showAllQueryLogSection();
        }
    }
    __onLogFilterChangeImpl() {
        if (this.log.length == 0) return;
        let dateFilter = document.getElementById(this.LOG_DATE_FILTER_INPUT).value;
        let queryFilter = document.getElementById(this.LOG_QUERY_FILTER_INPUT).value;
        let dateFilterInput = document.getElementById(this.LOG_DATE_FILTER_INPUT);
        let queryFilterInput = document.getElementById(this.LOG_QUERY_FILTER_INPUT);
        let logTableSection = document.getElementById(this.LOG_TABLE_SECTION_KEY);
        if (dateFilter.length > 0 || queryFilter.length > 0) {
            // apply the filter
            let msg = "Loading queries ";
            // cur filter
            let curFilter = dateFilter + "_" + queryFilter;
            if (curFilter === this.lastLogFilter) return;
            if (dateFilter.length > 0) {
                dateFilterInput.style = 'background-color: ' + this.filterActiveBackground_color;
                msg += " log date filter:'" + dateFilter + "'";
            } else {
                dateFilterInput.style = 'background-color: ' + this.filterInActiveBackground_color;
            }
            if (queryFilter.length > 0) {
                queryFilterInput.style = 'background-color: ' + this.filterActiveBackground_color;
                msg += " query filter:'" + queryFilter + "'";
            } else {
                queryFilterInput.style = 'background-color: ' + this.filterInActiveBackground_color;
            }
            this._loadQueryLog(msg);
            this.lastLogFilter = curFilter;
        } else {
            // clear!!
            this._loadQueryLog("Loading all " + this.log.length + " queries");
            this.lastLogFilter = "";
        }
    }
    _loadQueryLog(loadingmsg) {
        let lmsg = "Loading";
        if (loadingmsg && loadingmsg.length > 0) {
            lmsg = loadingmsg;
        }
        let logTableSection = document.getElementById(this.LOG_TABLE_SECTION_KEY);
        logTableSection.innerHTML = "<div style='height: 600px' class=\"ui segment\">\n" +
            "  <div class=\"ui active inverted dimmer\">\n" +
            "    <div class=\"ui text loader\">" + lmsg + "</div>\n" +
            "  </div>\n" +
            "</div>";
        let current = this;
        setTimeout(function() {
            current._buildQueryLog(-1,true);
        }, 50);
    }

    _orderQLColumn(property) {
        let orderASC = true; // default is ascending
        let orderingASC = property + "ASC";
        let orderingDESC = property + "DESC";
        // getting the current order and toggle
        let currentOrder = '';
        if (this.qlOrder.length > 0) {
            currentOrder = this.qlOrder;
        }
        if (currentOrder === orderingASC || currentOrder === orderingDESC ) {
            if (currentOrder === orderingDESC) {
                currentOrder = orderingASC;
                orderASC = true;
            } else {
                currentOrder = orderingDESC;
                orderASC = false;
            }
        } else {
            currentOrder = orderingDESC;
            orderASC = false;
        }
        this.qlOrder = currentOrder;
        // now sorting the dataset
        let current = this;
        this.log.sort(function(a,b) {
            let a_ =  a[property];
            let b_ =  b[property];
            //console.log("a_ " + a_ + " b_ " + b_ );
            if (orderASC) {
                if (a_ < b_) return -1;
                if (a_ > b_) return 1;
            } else {
                if (a_ < b_) return 1;
                if (a_ > b_) return -1;
            }
            return 0;
        });
        // build the query log again
        this._buildQueryLog(this.qlLastIndex, this.qlLastShowAll);
        // control the sort icon
        let iconElm = document.getElementById(property + "_OrderIconQL_");
        let iconclass = "caret down icon";
        if (orderASC) {
            iconclass = "caret up icon";
        }
        let curHTML = iconElm.innerHTML + "<i class='" + iconclass +  "'></i>";
        iconElm.innerHTML = curHTML;
    }

    _buildQueryLog(index, pShowAll){
        this.qlLastIndex = index;
        this.qlLastShowAll = pShowAll;
        let tableSection = document.getElementById(this.LOG_TABLE_SECTION_KEY);
        let headerSection = document.getElementById(this.LOG_HEADER_SECTION_KEY);
        let filterSection = document.getElementById(this.LOG_FILTER_SECTION_KEY);
        let dateFilter = "";
        let queryFilter = "";
        let fxtableheight = 630;
        tableSection.innerHTML = "";
        headerSection.innerHTML = "";

        let applyFilter = false;
        let showall = false;
        let header = "";
        let contents = "";
        let bQueryFilter = "";
        let srvparm = "";
        let filterDb = "";

        if (pShowAll) showall = pShowAll;
        // only when show all and when there is no index then you can filter the results;
        if (showall == false || index > -1) {
            filterSection.innerHTML = "";
        } else {
            dateFilter = document.getElementById(this.LOG_DATE_FILTER_INPUT).value;
            queryFilter = document.getElementById(this.LOG_QUERY_FILTER_INPUT).value;
        }

        if (index > -1) {
            applyFilter = true;
            bQueryFilter = this.ana[index].query;
            if (this.ana[index].srv) {
                srvparm = this.ana[index].srv;
            }
            if (this.ana[index].dbname && this.ana[index].dbname.length > 0) {
                filterDb = this.ana[index].dbname;
            }
        }
        // index2.html
        //        contents += "<div class='ui message' style='width: 1630px; overflow:auto;'><div class='header'>";
        // index.html


        if (applyFilter) {
            header += "<table width='100%'><tr valign='top'><td width='15px'><button class=\"compact ui teal basic button\" onclick=\"qan.clearAppLogFile()\"><i class=\"eraser icon\"></i></button></td><td><div class='ui fluid message' style='min-height: 150px; max-height: 150px; overflow-y: auto ' >";
            let dbstr = "";
            if (filterDb.length > 0) {
                dbstr = filterDb + ":> ";
            }
            if( showall) {
                header += "Use tab/shift-tab to navigate the marked query lines, marked with filter: <p>"+ dbstr + this._formatCypher(bQueryFilter);

            } else {
                header += "Use tab/shift-tab to navigate the query lines, showing only queries with filter: <p>"+ dbstr + this._formatCypher(bQueryFilter);
            }
            fxtableheight = fxtableheight - 100 + 40; // + 40 for the missing filter section
        } else {
            header += "<table width='100%'><tr valign='top'><td width='15px'><button class=\"compact ui teal basic button\" onclick=\"qan.clearAppLogFile()\"><i class=\"eraser icon\"></i></button></td><td><div class='ui fluid message' style='max-height: 150px; overflow-y: auto ' >";
            if (dateFilter.length > 0 || queryFilter.length > 0) {
                header += "Showing filtered queries in log.<p>";
            } else {
                header += "Showing all queries in log.<p>";
            }
        }
        header += "</p></div></td></tr></table>";
        headerSection.innerHTML = header;
        let fxconfig = { subContainerWidth: 1620
            , height: fxtableheight
            , columns: [{ name: "@", size: 40}
                ,{ name: "log date", size: 190
                    , thAttributes: "id='logdate_OrderIconQL_' style='cursor : pointer' onClick='qan._orderQLColumn(\"logdate\");'"}
                ,{ name: "dbname", size: 140}
                ,{ name: "user", size: 100}
                ,{ name: "query", size: 450}
                ,{ name: "params", size : 250}
                ,{ name: "time (ms)", size : 110}
                ,{ name: "planning (ms)", size : 110}
                ,{ name: "cpu (ms)", size : 100}
                ,{ name: "waiting (ms)", size : 110}
                ,{ name: "pageHits", size : 110}
                ,{ name: "pageFaults", size : 110}
                ,{ name: "mem (K)", size : 110}
                ,{ name: "driver", size : 250}
                ,{ name: "txmeta", size : 350}
                ,{ name: "runtime", size : 120}
                ,{ name: "client", size : 200}
                ,{ name: "session", size : 120}
            ]
        }
        let fxtable = new FixedHeaderTable(this.LOG_TABLE_SECTION_KEY, fxconfig);
        let rowbackground = false;
        let tindex = 10;
        for (let i = 0; i < this.log.length; i++) {
            let fxrow = "";
            let dta = this.log[i];
            let isFiltered = false;
            if (applyFilter) {
                if (this._doFilter(dta,bQueryFilter,srvparm,filterDb)) {
                    if (rowbackground) {

                        fxrow += "<tr valign='top' tabindex='" + tindex + "' style='border-top: 1px solid lawngreen; background-color: #ffff66; '>";
                    } else {
                        fxrow += "<tr valign='top' tabindex='" + tindex + "' style='border-top: 1px solid lawngreen; background-color: #ffff80; '>";
                    }
                    isFiltered = true;
                    tindex++;
                } else {
                    if (!showall) {
                        continue;
                    } else {
                        if (rowbackground) {
                            fxrow += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
                        } else {
                            fxrow += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
                        }
                    }
                }
            } else {
                // check here if a date or query filter must be applied

                if (dateFilter.length > 0 || queryFilter.length > 0) {
                    if (dateFilter.length > 0) {
                        if (dta.logdate.toLowerCase().indexOf(dateFilter.toLowerCase()) == -1) {
                            continue;
                        }
                    }
                    if (queryFilter.length > 0) {
                        if (dta.query.toLowerCase().indexOf(queryFilter.toLowerCase()) == -1) {
                            continue;
                        }
                    }
                }
                if (rowbackground) {
                    fxrow += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
                } else {
                    fxrow += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
                }
            }
            let srv = "";
            if (dta.srv) {
                srv = dta.srv;
            }
            fxrow += "<td>" + srv + "</td>";
            fxrow += "<td>" + dta.logdate + "</td>";
            let dbn = "__";
            if (dta.dbname && dta.dbname != "" && dta.dbname !== "<none>") {
                dbn = dta.dbname;
            }
            fxrow += "<td>" + dta.dbname + "</td>";
            fxrow += "<td>" + dta.neoUser + "</td>";

            //query
            fxrow += "<td ><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>";
            if (nac.neoConnection === true && dbn !== "system" && dbn !== "" && dta.query.indexOf("no query in log") == -1) {
                fxrow += "<div class='ui inverted green icon buttons'><button class='ui tiny button' title='Explain' onClick='qan._explainCurrentQuery(" + i + ", \"" + dbn + "\");'> <i class='vertically flipped sitemap icon' > </i></button></div>&nbsp;&nbsp;";
            }
            if (isFiltered) {
                fxrow += "see above";
            } else {
                fxrow += this._formatCypher(dta.query) ;
            }
            fxrow += "</div></td>";
            // params
            let sparams = "";
            if (dta.params) {
                sparams = "" + dta.params;
            }
            fxrow += "<td ><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + sparams + "</div></td>";
            // time
            fxrow += "<td>" + dta.queryMillis + "</td>";
            // planning
            fxrow += "<td>" + dta.planning + "</td>";
            // cpu
            fxrow += "<td>" + dta.cpu + "</td>";
            // waiting
            fxrow += "<td>" + dta.waiting + "</td>";
            // pagehits
            fxrow += "<td>" + dta.pageHits + "</td>";
            // pagefaults
            fxrow += "<td>" + dta.pageFaults + "</td>";
            // mem
            fxrow += "<td>" + Math.round(dta.mem/1024) + "</td>";
            // driver
            fxrow += "<td><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + dta.driver + "</div></td>";
            // txmeta
            fxrow += "<td ><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + dta.txmeta + "</div></td>";
            // runtime
            fxrow += "<td>" + dta.runtime + "</td>";
            // client
            fxrow += "<td>" + dta.client + "</td>";
            // session
            fxrow += "<td>" + dta.sessionType + "</td>";

            fxrow += "</tr>";
            rowbackground = !rowbackground;
            fxtable.addTableRowAsHTML(fxrow);
        }
        fxtable.showTable();
        return true;

    }


    _showClients(anId) {
        let div = document.getElementById("clientsdiv_" + anId);
        if (div) {
            $('#clientsmodal').remove(); // clear any existing client modal
            div.innerHTML = "";
            let html = "";
            html += "<div id='clientsmodal' class='ui large modal'>";
            html += "<i class=\"close icon\"></i>";
            html += "  <div class=\"header\">Clients</div>" ;
            html += "  <div class=\"content\"><div style='height:400px; overflow-y: scroll; overflow-x: hidden'>";
            html += this._arrayToGrid(this.ana[anId].clients);
            html += "    </div></div></div>";
            div.innerHTML = html;

            $('#clientsmodal').modal('show');


        }
    }

    _formatDate(ts) {
        let d = new Date(ts);
        let res = d.getFullYear() + "-" + ( d.getMonth()  + 1 )+ "-" + d.getDate() + " ";
        if (d.getHours() < 10) { res += "0"}
        res += d.getHours() + ":";
        if (d.getMinutes() < 10) {res += "0"}
        res += d.getMinutes() + ":";
        if (d.getSeconds() < 10) {res += "0"}
        res += d.getSeconds();
        return res
    }

    _formatCypher(aText, errorMsg) {
        // split text in words

        let keywords = new Array("<>",">=","<=","<",">","!=","=","not","unique", "distinct","match","set","then","using","optional","index","remove","merge","on","create","delete","detach","return","from","where","with","skip","limit","call","yield","foreach","case","when","else","end","or","as","and","union", "all", "order", "by", "unwind", "desc", "asc","explain", "any" );
        let res = "";
//        let hlcolor = "#919A78"; #00ff00, #63B345
        let hlcolor = "#2db300";
        let errorColor = "red";

      //  let hlcolor = "lawngreen";
        // check if there is ERROR: in there
        //aText = aText.replace(/(\r\n|\n|\r)/gm, '<br/>');
        aText = aText.replace(/\n/g, "<br/>");
        let errorPos = aText.indexOf("ERROR:");
        let error = "";
        if (errorPos > -1) {
            error = aText.substring(errorPos);
            aText = aText.substring(0,errorPos);
        }
        if (errorMsg) {
            error = errorMsg;
        }
        let splitted = aText.split(" ");
        for (let i = 0; i < splitted.length; i++) {
            let word = splitted[i].trim();
            if (i > 0) {
                // preserve space
                res = res + " ";
            }
            if (this._arrayContains(keywords,this._prepareWord(word))) {
                res = res + "<span style='color :" + hlcolor + "'>" + word + "</span>";
            } else {
                res = res + word;
            }
        }
        if (errorPos > -1) {
            res = res + "<span style='color :" + errorColor + "'>" + error + "</span>";
        }
        // replace returns with <br/>
        return res;
    }

    _prepareWord(word) {
        let w = word;
        if (word.startsWith("'")) {
            w = word.substring(1);
        }
        let brpos = w.indexOf("<br");
        if (brpos > -1) {
            w = w.substring(0,brpos);
        }
        return w.toLowerCase();
    }

    _arrayToHtml(array) {
        let res = "";
        if (array) {
            for (let i=0; i < array.length; i++) {
                if (i ==0 ) {
                    res = res + array[i];
                } else {
                    res = res + "<br/>" + array[i].trim();
                }
            }
        }

        return res;
    }

    _arrayToGrid(array) {
        let res = "";
        if (array) {

            res += "<div class='ui four column grid'>";
            for (let i=0; i < array.length; i++) {
                res += "<div class='column'>" + array[i] + "</div>";
            }
            res += "<div>"
        }
        return res;
    }


    _showQueryTimeline(index) {
        this._analyseQueriesPerMinuteUnit(index);
        $('.menu .item').tab("change tab", "third");
    }

    _showFilteredLog(index, showAll) {
        let logTableSection = document.getElementById(this.LOG_TABLE_SECTION_KEY);
        logTableSection.innerHTML = "<div style='height: 600px' class=\"ui segment\">\n" +
            "  <div class=\"ui active inverted dimmer\">\n" +
            "    <div class=\"ui text loader\">Loading</div>\n" +
            "  </div>\n" +
            "</div>";
        let current = this;
        let pindex = index;
        let pshowAll = showAll;
        setTimeout(function() {
            current._buildQueryLog(pindex,pshowAll);
            $("tr[tabindex=10]").focus();
        }, 50);
//        this._buildQueryLog(index, showAll);
        $('.menu .item').tab("change tab", "second");

    }

    _showLogLoading() {
//        this._buildQueryLog(-1, true);
        this._loadQueryLog("Loading all " + this.log.length + " queries");
        $('.menu .item').tab("change tab", "second");
    }

    _showAllQtQ() {
        this.lastTimeLineQuery = -1;
        this._analyseQueriesPerMinuteUnit();
    }

    _analyseQueriesPerMinuteUnit(index) {
        let qtqShowAll = document.getElementById("qtqShowAll");
        let filterQuery = false;
        let aQuery = "";
        let dbname = "";
        let srv = "";
        let anarecord;
        if (index > -1) {
            filterQuery = true;
            this.lastTimeLineQuery = index;
            anarecord = this.ana[index];
        } else {
            if (this.lastTimeLineQuery > -1) {
                anarecord = this.ana[this.lastTimeLineQuery];
                filterQuery = true;
            }
        }
        if (filterQuery) {
            qtqShowAll.classList.remove("disabled");
            if (nac.neodb && nac.neodb.isCluster == true) {
                // there is an srv in the record
                srv = "@" + anarecord.srv;
            }
            if (anarecord.dbname && anarecord.dbname != null) {
                dbname = anarecord.dbname;
            }
            aQuery = anarecord.query;
        } else {
            qtqShowAll.classList.add("disabled");
        }
        let qtq = document.getElementById("qtq");
        qtq.innerHTML = "";
        let qtqContent = "";
        //  header += "<div class='ui fluid message' style='max-height: 150px; overflow-y: auto ' ><div class='header'><button class=\"ui icon button\" onclick=\"qan.clearAppLogFile()\"><i class=\"eraser icon\"></i></button>";
        //
        qtqContent += "<div class='ui fluid message' style='max-height: 150px; overflow-y: auto '>";
        // query.indexOf(bQueryFilter) > -1
        if (filterQuery) {
            let senpart = "";
            if ((dbname + srv).length > 0) {
                senpart = "on ";
            }
            qtqContent += "Showing timeline for query " + senpart + dbname + srv +  ": <p>" + this._formatCypher(aQuery);
        } else {
            qtqContent += "Using all queries in log.<p>";
        }
        qtqContent += "</p></div>";
        qtq.innerHTML = qtqContent;
        // experimental we have the logDate now which is not the same
        // as the query start date
        // for now we assume that the query start date is logDate - queryTime
        //
        //
        // We add also the avgQuerySpeed by time bucket
        //
        let bucketMinutes = document.getElementById("bucketMinutes").value;
        this.startTime = 0;
        this.endTime = 0;
        this.timeBuckets = [];
        this.timeCounts = [];
        this.timeSpeeds = []; // seconds
        let timebucket = 1000 * 60 * bucketMinutes; // 5 minutes
        let previousTime = 0;
        let queryCount = 0;
        let totalBucketSpeed = 0; // millis --> seconds

        for (let i = 0; i < this.log.length; i++) {
            let qr = this.log[i];
            if (filterQuery) {
                if (qr.query != aQuery ) {
                    continue;
                }
            }


            // getting the date
            let d = this.__getDate(qr.logdate);
            let curtime = d.getTime() - parseInt(qr.queryMillis);
            if (this.startTime == 0) {
                this.startTime= curtime;
            }
            this.endTime = curtime;
            if (previousTime == 0 ) {
               previousTime = curtime;
            }

            if (curtime - previousTime > timebucket) {
                // new time bucket
                // save the previous one
                this.timeBuckets.push(previousTime);
                this.timeCounts.push(queryCount);
                this.timeSpeeds.push(Math.round(((totalBucketSpeed/1000) / queryCount)));
                previousTime = curtime;
                queryCount = 0;
                totalBucketSpeed = 0;
            }
            // same time bucket
            queryCount++;
            totalBucketSpeed = totalBucketSpeed + parseInt(qr.queryMillis);
        }
        // don't fotget the latest
        this.timeBuckets.push(previousTime);
        this.timeCounts.push(queryCount);
        this.timeSpeeds.push(Math.round(((totalBucketSpeed/1000) / queryCount)));
        // draw the Chart
        // vis 2d graphs
        let groups = new vis.DataSet();
        groups.add({
            id: 0,
            content: "queries per " + bucketMinutes + " minutes",
            options: {drawPoints: {
                    style: 'square' // square, circle
                }}
        });
        groups.add({
            id: 1,
            content: "average query time (s)",
            options: {drawPoints: {
                    style: 'circle' // square, circle
                }}
        });
        let qcounts = document.getElementById("qcounts");
        qcounts.innerHTML = "";
        // building data list
        var items = [];
        for (let a = 0; a < this.timeBuckets.length; a++) {
            let bucket = this.timeBuckets[a];
            let qps = this.timeCounts[a];
            let sps = this.timeSpeeds[a];
            items.push ({x : bucket, y : qps, group : 0});
            items.push ({x : bucket, y : sps, group : 1});
        }
        var dataset = new vis.DataSet(items);
        var options = {
            defaultGroup: 'ungrouped',
            legend: true,
            style:'points'
        };
        var graph2d = new vis.Graph2d(qcounts, dataset, groups, options);
    }

    _isNewEntry(row) {
        // when there are error (possible in version 4)
        // when there are '-' on positions 4,7
        // and a space on position 10 then it is a new record
        // end the word ' INFO ' or ' ERROR ' is there
        // then it is a new log entry
        // example 2020-05-18
        let newEntry = false;
        // when the format is in JSON then every line is a new entry
        if (row.substring(0, 9) == '{"time":"' ) {
            newEntry = true;
        } else {
            if (row.substring(4,5) == '-' && row.substring(7,8) == '-' && row.substring(10,11) == ' ') {
                if (row.indexOf(" ERROR ") > -1 || row.indexOf(" INFO ") > -1) {
                    newEntry = true;
                }
            }
        }

        // console.log(row);
        // console.log("is new entry? " + newEntry + "  ---" + Date.now());
        return newEntry;
    }
    _isEndEntry(row) {
        let res = true;
        if (row.endsWith("}")) {
            // this can be true
            // but if is is the end of the entry it should have this string in the line ' - {'
            // this may brake when Tx Metadata is used
            if (row.indexOf(' - {') > -1) {
                res = true;
            } else {
                res = false;
            }
        } else {
            res = false;
        }
        return res;
    }

    _arrayContains(array, astring) {
        let res = false;
        if (array) {
            for (let i=0; i < array.length; i++) {
                if (array[i] == astring) {
                    res = true;
                    break;
                }
            }
        }
        return res;
    }

    _parseBoltLine(aRecord) {
        // && aRecord[0].indexOf(" id:") === -1
        // the length of the records is not reliable to determine if the log record
        // is from a version 4 database or a version 3 database, the query itself can have tabs in the query string
        // also the id in the query log is not reliable because Aura version 3.5 also has query IDS in it
        // now we check if the pos 4 starts with client then it is a version 4plus log record
        // however the version 4 log record has the query id in it
        // so we use that to determine the log record version
        // in version 4 it is now also possible to have an 'error' in the logging
        // let idPos = aRecord[0].indexOf(" id:");
        // let idQsIdPos = aRecord[0].indexOf("Query started: id:");
        // if (idPos > -1 || idQsIdPos > -1 ) {
        //     // console.log("_parseBoltLineV4Plus");
        //     return this._parseBoltLineV4Plus(aRecord);
        // } else {
        //     //(" 3 ");
        //     // console.log("_parseBoltLineV3");
        //     return this._parseBoltLineV3(aRecord);
        // }
        if (aRecord[4].startsWith("client")) {
            // console.log("_parseBoltLineV4Plus");
            return this._parseBoltLineV4Plus(aRecord);
        } else {
            //(" 3 ");
            // console.log("_parseBoltLineV3");
            return this._parseBoltLineV3(aRecord);
        }
    }
    _parseBoltLineV3(aRecord) {
        //
        // version 3.x
        //
        //console.log(aRecord);

        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        let field0fields = field0.split(" ");
        let baseindexje = 3;

        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        if (field0fields[1].indexOf("Z") > -1) {
            ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("Z"));
            baseindexje = baseindexje + 1;
        }

        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        qr.startOnly = (field0.indexOf("Query started:") > -1);

        // version 3.6 can also have a start Query field (log files from Aura)
        if (qr.startOnly && qr.startOnly == true) {
            qr.queryMillis = parseInt(this._getValueField0(field0, "Query started:"));
        } else {
            if (qr.logCategory.length == 5) {
                baseindexje = 2;
            }// ERROR
            if (field0.indexOf(" id:") > -1) {baseindexje = baseindexje + 2; }

            qr.queryMillis = parseInt(field0fields[baseindexje + 1]);
        }
        qr.planning = this._getValueField0(field0, "planning:");
        qr.waiting = this._getValueField0(field0,"waiting:");
        qr.cpu = this._getValueField0(field0,"cpu:");

        qr.mem = this._getValueField0(field0," B -");
        qr.pageHits = this._getValueField0(field0,"page hits");
        qr.pageFaults = this._getValueField0(field0,"page faults");
        qr.protocol = aRecord[1];
        // field 2
        qr.processId = aRecord[2];
        // field 3
        qr.driver = aRecord[3];
        // field 5
        qr.client = aRecord[5];
        qr.server = aRecord[6];

        // field 7 query
        // if we have the \t in the query string itself then (rarely occurs)
        //
        let field = "";
//        console.log("aRecord[6]; " + aRecord[6]);
        for (let i = 7 ; i < aRecord.length ; i++) {
            field += "" + aRecord[i];
        }
        let qrs = this._parseQueryPart(field);
        //console.log("1249 query part " + JSON.stringify(qrs) );

        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        // the db name is probably graph.db here
        qr.dbname = ""; // we keep it empty
        if (qrs.runtime) {
            qr.runtime = qrs.runtime;
        } else {
            qr.runtime = "";
        }
        let skipExplain = true;
        if (skipExplain === true) {
            if (qr.query.trim().toLowerCase().startsWith("explain")) {
                return null;
            }
        }

        return qr;
    }
    _getQueryId(aIdString) {
        return parseInt(aIdString.split(":")[1]);
    }

    _parseJSONLine(aRecord) {
        // console.log("_parseJSONLine: " + aRecord);
        let rec = JSON.parse(aRecord);
        let qr = this._createQRecord();
        qr.startOnly = (rec.event == "start");
        qr.error = (rec.event == "fail");
        qr.qid = rec.id;
        if (qr.qid > this.maxQueryId) this.maxQueryId = qr.qid;
        qr.logdate = rec.time;
        qr.logCategory = rec.level;
        qr.queryMillis = rec.elapsedTimeMs;
        qr.planning = this._ifUndefined(rec.planning, 0);
        qr.waiting = this._ifUndefined(rec.waiting,0);
        qr.cpu = this._ifUndefined(rec.cpu, 0);
        qr.mem = this._ifUndefined(rec.allocatedBytes,0);
        qr.pageHits = this._ifUndefined(rec.pageHits,0);
        qr.pageFaults = this._ifUndefined(rec.pageFaults,0);
        // source fields
        let sourceFields = rec.source.split("\t");
        //console.log(sourceFields);
        qr.protocol = this._ifUndefined(sourceFields[1],"embedded");
        qr.driver = sourceFields[2];
        qr.client = this._ifUndefined(sourceFields[4],"");
        qr.sessionType = sourceFields[0];
        qr.server = sourceFields[5];
        qr.neoUser = rec.username;
        qr.query = rec.query;
        if (qr.error === true) {
            // append the error below the query
            qr.query = qr.query + '\n ERROR: ' + rec.failureReason;
        }
        qr.params = rec.queryParameters;
        qr.txmeta = ""; // probably not visable in query log?
        qr.dbname = rec.database;
        qr.runtime = rec.runtime;
        qr.errorMessage = rec.failureReason;
        let skipExplain = true;
        if (skipExplain === true) {
            if (qr.query.trim().toLowerCase().startsWith("explain")) {
                return null;
            }
        }

        // console.log(qr);
        return qr;
    }
    _parseAuraJSONLine(aRecord) {
        // console.log("_parseJSONLine: " + aRecord);
        let rec = aRecord;
        let qr = this._createQRecord();
        qr.startOnly = (rec.event == "start");
        qr.error = (rec.event == "fail");
        qr.qid = rec.id;
        if (qr.qid > this.maxQueryId) this.maxQueryId = qr.qid;
        qr.logdate = rec.time;
        qr.logCategory = this._ifUndefined(rec.level,"");
        qr.queryMillis = rec.elapsedTimeMs;
        qr.planning = this._ifUndefined(rec.planning, 0);
        qr.waiting = this._ifUndefined(rec.waiting,0);
        qr.cpu = this._ifUndefined(rec.cpu, 0);
        qr.mem = this._ifUndefined(rec.allocatedBytes,0);
        qr.pageHits = this._ifUndefined(rec.pageHits,0);
        qr.pageFaults = this._ifUndefined(rec.pageFaults,0);
        // source fields
        let sourceFields = rec.source.split("\t");
        //console.log(sourceFields);
        qr.protocol = this._ifUndefined(sourceFields[1],"embedded");
        qr.driver = this._ifUndefined(sourceFields[2],"");
        qr.client = this._ifUndefined(sourceFields[4],"");
        qr.sessionType = sourceFields[0];
        qr.server = this._ifUndefined(sourceFields[5],"");
        qr.neoUser = rec.authenticatedUser;
        qr.query = rec.query;
        if (qr.error === true) {
            // append the error below the query
            qr.query = qr.query + '\n ERROR: ' + rec.failureReason;
        }
        qr.params = rec.queryParameters;
        qr.txmeta = rec.annotationData;
        qr.allocatedBytes = rec.allocatedBytes;
        qr.dbname = rec.database;
        qr.runtime = rec.runtime;
        qr.errorMessage = rec.failureReason;
        let skipExplain = true;
        if (skipExplain === true) {
            if (qr.query.trim().toLowerCase().startsWith("explain")) {
                // console.log("query with explain!")
                return null;
            }
        }

        // console.log(qr);
        return qr;
    }


    _ifUndefined(aValue, aAlternative) {
        if (aValue) {
            return aValue;
        } else {
            return aAlternative;
        }
    }

    _parseBoltLineV4Plus(aRecord) {
        //
        // version 4.x or Aura v3.5
        //
        let field0 = aRecord[0];

        let qr = this._createQRecord();
        // check if the query is finished a new 4.0 feature
        qr.startOnly = (field0.indexOf("Query started:") > -1);
        qr.error = (field0.indexOf(" ERROR ") > -1);

        qr.did = field0;

        let field0fields = field0.split(" ");
//        console.log(field0fields);
        qr.qid = -1;
        if (qr.startOnly === true) {
            qr.qid = this._getQueryId(field0fields[6]);
        } else {
            if (qr.error === true) {
                // completion with error
                qr.qid = this._getQueryId(field0fields[3]);
            } else {
                // normal completion
                qr.qid = this._getQueryId(field0fields[4]);
            }
        }
        if (qr.qid > this.maxQueryId) this.maxQueryId = qr.qid;
        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        let queryMillisIndex = 3;
        if (qr.startOnly && qr.startOnly == true) {
            if (field0.indexOf("transaction id:") > -1) {
                queryMillisIndex = this._getFieldIndex(field0fields, "transaction") + 3;
            } else {
                queryMillisIndex = this._getFieldIndex(field0fields, "started:") + 3;
            }
        } else {
            if (field0.indexOf("transaction id:") > -1) {
                queryMillisIndex = this._getFieldIndex(field0fields, "transaction") + 3;
            } else {
                queryMillisIndex = this._getFieldIndex(field0fields,"-") + 1;
            }
        }
//        console.log("queryMillis on index " + queryMillisIndex + " value>>" + field0fields[queryMillisIndex] + "<<:" +  parseInt(field0fields[queryMillisIndex]));
        qr.queryMillis = parseInt(field0fields[queryMillisIndex]);
        qr.planning = this._getValueField0(field0, "planning:");
        qr.waiting = this._getValueField0(field0,"waiting:");
        qr.cpu = this._getValueField0(field0,"cpu:");

        qr.mem = this._getValueField0(field0," B -");
        qr.pageHits = this._getValueField0(field0,"page hits");
        qr.pageFaults = this._getValueField0(field0,"page faults");
        qr.protocol = aRecord[1];

        // console.log(qr);
        // field 2 The processId is not known here? this is missing in the 7 lenth record
        qr.processId = "";
        // field 3
        qr.driver = aRecord[2];
        // field 5
        qr.client = aRecord[4];
        qr.server = aRecord[5];
        // field 7 query
        // if we have the \t in the query string itself then (rarely occurs)
        //
        let field = "";
        for (let i = 6 ; i < aRecord.length ; i++) {
            field += "" + aRecord[i];
        }
        let qrs = this._parseQueryPart(field);
        // if (qrs.neoDB == "<none>" && !qr.startOnly) {
        //     console.log(aRecord);
        //     console.log(qrs)
        // }
        //console.log(qrs);

        qr.neoUser = qrs.neoUser;
        if (qrs.query.trim() === "") {
            // fabric can have that
            qr.query = "fabric no query in log";
        } else {
            qr.query = qrs.query;
        }
        if (qrs.error.trim() !== "") {
            let errorMax = 500;
            if (qrs.error.trim().length > 500) {
                qr.query += "<br/>ERROR:" + qrs.error.substring(0,500)  + "...";
            } else {
                qr.query += "<br/>ERROR:" + qrs.error + "" ;
            }
            // until the first '.'
        }
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        qr.dbname = qrs.neoDB;
        qr.error = qrs.error;
        if (qrs.runtime) {
            qr.runtime = qrs.runtime;
        } else {
            qr.runtime = "";
        }
        let skipExplain = true;
        if (skipExplain === true) {
            if (qr.query.trim().toLowerCase().startsWith("explain")) {
                return null;
            }
        }

        return qr;
    }

    _getFieldIndex(fieldArray, name) {
        let ind = -1;
        for (let i = 0; i < fieldArray.length; i++) {
            if (fieldArray[i] === name) {
                return i;
            }
        }
        return ind;
    }
    _parseHttpLine(aRecord) {
        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        let field0fields = field0.split(" ");
        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        let findex = 4;
        if (field0.indexOf(" id:") > -1) {findex = 6; }
        qr.queryMillis = parseInt(field0fields[findex]);
        qr.planning = this._getValueField0(field0, "planning:");
        qr.waiting = this._getValueField0(field0,"waiting:");
        qr.cpu = this._getValueField0(field0,"cpu:");

        qr.mem = this._getValueField0(field0," B -");
        qr.pageHits = this._getValueField0(field0,"page hits");
        qr.pageFaults = this._getValueField0(field0,"page faults");
        qr.protocol = aRecord[1];
        // field 2
        qr.client = aRecord[2]; // clients ip number
        // qr.neoUser = aRecord[2];
        // field 3
        qr.driver = aRecord[3]; // db path
        // field 5
        // field 6 query
        let field = aRecord[4];
        // this field has the query and the parameters and the tx metadata
        // console.log("1377 parse query " + field);
        let qrs = this._parseQueryPart(field);
        //console.log("1557 query part " + JSON.stringify(qrs));

        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        qr.dbname = qrs.neoDB;
        if (qrs.runtime) {
            qr.runtime = qrs.runtime;
        } else {
            qr.runtime = "";
        }

        return qr;
    }
    _parseEmbeddedLine(aRecord) {
        //console.log("_parseEmbeddedLine");
        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        qr.startOnly = (field0.indexOf("Query started:") > -1);

        let field0fields = field0.split(" ");
        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];

        let queryMillisIndex = 3;
        if (qr.startOnly && qr.startOnly == true) {
            if (field0.indexOf("transaction id:") > -1) {
                queryMillisIndex = this._getFieldIndex(field0fields, "transaction") + 3;
            } else {
                queryMillisIndex = this._getFieldIndex(field0fields, "started:") + 3;
            }
        } else {
            if (field0.indexOf("transaction id:") > -1) {
                queryMillisIndex = this._getFieldIndex(field0fields, "transaction") + 3;
            } else {
                queryMillisIndex = this._getFieldIndex(field0fields,"-") + 1;
            }
        }
//        console.log("queryMillis on index " + queryMillisIndex + " value>>" + field0fields[queryMillisIndex] + "<<:" +  parseInt(field0fields[queryMillisIndex]));
        qr.queryMillis = parseInt(field0fields[queryMillisIndex]);
        qr.planning = this._getValueField0(field0, "planning:");
        qr.waiting = this._getValueField0(field0,"waiting:");
        qr.cpu = this._getValueField0(field0,"cpu:");

        qr.mem = this._getValueField0(field0," B -");
        qr.pageHits = this._getValueField0(field0,"page hits");
        qr.pageFaults = this._getValueField0(field0,"page faults");
        qr.sessionType = aRecord[1];
        //console.log("aRecord[1]: " + aRecord[1]);
        qr.protocol = "embedded"
        // field 2
        // qr.client = aRecord[2]; // clients ip number
        qr.client = "";
        // qr.neoUser = aRecord[2];
        // field 3
        qr.driver = "embedded-session"; //
        // field 5
        // field 6 query
        let field = aRecord[2];
        let qrs = this._parseQueryPart(field);
        // console.log("1606 query part " + JSON.stringify(qrs));

        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        qr.dbname = qrs.neoDB;
        if (qrs.runtime) {
           qr.runtime = qrs.runtime;
        } else {
           qr.runtime = "";
        }
        return qr;
    }


    _parseQueryPart(queryField) {
        let pDebug = false;
        // if (queryField.indexOf("Node(173)") > -1) {
        //     pDebug = true;
        // }
        if (pDebug == true) console.log("queryfield>>>" + queryField);

        let fieldsplitted = queryField.trim().split(' - {');
        // for (let a =0; a < fieldsplitted.length; a++) {
        //     console.log("fieldsSplitted " + a + " : " + fieldsplitted[a]);
        // }
        //
        // switching parameters on and off, switching runtime on and off can give tricky situations
        //
        if (pDebug == true) console.log("fieldsplitted>>>" + fieldsplitted);
        let neoDB = ""; // version 4 supports multi db
        let neoUser = "";
        let query;
        let params;
        let txmeta;
        let runtime;
        let error = "";
        // tx meta {} is always there and it is always the latest
        // entry of field splitted
        let txmetaFirst =  "{" + fieldsplitted[fieldsplitted.length -1];
        if (pDebug == true) console.log("txmetaFirst>>>" + txmetaFirst);

        // when there is an error than the error text is placed after the closing } of the txmeta
        // but there can be a closing } in the error text, bummer
        let bpos = this._findClosingCurlyBracketIndex(txmetaFirst, 0);
        txmeta = txmetaFirst.substring(0,bpos + 1);
        if (pDebug == true) console.log("txmeta>>>" + txmeta);

        error = txmetaFirst.substring(bpos + 1);
        if (error.indexOf("Query plan:") > -1 ) {
            // not an error but a query plan
            error = "";
        }
        if (pDebug == true) console.log("error>>>" + error);
        let paramsExist = (fieldsplitted.length == 3);
        if (paramsExist) {
            // there are parameters specified this string could however also contain a runtime information
            params = "{" + fieldsplitted[1];
            let bpos2 = params.lastIndexOf("}");
            runtime = params.substring(bpos2 + 1);
            if (runtime.indexOf("runtime=") > -1 ) {
                runtime = runtime.substring(runtime.indexOf("runtime=") + 8);
            }
            params = params.substring(0, bpos2 + 1);
        }
        // Process now the query part
        let firstPart = fieldsplitted[0].split(" - ");
        // this is tricky in the cypher statement a ' - ' sign can be there in calculation
        // then we have to check if the value has a space in it, a cypher statement always
        // has a space in it, a username or a db name not
        // console.log("firstpart splitted on  -  " );
        // console.log(firstPart);
        let qry = "";
        let secondValue = "";
        let partslength = firstPart.length;
        let firstValue = firstPart[0].trim();
        if (partslength == 1) {
            //console.log(firstValue);
            if (firstValue.startsWith("- ")) {
                query = firstValue.substring(1).trim();
            } else {
                query = firstValue;
            }
        } else {
            secondValue = firstPart[1].trim();
            if (secondValue.indexOf(" ") > -1) {
                // this is a cypher statement Maybe the beginning of
                // this means that the firstValue is the neo4j User
                neoUser = firstValue;
                qry = secondValue;
                // if there are ' - ' signs in the cypher query this must be constructed again
                if (partslength > 2) {
                    for (let i=2; i < partslength; i++) {
                        if (firstPart[i].indexOf("runtime=") == -1) {
                            qry += ' - ' + firstPart[i];
                        } else {
                            // there is a runtime detected we should stop aopending cypher here
                            // this is only the case when parameter logging is false and runtime logging is true
                            runtime = firstPart[i].substring(firstPart[i].indexOf("runtime=") + 8);
                            break;
                        }
                    }
                }
                query = qry;
            } else {
                // no cypher statement
                // this means that the second is the user, the first is the database
                neoDB = firstValue;
                neoUser = secondValue;
                if (partslength > 2) {
                    qry = firstPart[2].trim();
                    if (partslength > 3) {
                        for (let i=3; i < partslength; i++) {
                            if (firstPart[i].indexOf("runtime=") == -1) {
                                qry += ' - ' + firstPart[i];
                            } else {
                                // there is a runtime detected we should stop aopending cypher here
                                // this is only the case when parameter logging is false and runtime logging is true
                                runtime = firstPart[i].substring(firstPart[i].indexOf("runtime=") + 8);
                                break;
                            }
                        }
                    }
                }
                query = qry;
            }
        }
        return {neoUser: neoUser, query: query, params: params , txmeta: txmeta, neoDB: neoDB, error: error, runtime: runtime};
    }

     _findClosingCurlyBracketIndex(str, pos) {
        if (str[pos] !== '{') {
            throw new Error('The position must contain an opening bracket');
        }
        let level = 1;
        for (let index = pos + 1; index < str.length; index++) {
            if (str[index] === '{') {
                level++;
            } else if (str[index] === '}') {
                level--;
            }
            if (level === 0) {
                return index;
            }
        }
        return -1;
    }

    _getValueField0(s, name) {
        let r = 0;
        let namePos = s.indexOf(name);
        if (namePos > -1) {
            let left = name.indexOf(":") > -1;
            if (left == true) {
                let commaPos = s.indexOf(",", namePos);
                let haakjePos = s.indexOf(")", namePos);
                if (commaPos < haakjePos && commaPos > -1) {
                    let valString = s.substring(namePos + name.length, commaPos);
                    r = parseInt(valString.trim());
                } else if (commaPos > haakjePos && haakjePos > -1) {
                    let valString = s.substring(namePos + name.length , haakjePos);
                    r = parseInt(valString.trim());
                }
            } else {
                if (name == " B -" || name == "page hits") {
                    let fp = s.substring(0, namePos);
                    let dashPos = fp.lastIndexOf(" - ")
                    if (dashPos > -1) {
                        let valString = fp.substring(dashPos + 3)
                        r = parseInt(valString.trim());
                    }
                } else {
                    let fp = s.substring(0, namePos);
                    let dashPos = fp.lastIndexOf(", ");
                    if (dashPos > -1) {
                        let valString = fp.substring(dashPos + 2);
                        r = parseInt(valString.trim());
                    }
                }
            }
        }
        return r;
    }

    _createQueryStat() {
        return { query: ""
            , dbname: ""
            , srv: ""
            , count: 0
            , totalMillis : 0
            , avgTime : 0
            , maxTime : 0
            , minTime : 0
            , totalCPU : 0
            , avgCPU : 0
            , minCPU : 0
            , maxCPU : 0
            , totalPlanning : 0
            , minPlanning : 0
            , maxPlanning : 0
            , avgPlanning : 0
            , totalWaiting : 0
            , minWaiting : 0
            , maxWaiting : 0
            , avgWaiting : 0
            , totalMem : 0
            , maxMem : 0
            , minMem : 0
            , avgMem : 0
            , avgHitRatio : 0
            , minHitRatio : -1
            , maxHitRatio : -1
            , totalHitRatio : 0
            , cacheLogging : false
            , minLogTime : 0
            , maxLogTime : 0
            , protocols : []
            , clients : []}

    }

    _createQRecord() {
        return { did : ""
            ,logdate: ""
            ,logCategory : ""
            ,queryMillis : 0
            ,planning : 0
            ,cpu : 0
            ,waiting : 0
            ,mem : 0
            ,pageHits : 0
            ,pageFaults : 0
            ,sessionType : ""
            ,processId : ""
            ,protocol : ""
            ,neoUser : ""
            ,driver : ""
            ,client : ""
            ,query : ""
            ,params: ""
            ,txmeta: ""
            ,startOnly : false
            ,error: false
            ,errorMessage: ''}
    }









}