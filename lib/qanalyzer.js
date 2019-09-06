'use strict';


class QueryAnalyzer {

	
    constructor() {
        if (window.neo4jDesktopApi) {
            window.neo4jDesktopApi.showMenuOnRightClick(false);
        }
        console.log("QueryAnalyze initialized");
	}
	init() {
    }

    // instead of java we could make a javascript routine to
    // build the json structure?
    analyseFile(aFileString) {
	    this.log = [];
	    this.ana = [];
        let appLogFile = document.getElementById("appLogFile");
        appLogFile.innerHTML = ""; // clear
        let appSummary = document.getElementById("appSummary");
        appSummary.innerHTML = ""; // clear

        let summary = "summary here";
        appSummary.innerHTML = summary;
        //
        // analyzing log file
        //
        this.ana = this._analyseLog(aFileString.match(/^.*([\n\r]+|$)/gm));
        appSummary.innerHTML = this._buildSummary();
        msg.innerHTML = this.log.length + " queries analysed, " + this.ana.length+ " distinct queries found.<br/> queries from " + (new Date(this.minLogTime)).toUTCString() + " to " + (new Date(this.maxLogTime)).toUTCString()  ;
        this._initQueryLog();
        this._analyseQueriesPerMinuteUnit(); // first is 5 minutes

    }
    _initQueryLog(){
        let appLogFile = document.getElementById("appLogFile");
        appLogFile.innerHTML = "<button class='compact ui mini button' onClick='qan._showLogLoading()'>Show Query Log</button> Note this can take some time when there a lot queries in the log";
    }

    _analyseLog(logLines) {
        this.minLogTime = 0;
        this.maxLogTime = 0;
        let curLine = "";
        let map = new Map();
        for (let ri = 0; ri < logLines.length; ri++ ) {

            let row = logLines[ri].trim();
            if (this._isEndEntry(row)) {
                //  log entry
                curLine += row + " ";
                let record = curLine.trim().split("\t");

                curLine = "";
                if (record.length == 8 || record.length == 5 || record.length == 3 || record.length == 7 ) {


                    let qrec = '';
                    if (record[1] == "bolt") {
                        qrec = this._parseBoltLine(record);
                    } else if (record[1] == "http"){
                        qrec = this._parseHttpLine(record);
                    } else {
                        qrec = this._parseEmbeddedLine(record);
                    }
                    // console.log(record);
                    // console.log(qrec);
                    // determining minLogTime and maxLogTime
                    let d = new Date(qrec.logdate);
                    if (this.minLogTime == 0 && this.maxLogTime == 0) {
                        this.minLogTime = d.getTime();
                        this.maxLogTime = d.getTime();
                    } else {
                        if (d.getTime() < this.minLogTime) this.minLogTime = d.getTime();
                        if (d.getTime() > this.maxLogTime) this.maxLogTime = d.getTime();
                    }
                    this.log.push(qrec);
                    let qs = this._createQueryStat();
                    let qskey = qrec.dbname + qrec.query;
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

                    map.set(qskey, qs);
                } else {
                    console.log("WARN unexpected record length" + record.length);
                    console.log(record);
                }
            } else {
                // multiline log entry
                curLine += row + " ";
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

        return pana;
    }


    _orderSummaryColumn(property) {
        console.log("_orderQueryCount()");
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
        console.log("1c");
        this.ana.sort(function(a,b) {
            let a_ =  a[property];
            let b_ =  b[property];
            console.log("a_ " + a_ + " b_ " + b_ );
            if (orderASC) {
                if (a_ < b_) return -1;
                if (a_ > b_) return 1;
            } else {
                if (a_ < b_) return 1;
                if (a_ > b_) return -1;
            }
            return 0;
        });
        let appSummary = document.getElementById("appSummary");
        appSummary.innerHTML = ""; // clear
        appSummary.innerHTML  = this._buildSummary();
        // count_OrderIcon
        let iconElm = document.getElementById(property + "_OrderIcon");
        let iconclass = "caret down icon";
        if (orderASC) {
            iconclass = "caret up icon";
        }
        let curHTML = iconElm.innerHTML + "<i class='" + iconclass +  "'></i>";
        iconElm.innerHTML = curHTML;
    }


    _buildSummary() {
        let anas = this.ana;
        let contents = "";
        // start table
        contents+= "<table class='summary_table'>";
        // table header
        contents+= "<thead><tr>";
        contents+= "<th id='count_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"count\");'>Query Count</th>"
        contents+= "<th id='avgTime_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgTime\");'>Avg Time</th>"
        contents+= "<th>Min Time</th>"
        contents+= "<th>Max Time</th>"
        contents+= "<th id='avgCPU_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgCPU\");'>Avg CPU</th>"
        contents+= "<th id='maxPlanning_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"maxPlanning\");'>Max Planning</th>"
        contents+= "<th id='avgWaiting_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgWaiting\");'>Avg Waiting</th>"
        contents+= "<th id='avgHitRatio_OrderIcon' style='cursor : pointer' onClick='qan._orderSummaryColumn(\"avgHitRatio\");'>Cache Hits</th>"
        contents+= "<th id='avgMem_OrderIcon' style='cursor : pointer' class='hover' onClick='qan._orderSummaryColumn(\"avgMem\");'>Avg Mem (K)<div class='tooltipth'>The cumulative heap memory usage of a query in KB</div></th>"
        contents+= "<th>Protocols - Clients</th>"
        contents+= "</tr></thead><tbody>";
        let rowbackground = false;
        for (let i = 0 ; i < anas.length; i++) {
            let dta = anas[i];
            // two rows are used here
            // second row 2 columns

            // tabular values row
            if (rowbackground) {
                contents += "<tr style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
            } else {
                contents += "<tr style='border-top: 1px solid lawngreen '>";
            }
            contents += "<td><div class='ui two column grid'><div class='row'><div class='column'>" + dta.count + "</div>" + this._getDBNameFormatted(dta) + "</div></div></td>";
            contents += "<td>" + Math.round(dta.avgTime) + "</td>";
            contents += "<td>" + dta.minTime + "</td>";
            contents += "<td>" + dta.maxTime + "</td>";
            contents += "<td class='hover'>" + Math.round(dta.avgCPU) + "<div class='tooltip'>min:" + dta.minCPU + " max:" + dta.maxCPU + "</div></td>";
            contents += "<td class='hover'>" + dta.maxPlanning + "<div class='tooltip'>min:" + dta.minPlanning + " avg:" + Math.round(dta.avgPlanning)+ "</div></td>";
            contents += "<td class='hover'>" + Math.round(dta.avgWaiting) + "<div class='tooltip'>min:" + dta.minWaiting + " max:" + dta.maxWaiting + "</div></td>";
            if (dta.cacheLogging) {
                contents += "<td class='hover'>" + Math.round(dta.avgHitRatio) + "<div class='tooltip'>min:" + Math.round(dta.minHitRatio) + " max:" + Math.round(dta.maxHitRatio) + "</div></td>";
            } else {
                contents += "<td> </td>";
            }
            contents += "<td class='hover'>" + Math.round(dta.avgMem/1024) + "<div class='tooltip'>min:" + Math.round(dta.minMem/1024)+ " max:" + Math.round(dta.maxMem/1024) + "</div></td>";
            contents += "<td>" + this._arrayToHtml(dta.protocols) + "</td>";
            contents += "</tr>";

            // query row
            if (rowbackground) {
                contents += "<tr valign='top' style='background-color: #DDD;'>";
            } else {
                contents += "<tr valign='top'>";
            }
            contents += "<td><div class='ui inverted green icon buttons'><button title='Filter' class='ui button' onClick='qan._showFilteredLog(" + i + ", false);'><i class='filter icon'></i></button>";
            contents += "<button class='ui button' title='Highlight' onClick='qan._showFilteredLog(" + i + ", true);'><i class='lightbulb outline icon'></i></button>";
            contents += "<button class='ui button' title='Timeline' onClick='qan._showQueryTimeline(" + i + ");'><i class='chart bar outline icon'></i></button>";
            if (dta.dbname && dta.dbname.length > 0) {
                if (dta.dbname != "system") {
                    contents += "<button class='ui button' title='Explain' onClick='qan._explainQuery(" + i + ");'><i class='vertically flipped sitemap icon'></i></button>";
                }
            } else {
                contents += "<button class='ui button' title='Explain' onClick='qan._explainQuery(" + i + ");'><i class='vertically flipped sitemap icon'></i></button>";
            }
            contents += "</div><br/>";
            if (dta.count == 1) {
                contents += "<div style='font-size: 0.8em'><b>" + this._formatDate(dta.minLogTime) + "</b></div></td>"
            } else {
                contents += "<div style='font-size: 0.8em'><b>" + this._formatDate(dta.minLogTime) + "</b> to <b>" + this._formatDate(dta.maxLogTime) + "</b></div></td>"
            }
                contents += "<td colspan='8'><div style='font-family: monospace ; font-size: .9em; width: 1000px; word-wrap : normal'>" + this._formatCypher(dta.query) + "</div></td>";
               // contents += "<td><div style='font-family: monospace ; font-size: .9em; width: 1000px; word-wrap : normal'>" + dta.dbname + "</div></td>";
            if (dta.clients && dta.clients.length > 2) {
                contents += "<td><div style='font-size: .9em; width: 200px; word-wrap : normal'>" + this._arrayToHtml(dta.clients.slice(0,2))+ "<button class='compact ui teal basic button' onClick='qan._showClients(" + i + ");'>show all " + dta.clients.length + " clients</button></div><div id='clientsdiv_" + i + "'></div></td>";
            } else {
                contents += "<td><div style='font-size: .9em; width: 200px; word-wrap : normal'>" + this._arrayToHtml(dta.clients)+ "</div></td>";
            }
            contents += "</tr>";
            rowbackground = !rowbackground;
        }

        // end table body
        contents += "</tbody></table>";
        // end table
        return contents;
    }
    _getDBNameFormatted(dta) {
        if (dta.dbname && dta.dbname.length > 0) {
            return "<div class='column'><div class='ui left pointing basic label'><i class='database icon'></i>" + dta.dbname + "</div></div>";
        } else {
            return "";
        }
    }

    _explainQuery(aInd) {

        let dta = this.ana[aInd];
        let dbname = dta.dbname;
        let query = dta.query;
        // find the first parameter set for this query.
        let params = this._getParametersFromLog(dbname, query);

        querylistapp.showQueryModal (query, params, dbname);
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
        querylistapp.showQueryModal (query, params, dta.dbname);
    }

    _doFilter(dta, aQuery, aDbname) {
        let doit = false;
        if (aDbname && aDbname.length > 0) {
            doit = dta.dbname == aDbname && dta.query.indexOf(aQuery) == 0;
        } else {
            doit = dta.query.indexOf(aQuery) == 0;
        }
        return doit;
    }

    _buildQueryLog(index, showAll){
        let appLogFile = document.getElementById("appLogFile");
        appLogFile.innerHTML = "";
        let applyFilter = false;
        let showall = false;
        let contents = "";
        let bQueryFilter = "";
        let filterDb = "";

        if (showAll) showall = showAll;
        if (index > -1) {
            applyFilter = true;
            bQueryFilter = this.ana[index].query;
            if (this.ana[index].dbname && this.ana[index].dbname.length > 0) {
                filterDb = this.ana[index].dbname;
            }
        }
        contents += "<div class='ui message' style='width: 15950px;'><div class='header'>";
        if (applyFilter) {
            let dbstr = "";
            if (filterDb.length > 0) {
                dbstr = filterDb + ":> ";
            }
            if( showall) {
                contents += "Use tab/shift-tab to navigate the marked query lines, marked with filter: <p>"+ dbstr + this._formatCypher(bQueryFilter);

            } else {
                contents += "Use tab/shift-tab to navigate the query lines, showing only queries with filter: <p>"+ dbstr + this._formatCypher(bQueryFilter);
            }
        } else {
            contents += "Showing all queries in log.<p>";
        }
        contents += "</p></div></div>";

        // start table
        contents+= "<table class='ql_table'>";
        // table header
        contents+= "<thead><tr>";
        contents+= "<th>logDate</th>"
        contents+= "<th>queryMillis</th>"
        contents+= "<th>planning</th>"
        contents+= "<th>cpu</th>"
        contents+= "<th>waiting</th>"
        contents+= "<th>pageHits</th>"
        contents+= "<th>pageFaults</th>"
        contents+= "<th>Mem (K)</th>"
        contents+= "<th>sessionType</th>"
        contents+= "<th>neoDB</th>"
        contents+= "<th>neoUser</th>"
        contents+= "<th>driver</th>"
        contents+= "<th>client</th>"
        contents+= "<th>params</th>"
        contents+= "<th>txmeta</th>"
        contents+= "<th>query</th>"
        contents+= "</tr></thead><tbody>";
        let rowbackground = false;
        let tindex = 10;
        for (let i = 0; i < this.log.length; i++) {
            let dta = this.log[i];
            let isFiltered = false;
            if (applyFilter) {
                if (this._doFilter(dta,bQueryFilter,filterDb)) {
                    if (rowbackground) {
                        contents += "<tr valign='top' tabindex='" + tindex + "' style='border-top: 1px solid lawngreen; background-color: #ffff66; '>";
                    } else {
                        contents += "<tr valign='top' tabindex='" + tindex + "' style='border-top: 1px solid lawngreen;background-color: #ffff80; '>";
                    }
                    isFiltered = true;
                    tindex++;
                } else {
                    if (!showall) {
                        continue;
                    } else {
                        if (rowbackground) {
                            contents += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
                        } else {
                            contents += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
                        }
                    }
                }
            } else {
                if (rowbackground) {
                    contents += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
                } else {
                    contents += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
                }
            }
            contents += "<td onClick='qan._explainCurrentQuery(" + i + ");' >" + dta.logdate + "</td>";
            contents += "<td>" + dta.queryMillis + "</td>";
            contents += "<td>" + dta.planning + "</td>";
            contents += "<td>" + dta.cpu + "</td>";
            contents += "<td>" + dta.waiting + "</td>";
            contents += "<td>" + dta.pageHits + "</td>";
            contents += "<td>" + dta.pageFaults + "</td>";
            contents += "<td>" + Math.round(dta.mem/1024) + "</td>";
            contents += "<td>" + dta.sessionType + "</td>";
            contents += "<td>" + dta.dbname + "</td>";
            contents += "<td>" + dta.neoUser + "</td>";
            contents += "<td>" + dta.driver + "</td>";
            contents += "<td>" + dta.client + "</td>";
            contents += "<td><div style='width: 300px; word-wrap : normal'>" + dta.params + "</div></td>";
            contents += "<td><div style='width: 200px; word-wrap : normal'>" + dta.txmeta + "</div></td>";

            contents += "<td><div style='width: 15400px; word-wrap : normal'>";
            contents += "<i class='inverted green sun outline icon' title='Explain' onClick='qan._explainCurrentQuery(" + i + ");'></i>";
            if (isFiltered) {
                contents += "see above";
            } else {
                contents += this._formatCypher(dta.query) ;
            }
            contents+= "</div></td>"

            contents += "</tr>";
            rowbackground = !rowbackground;
        }

        // end table body
        contents += "</tbody></table>";

        appLogFile.innerHTML = contents;
        return true;

    }


    _showClients(anId) {
        let div = document.getElementById("clientsdiv_" + anId);
        if (div) {
            $('.ui.modal').remove(); // clear any existing modal
            div.innerHTML = "";
            let html = "";
            html += "<div class='ui large modal'>";
            html += "<i class=\"close icon\"></i>";
            html += "  <div class=\"header\">Clients</div>" ;
            html += "  <div class=\"content\">";

            html += this._arrayToGrid(this.ana[anId].clients);
            html += "    </div></div>";
            div.innerHTML = html;

            $('.ui.modal').modal('show');


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

    _formatCypher(aText) {
        // split text in words
        let keywords = new Array("<>",">=","<=","<",">","!=","=","not","unique", "distinct","match","set","then","using","optional","index","remove","merge","on","create","delete","detach","return","from","where","with","skip","limit","call","yield","foreach","case","when","else","end","or","as","and","union", "all", "order", "by", "unwind", "desc", "asc","explain" );
        let res = "";
//        let hlcolor = "#919A78"; #00ff00, #63B345
        let hlcolor = "#2db300";

      //  let hlcolor = "lawngreen";
        aText = aText.replace(/\n/g, " ");
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

        return res;
    }

    _prepareWord(word) {
        let w = word;
        if (word.startsWith("'")) {
            w = word.substring(1);
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
        this._buildQueryLog(index, showAll);
        $('.menu .item').tab("change tab", "second");
        $("tr[tabindex=10]").focus();
    }

    _showLogLoading() {
        this._buildQueryLog();
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
        if (index > -1) {
            filterQuery = true;
            this.lastTimeLineQuery = index;
            aQuery = this.ana[index].query;
        } else {
            if (this.lastTimeLineQuery > -1) {
                aQuery = this.ana[this.lastTimeLineQuery].query;
                filterQuery = true;
            }
        }
        if (filterQuery) {
            qtqShowAll.classList.remove("disabled");
        } else {
            qtqShowAll.classList.add("disabled");
        }
        let qtq = document.getElementById("qtq");
        qtq.innerHTML = "";
        let qtqContent = "";
        qtqContent += "<div class='ui message' style='width: 100%;'><div class='header'>";
        // query.indexOf(bQueryFilter) > -1
        if (filterQuery) {
            qtqContent += "Showing timeline for query: <p>" + this._formatCypher(aQuery);
        } else {
            qtqContent += "Using all queries in log.<p>";
        }
        qtqContent += "</p></div></div>";
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
            let d = new Date(qr.logdate);
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
        if (aRecord.length == 8) {
            return this._parseBoltLine8(aRecord);
        } else {
            return this._parseBoltLine7(aRecord);
        }
    }
    _parseBoltLine8(aRecord) {
        //
        // version 3.x
        //
        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        let field0fields = field0.split(" ");
        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        let baseindexje = 3;
        if (qr.logCategory.length == 5)
        {
            baseindexje = 2;
        }// ERROR
        qr.queryMillis = parseInt(field0fields[baseindexje + 1]);

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
        let field = aRecord[7];
        let qrs = this._parseQueryPart(field);
        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        // the db name is probably graph.db here
        qr.dbname = ""; // we keep it empty

        return qr;
    }

    _parseBoltLine7(aRecord) {
        //
        // version 4.x
        //
        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        let field0fields = field0.split(" ");

        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        let baseindexje = 3;
        if (qr.logCategory.length == 5)
        {
            baseindexje = 2;
        }// ERROR
        qr.queryMillis = parseInt(field0fields[baseindexje + 1]);
        qr.planning = this._getValueField0(field0, "planning:");
        qr.waiting = this._getValueField0(field0,"waiting:");
        qr.cpu = this._getValueField0(field0,"cpu:");

        qr.mem = this._getValueField0(field0," B -");
        qr.pageHits = this._getValueField0(field0,"page hits");
        qr.pageFaults = this._getValueField0(field0,"page faults");
        qr.protocol = aRecord[1];
        // field 2 The processId is not known here? this is missing in the 7 lenth record
        qr.processId = "";
        // field 3
        qr.driver = aRecord[2];
        // field 5
        qr.client = aRecord[4];
        qr.server = aRecord[5];
        // field 7 query
        let field = aRecord[6];
        let qrs = this._parseQueryPart(field);
        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        qr.dbname = qrs.neoDB;

        return qr;
    }


    _parseHttpLine(aRecord) {
        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        let field0fields = field0.split(" ");
        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        qr.queryMillis = parseInt(field0fields[4]);
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
        let qrs = this._parseQueryPart(field);
        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        qr.dbname = qrs.neoDB;
        return qr;
    }

    _parseEmbeddedLine(aRecord) {
        let field0 = aRecord[0];
        let qr = this._createQRecord();
        qr.did = field0;
        let field0fields = field0.split(" ");
        let ds = field0fields[0] + " " + field0fields[1].substring(0,field0fields[1].indexOf("+"));
        qr.logdate = ds;
        qr.logCategory = field0fields[2];
        qr.queryMillis = parseInt(field0fields[4]);
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
        qr.neoUser = qrs.neoUser;
        qr.query = qrs.query;
        qr.params = qrs.params;
        qr.txmeta= qrs.txmeta;
        qr.dbname = qrs.neoDB;
        return qr;
    }


    _parseQueryPart(queryField) {
        let fieldsplitted = queryField.trim().split(' - {');
        let neoDB = ""; // version 4 supports multi db
        let neoUser = "";
        let query;
        let params;
        let txmeta;
        // tx meta
        txmeta =  "{" + fieldsplitted[2];
        params = "{" + fieldsplitted[1];
        // split no on
        let firstPart = fieldsplitted[0].split(" - ");
        if (firstPart.length == 3) {
            neoDB = firstPart[0];
            neoUser = firstPart[1];
            query = firstPart[2]; // we have to measure distinct queries per database
        } else {
            let firstDashPos = fieldsplitted[0].indexOf("- ");
            query = fieldsplitted[0].substring(firstDashPos + 1).trim();
            if (firstDashPos > 0) {
                neoUser = fieldsplitted[0].substring(0, firstDashPos).trim();
            }
        }
        return {neoUser: neoUser, query: query, params: params , txmeta: txmeta, neoDB: neoDB};
    }



    _getValueField0(s, name) {
        let r = 0;
        let namePos = s.indexOf(name);
        if (namePos > -1) {
            let left = name.indexOf(":") > -1;
            if (left) {
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
            ,txmeta: ""}
    }









}