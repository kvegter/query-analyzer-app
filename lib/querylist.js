'use strict';


class QueryList {

    constructor(desktopAPI) {
        this.elMessage =  document.getElementById("curQueriesMessage");
        this.elTraceMessage =  document.getElementById("curTraceQueriesMessage");
        this.currentQueriesMap = new Map();
        this.traceQueriesMap = new Map();
        this.traceOrder = new Map();


        if (desktopAPI) {
            this.dapi = desktopAPI;
            this.dapi.showMenuOnRightClick(false); // prevent annoying default menu
//        this.elQueryListApp = document.getElementById("queryListApp");
            this.qans = new QueryAnalyzer();
        } else {
            // this.elMessage =  document.getElementById("curQueriesMessage");
            // this.elMessage.innerHTML = "no desktop initialized...";
        }
        //console.log("Query List initialized")
    }

    async init() {
        let prms;
        if (nac.neoConnection && nac.neoConnection == true) {

            this.elMessage.innerHTML = "";
            // console.log("User " + nac.neoUser + " is connected to server " + nac.neoHost + " with version " + nac.neodb.version);
            this.prepareLists(this);
            this.qans = new QueryAnalyzer();
            if (nac.neodb.majorVersion > 3 || (nac.neodb.majorVersion == 3 && nac.neodb.minorVersion > 4)) {
                if (!nac.neodb.isAura) {
                    this.elTraceMessage.innerHTML = "";
                    this.prepareTrace();
                } else {
                    this.elTraceMessage.innerHTML = "<div class='ui segment'> This functionality is not available on Aura, use 'Current Queries' to get the latest query information</segment>";
                }
            }
        }
        return prms;
    }

    prepareTrace() {
        let dbnames = [];
        let traceApp = document.getElementById("traceQueryApp");
        let html = "";
        if (nac.neodb.majorVersion > 3  || nac.neodb.isCluster) {
            for (let i = 0; i < nac.neodb.databasenames.length; i++) {
                let dbinfo = nac.neodb.databasenames[i];
                if ( !dbinfo.startsWith( "system") && dbinfo.name != nac.neodb.fabricDatabaseName) {
                    dbnames.push(dbinfo);
                }
            }
            // console.log(dbnames);

            let hh = "";
            // TAB header
            hh += "<div class='ui top attached tabular menu' ><div id='qj-tabs'>";
            let act = "active ";
            for (let a = 0; a < dbnames.length; a++) {
                let ldr = "";
                if (this._isLeader(dbnames[a])) {
                    ldr = "blue ";
                }

                hh += "<a class='" + act + "item' data-tab='tqt_" + dbnames[a] +  "'><i class='"+ ldr +"database icon'></i>" + dbnames[a] + "</a>";
                act = "";
            }
            hh += "</div></div>";
            act = "active ";
            for (let a = 0; a < dbnames.length; a++) {
                hh += this._getTraceQueriesSegment('tqldbna_' + dbnames[a], dbnames[a], true, act);
                act = "";
            }
//            console.log(hh);
            traceApp.innerHTML = hh;
        } else {
            let app = "traceQueryApp";
            // no multi db, database name = '__'
            traceApp.innerHTML = this._getTraceQueriesSegment("tqldbna___","__",false, '');
        }
        $('.menu .item')
            .tab()
        ;

    }

    _isLeader(adbname) {
        let il = false;
        // if the dbname contains an '@' then we have to split on it.
        if (adbname != undefined && adbname.indexOf('@') > -1 ) {
            let sp = adbname.split('@');
            console.log(sp);
            let dbn = sp[0];
            let srv = sp[1];
            il = nac.isLeader(srv,dbn);
        }
        return il;
    }
    prepareLists(current) {
        // check it the db version is greater then 3
        let dbnames = [];
        let app = "queryListApp";
        let elm = document.getElementById(app);
        elm.innerHTML = "";
        if (nac.neodb.majorVersion > 3 || nac.neodb.isCluster) {
            for (let i = 0; i < nac.neodb.databasenames.length; i++) {
                let dbinfo = nac.neodb.databasenames[i];
                if ( !dbinfo.startsWith( "system") && dbinfo.name != nac.neodb.fabricDatabaseName) {
                    dbnames.push(dbinfo);
                }
            }
            let hh = "";
            // TAB header
            hh += "<div class='ui top attached tabular menu'><div id='qj-tabs'>";
            let act = "active ";

            for (let a = 0; a < dbnames.length; a++) {
                let ldr = "";
                if (this._isLeader(dbnames[a])) {
                    ldr = "blue ";
                }
                hh += "<a class='" +act + "item' data-tab='cqt_" + dbnames[a] +  "'><i class='" + ldr + "database icon'></i>" + dbnames[a] + "</a>";
                act = "";
            }
            hh += "</div></div>";
            act = "active ";
            for (let a = 0; a < dbnames.length; a++) {
                //console.log(" getQuerieSegment " + dbnames[a]);
                hh += current._getQueriesSegment('qldbna_' + dbnames[a], dbnames[a], true, act);
                act = "";
            }
            // console.log(hh);
            elm.innerHTML = hh;

        } else {
            // this is not a multi database database so the database __ is used
            elm.innerHTML = current._getQueriesSegment(app + "_level","__",false, '');
        }
        $('.menu .item')
            .tab()
        ;

    }

    _clearTraceRecords(adbname) {
        let dbname = "-";
        if (adbname && adbname != "") {
            dbname = adbname;
        }
        if (this.traceQueriesMap.has(dbname)) {
            this.traceQueriesMap.delete(dbname);
        }
    }
    _setTraceRecords(adbname, arecordArray) {
        let dbname = "__";
        if (adbname && adbname != "" && dbname != null) {
            dbname = adbname;
        }
        this.traceQueriesMap.set(dbname, arecordArray);
    }

    _getTraceRecords(adbname) {
        if (this.traceQueriesMap.has(adbname)) {
            return this.traceQueriesMap.get(adbname);
        } else {
            return [];
        }

    }


    async traceQueries(container, dbname) {
        let app = document.getElementById(container);
        // console.log(app.getBoundingClientRect());
        let topPosition = app.getBoundingClientRect().top;
        let tabHeight = 890 - topPosition;
        app.style="height: ' + tabHeight + 'px; width:1650px; overflow: hidden; margin: 0px;"
        app.innerHTML = "";
        if (nac.neodb.isAdmin == false) {
            app.innerHTML = "This function is only available if you have database admin rights";
        }


        // app it the container
        let query = 'call db.stats.retrieve("QUERIES")';
        let session = nac.getReadSession(dbname);
        let dbn = "__";
        let srv = "";
        if (dbname && dbname != "") {
            if (dbname.indexOf("@") > -1) {
                dbn = dbname.split("@")[0];
                srv = dbname.split("@")[1];
            } else {
                dbn = dbname;
            }
        }
        let rs = await nac.runQuery(session, query);
//        console.log(rs);
        let records = [];
        this._clearTraceRecords(dbn);
        let current = this;
        let rc=0;
        rs.records.forEach(function(record) {
            let data = record.get("data");
            data.rc = rc;
            data.srv = srv;
            rc++;
            data = current._addTotals(data);
            records.push(data);
        });
        session.close();
        // sorting
        records.sort(function(a,b) {
            let a_ =  (a.invocationSummary.compileTimeInUs.avg + a.invocationSummary.executionTimeInUs.avg) * a.invocationSummary.invocationCount ;
            let b_ =  (b.invocationSummary.compileTimeInUs.avg + b.invocationSummary.executionTimeInUs.avg) * b.invocationSummary.invocationCount ;
            if (a_ < b_) return 1;
            if (a_ > b_) return -1;
            return 0;
        });

        this._setTraceRecords(dbn, records);
        // app.innerHTML = this._buildTraceTable(dbn, records);
        this._buildTraceTable(container, dbn, records);

    }
    _buildTraceTable(container, dbn, records) {
        // building html
        let app = document.getElementById(container);
        let topPosition = app.getBoundingClientRect().top;
        let fxHeight = 845 - topPosition ;

        let config = { subContainerWidth: 1650
            , height : fxHeight
            , columns: [{ name: "&nbsp;", size: 100}
                        ,{ name: "count", size: 70}
                        ,{ name: "last Invocation", size: 150
                              , thAttributes: "id='invocationSummary.invocationCount_OrderIconTrace_" + dbn + "' style='cursor : pointer' onClick='querylistapp._orderTraceColumn(\"invocationSummary.invocationCount\",\"" + dbn + "\");'"}
                        ,{ name: "query", size: 650}
                        ,{ name: "avg time (ms)", size : 130}
                        ,{ name: "min time (ms)", size : 130}
                        ,{ name: "max time (ms)", size : 130}
                        ,{ name: "max compile (ms)", size : 130}
                        ,{ name: "avg execution (ms)", size : 145}
            ]
        }
        let fxtable = new FixedHeaderTable(container, config);

        let rowbackground = false;

        for (let i = 0 ; i < records.length; i++) {
            let rowhtml = "";
            let dta = records[i];
            //console.log(dta);
            // tabular values row
            if (rowbackground) {
                rowhtml += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
            } else {
                rowhtml += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
            }
            let enablePlan = "";
            let buttonTitle = "Explain";
            if (dta.query.length >= 10000) {
                buttonTitle = "The query is truncated no query plan possible ";
                rowhtml += "<td><div class='ui inverted yellow icon buttons'><button class='ui red button' title='" + buttonTitle+ "' onClick='querylistapp.showWarning(\"The query is truncated on 10000 characters; no query plan possible\");');'><i class='vertically flipped sitemap icon'></i></button>";
            } else {
                rowhtml += "<td><div class='ui inverted green icon buttons'><button class='ui button' title='" + buttonTitle+ "' onClick='querylistapp._explainTraceQuery(" + i + ", \"" + dbn + "\");'><i class='vertically flipped sitemap icon'></i></button>";
            }
            if (dta.invocationSummary.invocationCount > 1) {
                rowhtml += "<button class='ui button' title='Timeline' onClick='querylistapp._showTraceQueryTimeline(" + i + ",\"" + dbn + "\");'><i class='chart bar outline icon'></i></button></div></td>";

            } else {
                rowhtml += "</div></td>";
            }

            rowhtml += "<td>" + dta.invocationSummary.invocationCount + "</td>";
            //console.log(dta);

            rowhtml += "<td>" + qan._formatDate(dta.lastInvocation)+ "</td>";
            rowhtml += "<td ><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + qan._formatCypher(dta.query) + "</div></td>";
            rowhtml += "<td>" + this._round(this._toMillisFromValue(dta.invocationSummary.totalTimeInUs.avg),3) + "</td>";
            rowhtml += "<td>" + this._round(this._toMillisFromValue(dta.invocationSummary.totalTimeInUs.min),3) + "</td>";
            rowhtml += "<td>" + this._round(this._toMillisFromValue(dta.invocationSummary.totalTimeInUs.max),3) + "</td>";
            //             contents += "<td class='hover'>" + Math.round(dta.avgWaiting) + "<div class='tooltip'>min:" + dta.minWaiting + " max:" + dta.maxWaiting + "</div></td>";

            rowhtml += "<td class='hover'>" + this._toMillis(dta.invocationSummary.compileTimeInUs.max) + "<div class='tooltip'>min:" + this._round(this._toMillis(dta.invocationSummary.compileTimeInUs.min ),3) + " avg:" + this._round(this._toMillis(dta.invocationSummary.compileTimeInUs.avg ),3) + "</div></td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.compileTimeInUs.min ) + "</td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.compileTimeInUs.max )+ "</td>";
            rowhtml += "<td class='hover'>" + this._toMillis(dta.invocationSummary.executionTimeInUs.avg ) + "<div class='tooltip'>min:" + this._round(this._toMillis(dta.invocationSummary.executionTimeInUs.min ),3) + " max:" + this._round(this._toMillis(dta.invocationSummary.executionTimeInUs.max ),3) + "</div></td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.executionTimeInUs.min ) + "</td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.executionTimeInUs.max )+ "</td>";

            rowhtml += "</tr>";
            rowbackground = !rowbackground;
            fxtable.addTableRowAsHTML(rowhtml);
        }

        fxtable.showTable(); // this will actually draw it.

    }

    _buildTraceTable_old(dbn, records) {
        // building html

        let contents = "";
        contents+= "<table class='trace_table'>";
        // table header
        contents+= "<thead><tr>";
        contents+= "<th></th>"
        contents+= "<th id='invocationSummary.invocationCount_OrderIconTrace_" + dbn + "' style='cursor : pointer' onClick='querylistapp._orderTraceColumn(\"invocationSummary.invocationCount\",\"" + dbn + "\");'>Count</th>"
        contents+= "<th id='lastInvocation_OrderIconTrace_" + dbn + "' style='cursor : pointer' onClick='querylistapp._orderTraceColumn(\"lastInvocation\",\"" + dbn + "\");'>last Invocation</th>"
        contents+= "<th>Query</th>"
        contents+= "<th id='invocationSummary.totalTimeInUs.avg_OrderIconTrace_" + dbn + "' style='cursor : pointer' onClick='querylistapp._orderTraceColumn(\"invocationSummary.totalTimeInUs.avg\",\"" + dbn + "\");'>Avg Time</th>"
        contents+= "<th>Min Time</th>"
        contents+= "<th>Max Time</th>"
        contents+= "<th id='invocationSummary.compileTimeInUs.max_OrderIconTrace_" + dbn + "' style='cursor : pointer' onClick='querylistapp._orderTraceColumn(\"invocationSummary.compileTimeInUs.max\",\"" + dbn + "\");'>Max Compile</th>"
        contents+= "<th id='invocationSummary.executionTimeInUs.avg_OrderIconTrace_" + dbn + "' style='cursor : pointer' onClick='querylistapp._orderTraceColumn(\"invocationSummary.executionTimeInUs.avg\",\"" + dbn + "\");'>Avg Execution</th>"
        contents+= "</tr></thead><tbody>";
        let rowbackground = false;

        for (let i = 0 ; i < records.length; i++) {
            let dta = records[i];
            //console.log(dta);
            // tabular values row
            if (rowbackground) {
                contents += "<tr valign='top' style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
            } else {
                contents += "<tr valign='top' style='border-top: 1px solid lawngreen '>";
            }
            let enablePlan = "";
            let buttonTitle = "Explain";
            if (dta.query.length >= 10000) {
                buttonTitle = "The query is truncated no query plan possible ";
                contents += "<td><div class='ui inverted yellow icon buttons'><button class='ui red button' title='" + buttonTitle+ "' onClick='querylistapp.showWarning(\"The query is truncated on 10000 characters; no query plan possible\");');'><i class='vertically flipped sitemap icon'></i></button>";
            } else {
                contents += "<td><div class='ui inverted green icon buttons'><button class='ui button' title='" + buttonTitle+ "' onClick='querylistapp._explainTraceQuery(" + i + ", \"" + dbn + "\");'><i class='vertically flipped sitemap icon'></i></button>";
            }
            if (dta.invocationSummary.invocationCount > 1) {
                contents += "<button class='ui button' title='Timeline' onClick='querylistapp._showTraceQueryTimeline(" + i + ",\"" + dbn + "\");'><i class='chart bar outline icon'></i></button></div></td>";

            } else {
                contents += "</div></td>";
            }

            contents += "<td>" + dta.invocationSummary.invocationCount + "</td>";
            //console.log(dta);

            contents += "<td>" + qan._formatDate(dta.lastInvocation)+ "</td>";
            contents += "<td>" + qan._formatCypher(dta.query) + "</td>";
            contents += "<td>" + this._round(this._toMillisFromValue(dta.invocationSummary.totalTimeInUs.avg),3) + "</td>";
            contents += "<td>" + this._round(this._toMillisFromValue(dta.invocationSummary.totalTimeInUs.min),3) + "</td>";
            contents += "<td>" + this._round(this._toMillisFromValue(dta.invocationSummary.totalTimeInUs.max),3) + "</td>";
            //             contents += "<td class='hover'>" + Math.round(dta.avgWaiting) + "<div class='tooltip'>min:" + dta.minWaiting + " max:" + dta.maxWaiting + "</div></td>";

            contents += "<td class='hover'>" + this._toMillis(dta.invocationSummary.compileTimeInUs.max) + "<div class='tooltip'>min:" + this._round(this._toMillis(dta.invocationSummary.compileTimeInUs.min ),3) + " avg:" + this._round(this._toMillis(dta.invocationSummary.compileTimeInUs.avg ),3) + "</div></td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.compileTimeInUs.min ) + "</td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.compileTimeInUs.max )+ "</td>";
            contents += "<td class='hover'>" + this._toMillis(dta.invocationSummary.executionTimeInUs.avg ) + "<div class='tooltip'>min:" + this._round(this._toMillis(dta.invocationSummary.executionTimeInUs.min ),3) + " max:" + this._round(this._toMillis(dta.invocationSummary.executionTimeInUs.max ),3) + "</div></td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.executionTimeInUs.min ) + "</td>";
//            contents += "<td>" + this._toMillis(dta.invocationSummary.executionTimeInUs.max )+ "</td>";

            contents += "</tr>";
            rowbackground = !rowbackground;
        }



        contents += "</tbody></table>"
        return contents;
    }

    _round(value, decimals) {
        return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
    }

    _addTotals(dta) {
//        console.log("add totals start + " + dta.invocations.length);
        // first walk through the invocations
        let minTotal = -1;
        let maxTotal = -1;
        let totalforavg = 0;
        for (let i = 0; i < dta.invocations.length; i++) {
            let elapsed =  this._getIntValue(dta.invocations[i].elapsedCompileTimeInUs);
            let exec = this._getIntValue(dta.invocations[i].elapsedExecutionTimeInUs);
            //console.log("elapsed " + elapsed + " - exec " + exec);
            let total = elapsed + exec ;
            if (minTotal == -1) {
                minTotal = total;
            }
            if (minTotal > total ) {
                minTotal = total;
            }
            if (maxTotal == -1) {
                maxTotal = total;
            }
            if (total > maxTotal) {
                maxTotal = total;
            }
            totalforavg += total;

            dta.invocations[i].total = total;
        }
        let avgTotal = totalforavg / dta.invocations.length;
        dta.invocationSummary.totalTimeInUs = {avg : avgTotal, min : minTotal, max: maxTotal };
        dta.lastInvocation = this._getIntValue(dta.invocations[dta.invocations.length -1 ].startTimestampMillis);
        return dta;
    }


    _showTraceQueryTimeline(recordIndex, dbname) {
        //console.log("_showTraceQueryTimeline");
        let dta = this._getTraceRecords(dbname)[recordIndex];
        //console.log(dta);

        //        console.log("showQueryModal for dbname " + dbname);
        // prepare modal window queryParams
        // "<tr><td>Parameters</td><td><div id='queryParams' style='width: 400px;'></div></td></tr>" +
        let invocationsTimeLine = "<table>" +
            "<tr>" +
            "<td valign='top'><div id='invtl' style='width: 1700px; height: 450px'></div>" +
            "<table><tr valign='top'><td  width='70'>Query:</td><td><div class='ui raised segment' id='invtlqueryTxt' style='width: 1625px; max-height: 150px; overflow-y: auto'></div></td></tr>" +
            "</table>" +
            "</tr>" +
            "</table>"

        let modalContent = document.getElementById("modalContent");
        let modalHeader = document.getElementById("modalHeader");
        modalHeader.innerHTML="Invocation Time Line";
        let q = dta.query;

        // clear
        modalContent.innerHTML = invocationsTimeLine;
        // now initiate modal
        let current = this;
        $('#simpleModal').modal({
            onVisible: function () {
                current.showInvocationTimeLine(q, dta.invocations, dbname);
            },
            onApprove: function () {
                // clear
                let modalContent = document.getElementById("modalContent");
                let modalHeader = document.getElementById("modalHeader");
                modalHeader.innerHTML="";
                modalContent.innerHTML = "";
            }
        }).modal('show');


    }
    _resolve(path, obj) {
        return path.split('.').reduce(function(prev, curr) {
            return prev ? prev[curr] : null
        }, obj || self)
    }

    _orderTraceColumn(property, dbname) {
        // console.log("_orderTraceColumn start property=" + property + " dbname=" + dbname);
        let orderASC = false;
        let orderingASC = property + "ASC" + dbname;
        let orderingDESC = property + "DESC" + dbname;
        // getting the current order
        let currentOrder = "";
        if (this.traceOrder.has(dbname)) {
            currentOrder = this.traceOrder.get(dbname);
        }
        let current = this;

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
        // keep the current order
        this.traceOrder.set(dbname, currentOrder);
        // getting the current dataset
        let dta = this._getTraceRecords(dbname);
        dta.sort(function(a,b) {
            let a_ =  current._resolve(property, a);
            let b_ =  current._resolve(property, b);
//            console.log("a_ " + a_ + " b_ " + b_ );
            if (orderASC) {
                if (a_ < b_) return -1;
                if (a_ > b_) return 1;
            } else {
                if (a_ < b_) return 1;
                if (a_ > b_) return -1;
            }
            return 0;
        });
        // save this ordered data
        this._setTraceRecords(dbname, dta);
        // get the correct data container *****
        let container  = "tqldbna_" + dbname;
        let elm = document.getElementById(container);
        // clear
        this._buildTraceTable(container, dbname, dta);
        // elm.innerHTML = this._buildTraceTable(dbname, dta);

        // count_OrderIcon
        let iconElm = document.getElementById(property + "_OrderIconTrace_" + dbname);
        let iconclass = "caret down icon";
        if (orderASC) {
            iconclass = "caret up icon";
        }
        let curHTML = iconElm.innerHTML + "<i class='" + iconclass +  "'></i>";
        iconElm.innerHTML = curHTML;
    }

    showInvocationTimeLine(query, invocations, dbname) {
        // draw the Chart
        // vis 2d graphs
        let groups = new vis.DataSet();
        groups.add({
            id: 0,
            content: "compile (ms)",
            options: {
                yAxisOrientation: 'right', // right, left
                drawPoints: false
            }
        });
        groups.add({
            id: 1,
            content: "execution (ms)",
            options: {
                yAxisOrientation: 'right', // right, left
                drawPoints: false
            }
        });
        let invtl = document.getElementById("invtl");
        let invtlqueryTxt = document.getElementById("invtlqueryTxt");
        invtl.innerHTML = "";// clear
        invtlqueryTxt.innerHTML = "<div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + qan._formatCypher(query) + "</div>";

        // building data list
        var items = [];
        for (let a = 0; a < invocations.length; a++) {

            let time = this._getIntValue(invocations[a].startTimestampMillis);
            let exec = this._toMillis(invocations[a].elapsedExecutionTimeInUs);
            let comp = this._toMillis(invocations[a].elapsedCompileTimeInUs);
            items.push ({x : time, y : comp, group : 0});
            items.push ({x : time, y : exec, group : 1});
        }
        //console.log(items);
        var dataset = new vis.DataSet(items);
        var options = {
            style:'bar',
            stack:true,
            barChart: {width:10, align:'center', sideBySide:false},
            dataAxis: { icons: false },
            drawPoints:false,
            orientation: 'top',
            legend: true
        };
        var graph2d = new vis.Graph2d(invtl, dataset, groups, options);

    }

    _getIntValue(alowhigh) {
        // high 364
        // low 1197895604

        // 1566398951846
        // console.log(alowhigh);
        // console.log(alowhigh.toString());
        // console.log(alowhigh.toNumber());
        return alowhigh.toNumber();
    }

    _toMillis(micros) {
        let intval = micros.toNumber();
        return intval/1000;
    }
    _toMillisFromValue(micros) {
        return micros/1000;
    }


    _getQueriesSegment(container, databasename, intab, act) {
        let html = "";
        if (intab && intab == true) {
            html += '<div align="center" style="height: 750px; width:1650px; overflow: hidden; margin: 0px;" class="ui bottom attached ' + act + 'tab segment" data-tab="cqt_' + databasename + '">'+
                '<div class="ui raised segment" ' +
                '   onClick="querylistapp.currentQueries(\'' + container +  '\', \'' + databasename + '\');"><i class="refresh icon"></i>Queries' +
                '</div><div align="left" id="' + container + '"></div></div>';
        } else {
            html += '<div   align="center" class="ui raised segment" ' +
                '   onClick="querylistapp.currentQueries(\'' + container +  '\', \'' + databasename + '\');"><i class="refresh icon"></i>Queries' +
                '</div><div align="left" id="' + container + '"></div>';
        }
        return html;
    }

    _getTraceQueriesSegment(container, databasename, intab, act) {
        let html = "";
        // if the database count is greater than 13 then there is a big change that there is an extra tab line
        if (intab && intab == true) {
            html += '<div align="center"  class="ui bottom attached ' + act + 'tab segment" data-tab="tqt_' + databasename + '">'+
                '<div class="ui raised segment" ' +
                '   onClick="querylistapp.traceQueries(\'' + container +  '\', \'' + databasename + '\');"><i class="refresh icon"></i>Query Stats' +
                '</div><div align="left" id="' + container + '"></div></div>';
        } else {
            html += '<div   align="center" class="ui raised segment" ' +
                '   onClick="querylistapp.traceQueries(\'' + container +  '\', \'' + databasename + '\');"><i class="refresh icon"></i>Query Stats' +
                '</div><div align="left" id="' + container + '"></div>';
        }
        return html;
    }


    _clearCQRecords(adbname) {
        let dbname = "-";
        if (adbname && adbname != "") {
            dbname = adbname;
        }
        if (this.currentQueriesMap.has(dbname)) {
            this.currentQueriesMap.delete(dbname);
        }
    }
    _setCQRecords(adbname, arecordArray) {
        let dbname = "__";
        if (adbname && adbname != "" && dbname != null) {
            dbname = adbname;
        }
        this.currentQueriesMap.set(dbname, arecordArray);
    }

    _getCQRecords(adbname) {
        if (this.currentQueriesMap.has(adbname)) {
            return this.currentQueriesMap.get(adbname);
        } else {
            return [];
        }

    }


    _getRecordValue(aRecord, aKey, aDefault ) {
        if (aRecord.has(aKey)) {
            let v = aRecord.get(aKey);
            if ( v == null) {
                return aDefault;
            } else {
                return aRecord.get(aKey);
            }
        } else {
            return aDefault;
        }
    }
    async currentQueries(appContainer, dbname) {
        // Note in the current version 4.0 build (4.0.0-rc1) the dbms.listQueries will give all the queries on all the databases
        // so we have to filter only for the current database
        let app = document.getElementById(appContainer);
        let topPosition = app.getBoundingClientRect().top;
        let tabHeight = 900 - topPosition;
        app.style="height: ' + tabHeight + 'px; width:1650px; overflow: hidden; margin: 0px;"
        // app it the container
        let query = "call dbms.listQueries()";
        let session = nac.getReadSession(dbname);
        let dbn = "__";
        let srv = "";
        if (dbname && dbname != "") {
            dbn = dbname.split("@")[0];
            srv = dbname.split("@")[1];
        }
        if (nac.neodb.majorVersion > 3) {
            query = "call dbms.listQueries() YIELD queryId, username, metaData, query, parameters, planner, runtime, indexes, startTime, protocol, clientAddress, requestUri, status, resourceInformation, activeLockCount, elapsedTimeMillis, cpuTimeMillis, waitTimeMillis, idleTimeMillis, allocatedBytes, pageHits, pageFaults, connectionId, database WHERE database = '" + dbn + "' RETURN *";
        }
        if (nac.neodb.majorVersion > 4) {
            // WAITING ON A PROPER REPLACEMENT OF dbms.listQueries
            query = "show transactions YIELD  *  WHERE database = '" + dbn + "' RETURN currentQueryId as queryId, username, currentQuery as query, parameters, planner, runtime, indexes, startTime, protocol, clientAddress, requestUri, status, resourceInformation, activeLockCount, elapsedTime.milliseconds as elapsedTimeMillis, cpuTime.milliseconds as cpuTimeMillis, waitTime.milliseconds as waitTimeMillis, idleTime.milliseconds as idleTimeMillis, allocatedDirectBytes as allocatedBytes, pageHits, pageFaults, connectionId, database, transactionId, metaData";
        }
        let rs = await nac.runQuery(session, query);
        let records = [];
        this._clearCQRecords(dbname);
        let current = this;
        rs.records.forEach(function(record) {

            records.push({ queryId : record.get("queryId")
                , username : record.get("username")
                , metaData : JSON.stringify(record.get("metaData"))
                , query : record.get( "query")
                , parameters : record.get( "parameters")
                , planner : record.get("planner")
                , runtime : record.get("runtime")
                , indexes : record.get("indexes")
                , startTime : record.get("startTime")
                , protocol : record.get("protocol")
                , clientAddress : record.get("clientAddress")
                , requestUri : record.get("requestUri")
                , status : record.get("status")
                , resourceInformation : JSON.stringify(record.get("resourceInformation"))
                , activeLockCount : record.get("activeLockCount")
                , elapsedTimeMillis : record.get("elapsedTimeMillis")
                , cpuTimeMillis : current._getRecordValue(record,"cpuTimeMillis","")
                , waitTimeMillis : current._getRecordValue(record,"waitTimeMillis","")
                , idleTimeMillis : current._getRecordValue(record,"idleTimeMillis","")
                , allocatedBytes : current._getRecordValue(record,"allocatedBytes","")
                , pageHits : record.get("pageHits")
                , pageFaults : record.get("pageFaults")
                , connectionId: current._getRecordValue(record,"connectionId","")
                , srv: srv
            });
        });

        session.close();

        let config = { subContainerWidth: 1620
            , height : (tabHeight - 70)
            , columns: [{ name: "user", size: 75}
                ,{ name: "metadata", size: 100}
                ,{ name: "planner", size: 100}
                ,{ name: "runtime", size: 120}
                ,{ name: "indexes", size: 120}
                ,{ name: "start", size : 200}
                ,{ name: "protocol", size : 70}
                ,{ name: "client", size : 200}
                ,{ name: "status", size : 80}
                ,{ name: "resourceInfo", size : 100}
                ,{ name: "lockCount", size : 85}
                ,{ name: "elapsed (ms)", size : 90}
                ,{ name: "cpu (ms)", size : 75}
                ,{ name: "wait (ms)", size : 75}
                ,{ name: "idle (ms)", size : 75}
                ,{ name: "bytes", size : 75}
                ,{ name: "hitRatio", size : 75}
                ,{ name: "query-id", size : 120}
                ,{ name: "connection-id", size : 120}
            ]

        }

        let fxtable = new FixedHeaderTable(appContainer, config);

        // building html
        let rowbackground = false;

        for (let i = 0 ; i < records.length; i++) {
            let dta = records[i];
            let fxrow = "";
            //console.log(dta);
            // two rows are used here
            // second row 2 columns

            // tabular values row
            if (rowbackground) {
                fxrow += "<tr style='border-top: 1px solid lawngreen; background-color: #DDD; '>";
            } else {
                fxrow += "<tr style='border-top: 1px solid lawngreen '>";
            }
            fxrow += "<td>" + dta.username + "</td>";
            let mta = "";
            if (dta.metaData && dta.metaData !== "null") {
                mta = dta.metaData;
            }
            fxrow += "<td title='" + mta + "'>" + this._truncString(mta, 15) + "</td>";
            fxrow += "<td>" + dta.planner + "</td>";
            fxrow += "<td>" + dta.runtime + "</td>";
            fxrow += "<td>" + dta.indexes + "</td>";
            fxrow += "<td>" + dta.startTime + "</td>";
            fxrow += "<td>" + dta.protocol + "</td>";
            fxrow += "<td>" + dta.clientAddress + "</td>";
            fxrow += "<td>" + dta.status + "</td>";
            fxrow += "<td title='" + dta.resourceInformation + "'>" + this._truncString(dta.resourceInformation, 15) + "</td>";
            fxrow += "<td>" + dta.activeLockCount + "</td>";
            fxrow += "<td>" + dta.elapsedTimeMillis+ "</td>";
            fxrow += "<td>" + dta.cpuTimeMillis + "</td>";
            fxrow += "<td>" + dta.waitTimeMillis + "</td>";
            fxrow += "<td>" + dta.idleTimeMillis + "</td>";
            fxrow += "<td>" + dta.allocatedBytes + "</td>";
            fxrow += "<td>" + current._hitRatio(dta) + "</td>";
            fxrow += "<td>" + dta.queryId + "</td>";
            fxrow += "<td>" + dta.connectionId+ "</td>";
            fxrow += "</tr>";

            // query row
            if (rowbackground) {
                fxrow += "<tr valign='top' style='background-color: #DDD;'>";
            } else {
                fxrow += "<tr valign='top'>";
            }
            // "<button class='ui button' title='Explain' onClick='qan._explainQuery(" + i + ");'><i class='sun outline icon'></i></button>";
            fxrow += "<td><div class='ui inverted green icon buttons'><button class='ui button' title='Explain' onClick='querylistapp._explainCurrentQuery(" + i + ", \"" + dbname + "\");'><i class='vertically flipped sitemap icon'></i></button></div>";
            fxrow += "<td colspan='12'><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" + current.qans._formatCypher( dta.query) + "</div></td>";
            fxrow += "<td colspan='6'><div style='word-break: break-all; word-wrap: break-word;max-height: 200px; overflow-y: auto;'>" +  JSON.stringify(dta.parameters ) + "</div></td>";

            fxrow += "</tr>";
            fxtable.addTableRowAsHTML(fxrow);
            rowbackground = !rowbackground;
        }




        this._setCQRecords(dbname, records);

        fxtable.showTable();
    }

    _truncString(aString, aMax) {
        if (aString) {
            if (aString.length > aMax) {
                return aString.substring( 0, aMax - 3 ) + "...";
            } else {
                return aString;
            }
        } else {
            return '';
        }
    }

    _hitRatio(dr) {
        if (dr.pageHits > 0 || dr.pageFaults > 0) {
            return (((dr.pageHits)/(dr.pageHits + dr.pageFaults)) * 100);
        } else {
            return 0;
        }
    }

    _explainCurrentQuery(anId, neodb) {
        //console.log(this.currentQueriesMap);
        let records = this._getCQRecords(neodb);
        //console.log(records);
        let dta = records[anId];
        //console.log(dta);
        let query = dta.query;
        let params = dta.parameters;
        this.showQueryModal (query, params, dta.neodb, dta.srv);
    }
    _explainTraceQuery(anId, neodb) {
        //console.log("_explainTraceQuery >" + anId + "<>" + neodb + "<");
        //console.log(this.traceQueriesMap);
        let records = this._getTraceRecords(neodb);
        // console.log(records);
        let dta = records[anId];
        //console.log(dta);
        let query = dta.query;
        //console.log(" invocation array size " + dta.invocations.length + " summary total invocations: " + dta.invocationSummary.invocationCount);
        let params = {dummy: 1};
        this.showQueryModal (query, params, dta.neodb, dta.srv);
    }



    testQuery() {
        let query ='explain CALL db.labels() YIELD label\n' +
            'WITH COLLECT(label)[..1000] AS labels\n' +
            'RETURN \'labels\' as a, labels as result\n' +
            'UNION\n' +
            'CALL db.relationshipTypes() YIELD relationshipType\n' +
            'WITH COLLECT(relationshipType)[..1000] AS relationshipTypes\n' +
            'RETURN \'relationshipTypes\' as a, relationshipTypes as result\n' +
            'UNION\n' +
            'CALL db.propertyKeys() YIELD propertyKey\n' +
            'WITH COLLECT(propertyKey)[..1000] AS propertyKeys\n' +
            'RETURN \'propertyKeys\' as a, propertyKeys as result\n' +
            'UNION\n' +
            'CALL dbms.functions() YIELD name, signature, description\n' +
            'WITH collect({name: name, signature: signature, description: description}) as functions\n' +
            'RETURN \'functions\' as a, functions AS result\n' +
            'UNION\n' +
            'CALL dbms.procedures() YIELD name, signature, description\n' +
            'WITH collect({name: name, signature: signature, description: description}) as procedures\n' +
            'RETURN \'procedures\' as a, procedures as result';

        this.showQueryModal(query, null);

    }

    showWarning(amessage) {
        let modalContent = document.getElementById("messageContent");
        let modalHeader = document.getElementById("messageHeader");
        modalHeader.innerHTML = "Warning";
        modalContent.innerHTML = amessage;
        $('#messageModal').modal("show");
    }


    showQueryModal(aQuery, parameters, dbname, srv) {
//        console.log("showQueryModal for dbname " + dbname);
        // prepare modal window queryParams
        // "<tr><td>Parameters</td><td><div id='queryParams' style='width: 400px;'></div></td></tr>" +
        let vizcontainerhtml = "<div style='overflow: auto'><table>" +
            "<tr>" +
               "<td valign='top' >" +
                 "<div class='wrapper'>" +
                   "<div id='queryPlan' style='flex: 1'></div>" +
                   "<div id='minimapWrapper' style='position: absolute; margin: 5px; border: 1px solid #ddd; overflow: hidden; background-color: #FFF; z-index: 90;' class='minimapWrapperIdle'>" +
                      "<img id='minimapImage' class='minimapImage' />" +
                      "<div id='minimapRadar' class='minimapRadar'></div>" +
                    "</div>" +
                   "</div>" +
                  "<table><tr valign='top'><td class='ui segment'><div id='queryTxt'  style='width: 1150px; height: 100px; overflow: auto; word-wrap : break-word'></div></td></tr>" +
                 "</table>" +
               "</td>" +
               "<td valign='top' class='ui segment'><div id='queryStep' style='width: 450px;height: 750px; overflow: auto'>step details here</div></td>" +
             "</tr></table></div>" ;

        let modalContent = document.getElementById("modalContent");
        let modalHeader = document.getElementById("modalHeader");
        modalHeader.innerHTML="Query Details ";
        if (srv && srv != '') {
            modalHeader.innerHTML="Query Details @" + srv;
        }
        let q = aQuery;

        // clear
        modalContent.innerHTML = vizcontainerhtml;
        // now initiate modal
        let current = this;
        $('#simpleModal').modal({
            closable: false,
            onVisible: function () {
                current.showQueryPlan(q, parameters, dbname, srv);
            },
            onApprove: function () {
                // clear
                //console.log(" in modal approve ");
                let modalContent = document.getElementById("modalContent");
                let modalHeader = document.getElementById("modalHeader");
                modalHeader.innerHTML="";
                modalContent.innerHTML = "";
            }
        }).modal('show');
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
    _stripQueryError(aQuery) {
        let check = "<br/>ERROR";
        if (aQuery.indexOf(check) > -1) {
            return aQuery.substring(0,aQuery.indexOf(check)  );
        }
        return aQuery;
    }

    async showQueryPlan(aQuery, parameters, dbname, srv) {
        let dn = dbname;
        let qry = this._stripQueryError(aQuery);
        // if multi-db then check if the current dbname is in the current dbnames list
        // if not we gonna use the default database of the current connection.
        if (dbname && dbname != "") {
            if (!nac.neodb.databasenames.includes(dbname)) {
                dn = nac.neodb.getDefaultDatabaseName();
            }
        }

        if (srv && srv != '') {
            if (dn) {
                // there is a db name we don't have to do anything
                if (nac.neodb.isCluster) {
                    dn =  dn + "@" + srv;
                }
            } else {
                if (nac.neodb.isCluster) {
                    dn = "db@" + srv;
                }
            }
        }
        let session = nac.getReadSession(dn);
        let modalQueryTxt = document.getElementById("queryTxt");
        let q = qry;
        if (!qry.toLowerCase().startsWith("explain")) {
            q = "EXPLAIN " + qry;
        }
        if (qry.toLowerCase().startsWith("profile")) {
            q = "EXPLAIN " + qry.substring(7);
        }
        modalQueryTxt.innerHTML = this.qans._formatCypher(q);
        let rs;
        try {
            let rs = await nac.runQuery(session, q);

            this.qpv = new QueryPlanViz( rs.summary, "queryPlan", "queryStep");

        } catch (err) {
            let qpq = document.getElementById("queryPlan");
            qpq.innerHTML = '<div class="ui message">The plan for this query could not be retrieved. This can be caused by analyzing an old log file which' +
                ' uses unsupported functions or you are running an explain on another database with other procedures and functions than on the database which created the log file</div> <br/><br/><div style="color: #ff0000">' + err.message.split(/\r?\n/)[0] + "</div>"

            //console.log(err.message);
        }
        session.close();
    }

}

class QueryPlanViz {

    constructor(summary, containerid, stepContainerId, aSrv) {
        this.container = document.getElementById(containerid);
        this.stepContainer = document.getElementById(stepContainerId);
        this.nodeMap = new Map();
        this.movedScale = false;
        this.srv = aSrv;

        this._parsePlanToData(summary.plan);
        this._defineOptions();
        this._createNetwork();

    }

    // _test() {
    //     let elm = document.getElementById("testit");
    //     // get the canvas
    //     elm.src = document.getElementsByTagName('canvas')[0].toDataURL();
    //     elm.width = '300';
    //     elm.height = '200';
    // }

    _parsePlanToData(plan) {
        // node list and links list
        this.nodes = [{ id: 1, label : 'Result \nplanner: ' + plan.arguments.planner + ' \nruntime: ' + plan.arguments.runtime}];
        this.links = [];
        this.options = {};
        this.nodenumber = 1;
        this.maxNodeNumber = 1;
        this.nodeMap.set(this.nodenumber, this._stripStep(plan, null));
        this._processStep(plan,1);
    }

    _processStep(step, parent) {
        this.nodenumber++;
        this.maxNodeNumber = this.nodenumber;
        // add node to the list of nodes
        this.nodeMap.set(this.nodenumber, this._stripStep(step, parent));
        //console.log(step);
        let n = { value: 10, id: this.nodenumber, font: {multi: 'html', mono : "6px courier black"}, label : this._formatVisNodeLabelText(step), color : {background : this._getColorPerOperatorType(step)}};
        this.nodes.push(n);


        if (this.nodenumber > 1) {
            // connect to the previous node
            this.links.push({from: parent, to : this.nodenumber, width: 1, length: 120, label : this._getEstimatedRows(step.arguments.EstimatedRows) + ' Est. Rows', scaling : {min : 1, max: 20, label : {enabled: false}}, value : this._calcValue(step.arguments.EstimatedRows)  });
        }
        // process children
        let current = this;
        let curParent = current.nodenumber;
        if (step.children && step.children.length > 0) {

            step.children.forEach( function (element) {
               current._processStep(element, curParent );
            });
        }
    }

    _stripStep(step, parent) {
        return { operatorType : step.operatorType
        , arguments : step.arguments
        , identifiers : step.identifiers
        , parent : parent};
    }

    _getColorPerOperatorType(step) {
        // #f49797
        let t = step.operatorType;
        if (t.indexOf("Eager") > -1) {
            return "#babfe2";
        } else if (t == "NodeByLabelScan") {
            return "#db8686";
        } else if (t == "AllNodesScan") {
            return "#db8686";
        } else if (t == "ProcedureCall") {
            return "yellow";
        } else if (t == "VarLengthExpand(All)") {
            return "#42f5ef";
        } else if (t == "Expand(All)") {
            return "#f099df";
        } else if (t == "CartesianProduct") {
            return "orange";
        } else {
            return "#befabe";// #d5ead5
        }
//CartesianProduct
    }

    _getEstimatedRows(anumber) {
        if (anumber) {
            if (anumber < 0) {
                return 0;
            } else {
                return Math.trunc(anumber);
            }
        } else {
            return 0;
        }
    }

    _calcValue(val) {
        let rt = 1;
        if (val > 0) {
            let fr = Math.log10(val);
            rt = 1.0 + fr;
        }
        if (rt < 1) {
            rt = 1;
        }
        return rt;
    }

    _formatVisNodeLabelText(step) {
        let r = "";
        r = r + "<b>" + step.operatorType + "</b>" ;
        return r;
    }
    _identifierExist(step) {

        if (step.identifiers) {
            for (let i = 0; i < step.identifiers.length; i++) {
                if (this._showIdentifier(step.identifiers[i])) {
                    return true;
                }
            }
        }
        return false;
    }

    _expressionExist(step) {
        if (step.arguments.Expression) {
            return true;
        }
        if (step.arguments.Expressions) {
            return true;
        }
        if (step.arguments.ExpandExpression) {
            return true;
        }
        if (step.arguments.LabelName) {
            return true;
        }

        if (step.arguments.CountRelationshipsExpression) {
            return true;
        }

        if (step.arguments.CountNodesExpression) {
            return true;
        }
        return false;

    }

    _genLineForCharacter(aLength, aChar) {
        let s = "";
        for (let i = 0; i < aLength; i++) {
            s += aChar;
        }
        return s;
    }



    _showIdentifier(elm) {
//        console.log(elm);
        if (elm.startsWith("  ")) {
          return false;
        }
        return true;
    }

    _formatExpressions(exp) {
        let str = "";
        let splt = exp.split(",");
        let cma ="";
        for (let i = 0; i < splt.length; i++) {
            str += "\n"  + '' +  cma + splt[i] + "";
            if (i == 0) {
                cma = ",";
            }
        }
        return str;
    }
    _defineOptions() {
        this.options = { clickToUse: false
            , interaction : {selectConnectedEdges: false, hover: false, selectable: false}
            , nodes : { chosen: false, color : { border : "black", background : "#d5ead5", hover : { border : "blue"}, highlight: { border : "blue" }}
                , font : { size : 8, align: 'left'}
                , shape : "box"
            }
            , edges: { font: { size: 10},
                color: {color : "#c0c1c6"} } };
        // #e3e8e3
        // default hierarchical
        this.options.layout = { hierarchical: {
                enabled:true,
                levelSeparation: 200,
                nodeSpacing: 200,
                treeSpacing: 200,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: false,
                direction: "DU",        // UD, DU, LR, RL
                sortMethod: "hubsize"   // hubsize, directed
            }};
        this.options.interaction = {
            dragNodes: false
        };
    }

    _createNetwork() {
        let data = {nodes: this.nodes, edges: this.links };
        this.ratio = 5;
        this.network = new vis.Network(this.container, data, this.options);
        this.network.selectNodes([this.maxNodeNumber], true);
        this.selectedNode = this.maxNodeNumber;
        // minimap elements
        this.minimapRadar = document.getElementById("minimapRadar");
        this.minimapImage = document.getElementById('minimapImage');
        this.minimapWrapper = document.getElementById("minimapWrapper");
        //    this.network.focus(this.maxNodeNumber, {scale: 20, animation : false});
        this._showStep(this.selectedNode);

        let current = this;
        this.network.on("click", function (params) {
            if (params.nodes && params.nodes.length > 0) {
                current._showStep(params.nodes[0]);

            } else {
                current._clearStep();
            }
        });
        this.network.once("initRedraw", function(params) {
           //console.log("initRedraw ===============================");
           this.initzoom = true;
           //current._afterDraw();
           // current._initZoom();
        });
        // this._showStepInViz(this.nodenumber)
        this.network.on('afterDrawing', function() {
//            console.log("afterDrawing=============================");
            current._afterDraw();
            if (this.initzoom === true) {
                current._initZoom();
                this.initzoom = false;

            }
        });

        this.network.on('resize', () => {
//            console.log("resize=====================");
            this.network.fit();
        });

        this.network.on('dragStart', () => {
            let minimapWrapper = document.getElementById('minimapWrapper');
            minimapWrapper.classList.remove('minimapWrapperIdle');
            minimapWrapper.classList.add('minimapWrapperMove');
        });
        this.network.on('dragEnd', () => {
            let minimapWrapper = document.getElementById('minimapWrapper');
            minimapWrapper.classList.remove('minimapWrapperMove');
            minimapWrapper.classList.add('minimapWrapperIdle')
        });
        this.network.on('zoom', (params) => {
            //console.log('zoom is happening===============================');
//            console.log(params);
//            this.hScale = params.scale;
            let minimapWrapper = document.getElementById('minimapWrapper');
            minimapWrapper.classList.remove('minimapWrapperIdle');
            minimapWrapper.classList.add('minimapWrapperMove')
        });

    }

    _drawMinimapWrapper() {
        let { clientWidth, clientHeight} = this.network.body.container;
        let width = Math.round(clientWidth / this.ratio);
        let height = Math.round( clientHeight / this.ratio);
        this.minimapWrapper.style.width = `${width}px`;
        this.minimapWrapper.style.height = `${height}px`;
    }

    _drawMinimapImage() {
        if (!this.tempCanvas) {
            //console.log("create minimap image ");
            let originalCanvas = document.getElementsByTagName('canvas')[0];
            let { clientWidth, clientHeight} = this.network.body.container;
            this.tempCanvas = document.createElement('canvas');
            let tempContext = this.tempCanvas.getContext('2d');
            let width = Math.round((this.tempCanvas.width = clientWidth / this.ratio));
            let height = Math.round((this.tempCanvas.height = clientHeight/ this.ratio));
            if (tempContext) {
                tempContext.drawImage(originalCanvas, 0,0,width, height);
                this.minimapImage.src = this.tempCanvas.toDataURL();
                this.minimapImage.width = width;
                this.minimapImage.height = height;
            }
        }

    }


    _drawRadar() {
        let { clientWidth, clientHeight} = this.network.body.container;
        let {targetScale, sourceScale} = this.network.view;

        let scale = this.network.getScale();
        if (this.movedScale === true) {
            // as soon as you use fit or moveTo the targetScale will be reset to 1
            // therefore we store the initialScale.
            targetScale = this.initialScale;
        }

        //console.log("targetScale:" + targetScale  + "   sourceScale:" + sourceScale  + " scale:" + scale);
        let viewpos = this.network.getViewPosition();

        let radarWidth = clientWidth/ this.ratio;
        let radarHeight = (clientHeight)/ this.ratio;
        let transX = (viewpos.x / this.ratio) * targetScale;
        let transY = (viewpos.y / this.ratio) * targetScale;
        let scaleTo = targetScale / scale;
        let styleString = `translate(${transX}px, ${transY}px) scale(${scaleTo})`;
        this.minimapRadar.style.transform = styleString;
        this.minimapRadar.style.width = radarWidth + "px";
        this.minimapRadar.style.height = radarHeight + "px";
    }

    _initZoom() {
        if (this.maxNodeNumber == this.selectedNode) {
            let {targetScale} = this.network.view;
            this.initialScale =  targetScale;
            // we now use moveTo to got to the current selected node
            let vp = this.network.getPositions([this.selectedNode])[this.selectedNode];
            this.movedScale = true;
            this.network.moveTo({position: vp, scale: 1.8, animation : false});
            //this.network.fit({ nodes: this.network.getConnectedNodes(this.selectedNode), animation: false });
        }
    }

    _afterDraw() {

        let { clientWidth, clientHeight} = this.network.body.container;
        let width = Math.round(clientWidth / this.ratio);
        let height = Math.round( clientHeight / this.ratio);
        let minimapWrapper = document.getElementById("minimapWrapper");
        let minimapImage = document.getElementById('minimapImage');

        // initial render
        if (!minimapImage.hasAttribute('src') || minimapImage.src === '') {
            if (!minimapWrapper.style.width || !minimapWrapper.style.height) {
                this._drawMinimapWrapper();
            }
            this._drawMinimapImage();
            this._drawRadar();
        } else if ( minimapWrapper.style.width !== `${width}px` || minimapWrapper.style.height !== `${height}px`) {
            minimapImage.removeAttribute('src');
            this._drawMinimapWrapper();
            this.network.fit();
        } else {
            this._drawRadar();
        }
    }
    _clearStep() {
        this.stepContainer.innerHTML= "";

    }
    _showStepInViz(parent) {
        // select the parent node in the network
//        console.log("_showStepInViz " + parent);
        this.selectedNode = parent;
        this.network.selectNodes([parent], true);

        // call showStep

        this._showStep(parent);
      //  let {targetScale, sourceScale} = this.network.view;
       // this.network.fit({ nodes: this.network.getConnectedNodes(this.selectedNode), animation: false });
        this.network.focus(parent);
       // this._drawRadar();
    }

    _showStep(nodeid) {
        this._clearStep();
        if (nodeid > 1) {
            let step = this.nodeMap.get(nodeid);
            // console.log(step);
            let r = "";
            r = r + "<table style='width: 450px'><tr><td colspan='2'><h4 class='ui header'><i class='dot circle outline icon'></i><div class='content'>" + step.operatorType + "</div></h4></td></tr>" +
                "<tr><td style='width: 37px;'>&nbsp;</td><td align='left'><button class='ui mini positive labeled icon basic button' onClick='querylistapp.qpv._showStepInViz("+ step.parent + ")'><i class='step forward icon'></i>Next</button>" +
                "</td></tr></table>" ;
            let current = this;
            if (this._identifierExist(step)) {
                //<i class='caret right icon'></i>
                r = r + "<h4 class='ui header'><div class='content'>Identifiers</div></h4>" ;
                let elprefix = "";
                r = r + "<div class='ui raised segment'>";
                step.identifiers.forEach(function(element) {
                  if (current._showIdentifier(element)) {
                      r = r + elprefix + element.trim() ;
                      if (elprefix === "") {
                          elprefix = ', ';
                      }
                  }
                });
                r = r + "</div>";
            }
            if (step.arguments.Signature) {
                r = r + "<h4 class='ui header'><div class='content'>Signature</div></h4>" ;
                r = r + "<div class='ui raised segment'>";
                r = r + '' + step.arguments.Signature;
                r = r + "</div>";
            }
            // since version 4.1 we have a Details field, which shows better where this step is in the query.
            if (step.arguments.Details) {
                r = r + "<h4 class='ui header'><div class='content'>Details</div></h4>" ;
                r = r + "<div class='ui raised segment'>";
                r = r + '' + step.arguments.Details;
                r = r + "</div>";
            }
            if (step.arguments.Index) {
                r = r + "<h4 class='ui header'><div class='content'>Index</div></h4>" ;
                r = r + "<div class='ui raised segment'>";
                r = r + '' + step.arguments.Index;
                r = r + "</div>";
            }
            if (step.arguments.PrefixIndex) {
                r = r + "<h4 class='ui header'><div class='content'>Index Range</div></h4>" ;
                r = r + "<div class='ui raised segment'>";
                r = r + '' + step.arguments.PrefixIndex;
                r = r + "</div>";
            }
            //<i class='caret right icon'></i>
            if (this._expressionExist(step)) {
                r = r + "<h4 class='ui header'><div class='content'>Expression</div></h4>" ;
                r = r + "<div class='ui raised segment'><code style='font-size: 0.8em'>";
                if (step.arguments.Expression) {
                    r = r + this._formatExpressions(step.arguments.Expression);
                }
                if (step.arguments.CountRelationshipsExpression) {
                    r = r + this._formatExpressions(step.arguments.CountRelationshipsExpression);
                }

                if (step.arguments.CountNodesExpression) {
                    r = r + this._formatExpressions(step.arguments.CountNodesExpression);
                }

                if (step.arguments.ExpandExpression) {
                    r = r + this._formatExpressions(step.arguments.ExpandExpression);
                }

                if (step.arguments.Expressions) {
                    r = r + this._formatExpressions(step.arguments.Expressions);
                }

                if (step.arguments.LabelName) {
                    r = r + this._formatExpressions(step.arguments.LabelName);
                }
                r = r + "</div></code>";
            }

            this.stepContainer.innerHTML= r;
        } else {
            let step = this.nodeMap.get(nodeid);
            // console.log("result " + nodeid);
            // console.log(step);
            let r = "";
            r = r + "<h3 class='ui header'><i class='stop circle outline icon'></i><div class='content'>End</div></h3>" ;
            r = r + "<table><tr><td>"
            r = r + "Planner</td><td>" + step.arguments.planner;
            r = r + "</td><tr><td>Runtime</td><td>" + step.arguments.runtime;
            r = r + "</td></tr></table>"
            this.stepContainer.innerHTML= r;
        }
    }

}