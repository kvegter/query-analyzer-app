/****************************************************************************
 ** Neo4j Database Accessor using bolt
 **
 ***************************************************************************/
'use strict';


class NeoAccessor {

    constructor(desktopAPI,  dataDependentApps) {
        this.dapi = desktopAPI;
        this.useEnc = false;
        this.neoConnection = false;
        this.dataDependentApps = dataDependentApps;
        this.driverMap = new Map();
        this.dbroles = new Map();
        this.scheme = document.location.href.substring(0,document.location.href.indexOf(":"));
    }

    isLeader(srv, dbname) {
        let isL = false;
        if (srv != undefined && dbname != undefined) {
            if (this.dbroles.get(srv) != undefined) {
                let dbrol = this.dbroles.get(srv);
                isL = (dbrol[dbname] === "LEADER");
            }
        }
        return isL;
    }

    showDBHostAndUser(host, user) {
        let totalbr = 20;
        let brs = 0;
        let coninf = "";

        if (this.neoConnection && this.neoConnection == true) {
            coninf += "Database version: " + nac.neodb.version + "<br/>";
            brs++;
            if (this.neodb.isCluster && this.neodb.isCluster == true) {
                coninf += "Database user: " + nac.neoUser + "<br/>Database hosts:";
                brs++;
                for (let key of this.driverMap.keys()) {
                    let drv = this.driverMap.get(key);
                    coninf += "<br/>@" + key + ": " + drv._address._hostPort;
                    brs++;
                }

            } else {
                coninf += "Database user: " + nac.neoUser  + "<br/>Database host:<br/> " + nac.neoHost + ":" + nac.neoPort  ;
                brs++;
                brs++;
            }
        } else {
           // nothing to do just fill up the space
        }

        let brhtml = "";
        for (let b = brs; b < totalbr; b++) {
            brhtml += "<br/>";
        }
        document.getElementById("connectionInfo").innerHTML = brhtml + coninf;
    }

    async init() {
        let prms;
        this.showDBHostAndUser(null,null);
        if (this.dapi) {
            let current = this;
            prms = this.dapi.getContext();
            prms.then(function (value) {
                current.desktopContext = value;
            });
            await prms;

            this._setContext();

            //
            // Connect to Neo4 only if the neoHost or the neoUser is changedj
            //
            if (this.graphdb) {
                let nh = this.graphdb.connection.configuration.protocols.bolt.host;
                let nu = this.graphdb.connection.configuration.protocols.bolt.username;
                let initDriver = false;
                if (this.neoHost) {
                    if (this.neoHost != nh || this.neoUser != nu) {
                        initDriver = true;
                    }
                } else {
                    // first time
                    initDriver = true;
                }
                if (initDriver == true) {
                    this.neoHost = nh;
                    this.neoUser = nu;
                    let neo4jApiUrl = "bolt" + "://" + this.neoHost + ":" + this.graphdb.connection.configuration.protocols.bolt.port;
                    this.useEnc = this.graphdb.connection.configuration.protocols.bolt.tlsLevel == 'REQUIRED';
                    this.neo4jDriver = this.initDriver(this.graphdb.connection.configuration.protocols.bolt.password, neo4jApiUrl);
                    this.neoConnection = true;
                    console.log("Driver object created to database server " + this.neoHost + " with user " + this.neoUser) ;
                    prms = this.getNeo4jVersion(null, this.graphdb.connection.configuration.protocols.bolt.password);
                    await prms;
                    this.showDBHostAndUser(nh,nu);
                    for (let i = 0; i < this.dataDependentApps.length; i++) {
                        let ddapp = this.dataDependentApps[i];
                        ddapp.init();
                    }
                }
            } else {
                console.log(" There is no active database in the neo4j desktop. showing login window now");
                this.showConnectForm();
            }
        }  else {
            this.showConnectForm();
        }
//        await prms;
        return prms;
    }
    _setContext() {
        this.graphdb = this._getActiveDatabase();
    }

    showModalWindow(aTitle, aContent) {
        $('#simpleModal')
            .modal('destroy')
        ;
        document.getElementById("modalHeader").innerHTML = aTitle;
        document.getElementById("modalContent").innerHTML = aContent;
        $('#simpleModal').modal({
            inverted: true
        })
            .modal('show')
        ;
    }


    async _initNeo(neoHost, neoPort, neoScheme,  neoUser, neoPassword, useEncrypted, dbName) {
        let prms;
        try {
            this.neoHost = neoHost;
            this.neoPort = neoPort;
            this.neoUser = neoUser;
            this.neoScheme = neoScheme;
            if (useEncrypted != null) {
                this.useEnc = useEncrypted;
            }
            if (this.neoScheme == "neo4j+s") {
                this.neoScheme = "neo4j";
                this.useEnc = true;
            } else if (this.neoScheme == "bolt+s") {
                this.neoScheme = "bolt";
                this.useEnc = true;
            }

//            let boltURL = "bolt" + "://" + this.neoHost + ":" + this.neoPort;
            let neo4jApiUrl = this.neoScheme + "://" + this.neoHost + ":" + this.neoPort;
            this.neo4jDriver = await this.initDriver(neoPassword, neo4jApiUrl);
            console.log("Driver object to database server " + this.neoHost + " with user " + this.neoUser) ;
            this.neoConnection = true;
            // console.log(this.neo4jDriver);

            prms = this.getNeo4jVersion(dbName, neoPassword);
            await prms;
            this.showDBHostAndUser(nac.neoHost, nac.neoUser);
            for (let i = 0; i < this.dataDependentApps.length; i++) {
                let ddapp = this.dataDependentApps[i];
                prms = ddapp.init();
                await prms;
            }
        } catch (err) {
            let retryAction = '<button class="ui aprove button" onClick="nac.showConnectForm();" role="button" style="display: block; margin-left: auto; margin-right: auto;"><i class="icon refresh"></i> Try Again</button>';
            // something whent wrong we should clear the driver object
            if (this.neo4jDriver && this.neo4jDriver != null) {
                this.neo4jDriver.close();
            }
            this.neo4jDriver = null;
            this._showErrorWarning(retryAction, "Connection Error", err);
        }
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

    _showErrorWarning(aAction, aHeader, aError, aComment) {
        let defaultAction = '<div class="ui approve button">Close</div>';
        if (aAction != null) {
            defaultAction = aAction;
        }
        let errorHeader = document.getElementById("errorHeader");
        let errorContent = document.getElementById("errorContent");
        let errorActions = document.getElementById("errorActions");
        errorHeader.innerHTML = aHeader;
        let content = '';
        // ""
        console.log("error.Message: " + aError.message);
        console.log(" window location href: " + window.location.href);

        if (aError.message.indexOf("WebSocket connection failure.") > -1) {
            let msg1 = "";
            //
            if (this.useEnc === true) {
                msg1+= `The connection error may be caused by the following problems:
                        <li/> Your Neo4j server maybe not running or the hostname is invalid.
                        <li/> An untrusted SSL certificate on the Neo4j server is used.
                        <li/> Opening this tool via a https url and want to connect to an unencrypted database
                        <br/> Either install trusted certificates on your Neo4j server, or when opening this app with a https url try again with a http url.`;
            } else {
               msg1 += "Your Neo4j server maybe not running or the hostname is invalid.";
            }
            content +='<div class="ui orange segment">'+msg1+'</div>';
        } else if (aError.message.indexOf("Unknown Bolt protocol version") > -1) {
            content ='<div class="ui orange segment">Your Neo4j server is running a version below neo4j 3.4, the live connection functionality is not available.</div>';
            defaultAction = '<button class="ui positive aprove button" role="button" style="display: block; margin-left: auto; margin-right: auto;">Proceed without database connection</button>';
        } else {
            content += '<div class="ui red segment">' + aError + '</div>';
        }

        errorContent.innerHTML = content;
        errorActions.innerHTML = defaultAction;
        // now popup
        $('#errorModal').modal({ closable  : false }).modal('show');
//        console.log("after show")
    }

    _getActiveDatabase() {
        for (let pi = 0 ; pi < this.desktopContext.projects.length ; pi++) {
            let prj = this.desktopContext.projects[pi];
            for (let gi = 0 ; gi < prj.graphs.length ; gi++) {
                let grf = prj.graphs[gi];
                if (grf.status == 'ACTIVE') {
                    return grf;
                }
            }
        }
    }

    onFormChange() {
        let lhost = document.getElementById("f_host").value;
        let lport = document.getElementById("f_port").value;
        let lusername = document.getElementById( "f_username").value;
        let lpassword = document.getElementById("f_password").value;
        let ldbname = document.getElementById("f_dbname").value;
        let lencrypted = document.getElementById("f_cbencrypted").checked;
        // always bolt, it works always, the tool detects if the server is part of a cluster
        let lscheme = "bolt";
        //  if (lhost && lport && lusername && lpassword) {
        // removed lusername password as requirement in case of servers with security off.
        if (lhost.indexOf(".neo4j.io") > -1 || this.scheme === 'https' ) {
            // console.log("Connecting to an aura instance, so encrypted must be true");
            // when using this tool in a browser via https then the WebSocket connection
            // to neo4j must always be secure.
            document.getElementById("f_cbencrypted").checked = true;
        }
        if (lhost && lport ) {
            //console.log(" data filled");
            this._enableElement("connectButton");
        } else {
            this._disableElement("connectButton");
            //console.log(" data not filled");
        }
    }

    async showConnectForm() {
        // $('#connectModal').modal('destroy');
        $('#connectModal').modal({ closable  : false }).modal('show');
        //console.log("after show")

    }

    processConnectForm() {
        //console.log("process connect form start");
        //
        let lhost = document.getElementById("f_host").value;
        let lport = document.getElementById("f_port").value;
        let lscheme = 'bolt';
        let lusername = document.getElementById( "f_username").value;
        let lpassword = document.getElementById("f_password").value;
        let lencrypted = document.getElementById("f_cbencrypted").checked;
        let ldbname = document.getElementById("f_dbname").value;
        //console.log(lencrypted);
        this._initNeo(lhost, lport,lscheme, lusername, lpassword, lencrypted, ldbname);

    }

    getDriver(pw) {
        let drv = null;
        if (!this.neo4jDriver || this.neo4jDriver == null ){
            let conf = { disableLosslessIntegers: false}; // default
           // console.log(" this.useEnc " + this.useEnc);
            if (this.useEnc) {
                conf.encrypted = "ENCRYPTION_ON";
            }

            // version 2 of the driver does not use v1 anymore
            // console.log("connecting to " + this.neo4jApiUrl );
            drv = neo4j.driver(this.neo4jApiUrl, neo4j.auth.basic(this.neoUser, pw), conf);
        } else {
            drv = this.neo4jDriver;
        }
        return drv;
    }

    initDriver(pw, driverUrl) {
        let drv = null;
        let conf = { disableLosslessIntegers: false}; // default
        if (this.useEnc) {
            conf.encrypted = "ENCRYPTION_ON";
        }
        drv = neo4j.driver(driverUrl, neo4j.auth.basic(this.neoUser, pw), conf);
        return drv;
    }
    async initNoDb() {
        let prms;
        // clear eventually init actions with an unsuccessfull login
        this.neoHost = undefined;
        this.neoPort = undefined;
        this.neoUser = undefined;
        this.neoScheme = undefined;
        // this.showDBHostAndUser(null,null);
        this.neodb = undefined;
        if (this.neo4jDriver) {
            this.neo4jDriver.close();
            this.neo4jDriver = undefined;
        }
        // no db connection call init on the registered apps
        this.neoConnection = false;
        for (let i = 0; i < this.dataDependentApps.length; i++) {
            let ddapp = this.dataDependentApps[i];
            prms = ddapp.init();
            await prms;
        }
    }
    async getNeo4jVersion(dbName, pw) {
        //console.log(' getNeo4jVersion start');
        // we cannot assume that there is a default database
        let session = this.getReadSession(dbName); // the driver for "0" is the driver which is used to login.
        if (!session) {
            return 0;
        }
        // checking dbms roles:
        let reco = await this.runQuery( session, "call dbms.components() yield name, versions, edition return name, versions, edition");
        let rec = reco.records[0];
        this.neodb = new NeoDb(rec.get("name"),rec.get( "versions"),rec.get( "edition"),dbName );
        // checking if this db is part of a cluster, and if so is it Aura?
        // in version 4.3 and higher the cluster check has to be done differently
        // call dbms.database.state("system") yield role return role
        if (this.neodb.majorVersion > 3) {
            reco = await this.runQuery(session, "call dbms.database.state('system') yield role " +
                " with count(*) as cnt return case when cnt < 2 then false else true end as isCluster");
        } else {
            reco = await this.runQuery(session, "call dbms.procedures() yield name where name = 'dbms.cluster.overview'\n" +
                "with count(*) as cnt return case when cnt = 0 then false else true end as isCluster");
        }
        this.neodb.isCluster = reco.records[0].get(0);



        this.neodb.isAura = (this.neoHost.indexOf("neo4j.io") > -1);

        if (this.neodb.isCluster) {
            // version 3 has a different yield structure than version 4
            let ccQuery = "call dbms.cluster.overview() yield addresses, databases \n" +
                "with addresses[0] as boltAddress, databases \n" +
                "return boltAddress, replace(split(boltAddress,':')[1],'/','') as host, databases";
            if (this.neodb.majorVersion < 4) {
                ccQuery = "call dbms.cluster.overview() yield addresses, database, role \n" +
                    "with addresses[0] as boltAddress, database, role \n" +
                    "return boltAddress, replace(split(boltAddress,':')[1],'/','') as host, database, role "
            }
            let cls = await this.runQuery(session, ccQuery);
            let recccnt = 1;
            for (let i = 0 ; i < cls.records.length; i++) {
                let dta = cls.records[i];
                let boltAddress = dta.get("boltAddress");
                let cHost = dta.get("host");
                let drv = this.initDriver(pw,boltAddress);
                if (this.neodb.majorVersion < 4) {
                    let databasename = dta.get("database");
                    let dbrole = dta.get("role");
                    let databases = {};
                    databases[databasename] = dbrole;
                    this.dbroles.set("" + recccnt, databases);
                } else {
                    let databases = dta.get("databases");
                    this.dbroles.set("" + recccnt, databases);
                }

                this.driverMap.set("" + recccnt, drv);

                recccnt = recccnt + 1;
            }
            // console.log(this.driverMap);

        }

        // checking admin rights
        // check if security is set on the database, if not you have admin privileges.
        // the way to check is that there is not a procedure dbms.showCurrentUser available when security is switched off.
        // showCurrentUser was available from 3.1 - 3.5 as dbms.security.showCurrentUser.
        // from 3.5+ it is dbms.showCurrentUser
        // When security is switched off on the server then this procedures is not available.
        let lsec = await this.runQuery(session, "call dbms.procedures() yield name with name where name contains \".showCurrentUser\" return count(name) as cnt");
        this.neodb.securityEnabled = (lsec.records[0].get("cnt")  > 0 );

        // check the admin role
        this.neodb.isAdmin = !this.neodb.securityEnabled; // default
        //console.log('this.neodb.isAdmin a ' + this.neodb.isAdmin);
        if (this.neodb.securityEnabled === true) {
            // this is the default security is on
            if (this.neodb.majorVersion < 4 ) {
                let adminCheck = await this.runQuery(session, "call dbms.security.showCurrentUser() yield roles return roles");
                this.neodb.isAdmin =adminCheck.records[0].get("roles").includes("admin");
            } else {
                let adminCheck = await this.runQuery(session, "call dbms.showCurrentUser() yield roles return roles");
                this.neodb.isAdmin =adminCheck.records[0].get("roles").includes("admin");
            }
        }
        //console.log('this.neodb.isAdmin b ' + this.neodb.isAdmin);

        // assuming authEnabled is true (the default)
        // only when isAdmin then we can check more
        // console.log(' is Admin ? ' + this.neodb.isAdmin);
        //console.log(this.neodb);
       //if (this.neodb.isAdmin == true) {
        if (this.neodb.majorVersion > 3) {
            // multidatabase !
            // console.log("MULTI DATABASE!!!")
            if (this.neodb.isAdmin == true) {
                // check if there is a fabric db configured
                let reco = await this.runQuery(session, "call dbms.listConfig() yield name, value where name = 'fabric.database.name' return  value");
                let fabricDatabaseName = "_";
                if (reco.records && reco.records.length == 1) {
                    // there is a fabric configured
                    this.neodb.setFabricDatabaseName(reco.records[0].get("value").toString());
                }
            }
            // get system session
            let databasesbase = [];
            let databasenames = [];
            let syssession = this.getReadSession("system");
            let sysrecs = await this.runQuery(syssession, " show databases ");
            let current = this;
            sysrecs.records.forEach(function (rcd) {
                //console.log(rcd);
                if (rcd.get("currentStatus") == "online") {
                    if (current.__dbinfoNotExists(databasesbase, rcd)) {
                        databasesbase.push(rcd);
                    }
                }
            });
            this.neodb.setDatabases(databasesbase);
            // if we have a cluster
            if (this.neodb.isCluster) {

                let keys = this.driverMap.keys();
                for (let key of keys) {
                    for (let db of databasesbase) {
                        databasenames.push(db.get("name") + "@" + key);
                    }
                }
            } else {
                for (let db of databasesbase) {
                    databasenames.push(db.get("name"));
                }
            }
            this.neodb.databasenames = databasenames;
            //console.log("---------- databasenames");
            //console.log(databasenames);

            //
            // Checking if yser has admin rights
            //
        } else {
            // this can be a cluster bases on version 3
            // then we have a one database in each cluster member
            if (this.neodb.isCluster) {
                let databases = [];
                let keys = this.driverMap.keys();
                for (let key of keys) {
                    databases.push("db@" + key);
                }
                this.neodb.databasenames = databases;
            }
        }

        // check if apoc is available
        let apc = "call dbms.procedures() yield name where name starts with 'apoc.' return count(*) as cnt";
        let apoccheck = await this.runQuery(session, apc);
        this.neodb.apocAvailable = (apoccheck.records[0].get("cnt") > 0);
        // check if apoc.log.stream is available.
        this.neodb.apocLogStreamAvailable = false;
        if (this.neodb.apocAvailable && this.neodb.apocAvailable == true) {
            let apcstream = "call apoc.help('apoc.log.stream') yield name return count(name) as cnt";
            let apcstreamcheck = await this.runQuery(session, apcstream);
            this.neodb.apocLogStreamAvailable = (apcstreamcheck.records[0].get("cnt") > 0);
        }
        //console.log(this.neodb);
        session.close();
        return this.neodb;
    }

    __dbinfoNotExists(alist, adbinfo) {
        let notExists = true;
        let curName = adbinfo.get("name");
        for (let i = 0; i < alist.length; i++) {
            let dbi = alist[i];
            if (dbi.get("name") == curName) {
                return false;
            }
        }



        return notExists;
    }
    getWriteSession( dbname) {
        let drv = this.neo4jDriver;
        let dbn = dbname;
        if (dbname && dbname.indexOf("@") > -1) {
            // cluster env
            drv = this.driverMap.get(dbname.split("@")[1]);
            dbn = dbname.split("@")[0];
        }
        let sess;
        if (dbn && this.neodb.majorVersion > 3 && dbn != 'db') {
            sess = drv.session({defaultAccessMode: neo4j.session.WRITE, db: dbn});
        } else {
            sess = drv.session(neo4j.session.WRITE);
        }
        return sess;
    }

	getReadSession(dbname) {
        //console.log(" getReadSession for " + dbname);
        let drv = this.neo4jDriver;
        let dbn = dbname;
        if (dbname && dbname.indexOf("@") > -1) {
            // cluster env
            drv = this.driverMap.get(dbname.split("@")[1]);
            dbn = dbname.split("@")[0];
        }
        let sess;
        //console.log(this.neodb);
        if (dbn  && dbn != 'db' && dbn.length > 2) {
            // && this.neodb.majorVersion > 3 this can be called befor the version check.
            //we are assuming now that when a database name is given then it should use that dbname
            sess = drv.session({ defaultAccessMode: neo4j.session.READ, database: dbn});
        } else {
            sess = drv.session(neo4j.session.READ);
        }
        return sess;
    }

    async getLabels(session) {
        let rs = await this.runQuery(session, "call db.labels() yield label return label");
        let labels = [];
        rs.forEach(function (rcd) {
            labels.push(rcd.get("label").toString());
        });
        return labels;
    }


    async getRelationshipTypes(session) {
        let rs = await this.runQuery(session, "call db.relationshipTypes() yield relationshipType return relationshipType");
        let relationshipTypes = [];
        rs.forEach(function (rcd) {
            let rst = rcd.get("relationshipType").toString();
            relationshipTypes.push(rst);
        });
        return relationshipTypes;
    }


    async runQuery(session, qry, params) {
//        console.log(qry);
        let rs = await this.runQueryBase(session, qry, params);
        await rs;
        return rs;
    }
    async runQueryBase(session, qry, params) {
        let current = this;
        let records = [];
        let results;
        let prom = session.run(qry, params);
        //await prom;
        // prom.catch(function (error) {
        //         let msg = error.message;
        //         if (msg.startsWith("There is no procedure with the name `db.schema`")) {
        //             msg = "The Neo4j Database Count report is dependend on db.schema() which is available on neo4j 3.1 and higher";
        //         }
        //         if (msg.indexOf("NoSuchFileException",0) > -1 && msg.indexOf("apoc.log.stream", 0) > -1) {
        //             msg = "There is no query.log file available on the server, try to switch Query logging on in the Query Log Settings tab";
        //         }
        //         let cs = document.getElementById("appSummary").innerHTML;
        //         document.getElementById("appSummary").innerHTML = cs + '<br/>ERROR: ' + msg;
        //     });
        return prom;
    }


}

class NeoDb {

    constructor(aName, aVersion, aEdition, defaultDatabase) {
        // later on there mus be a space to have the db name?
        this.name = aName;
        this.version = aVersion;
        this.edition = aEdition;
        this.defaultDatabase = null;

        if (defaultDatabase && defaultDatabase != '') {
            this.defaultDatabase = defaultDatabase;
        }
        let vstring = "" + aVersion;
        let varray = vstring.split(".");
        this.majorVersion = parseInt(varray[0],10);
        this.minorVersion = parseInt(varray[1], 10);
        this.patchVersion = parseInt(varray[2], 10);
        this.fabricDatabaseName = "_";
    }

    setDatabases(aDatabaseList) {
        this.databases = aDatabaseList;
    }

    setFabricDatabaseName(fdbn) {
        this.fabricDatabaseName = fdbn;
    }

    isEnterprise() {
        return "enterprise" == this.edition;
    }
    isFabricDatabase(adbname) {
        return this.fabricDatabaseName == adbname;
    }

    getDefaultDatabaseName() {
        // this is the database which is marked as 'default' in the db configuration
        // note it it possible that this is not the case then the defaultDatabase is returned;
        if (this.defaultDatabase && this.defaultDatabase != '') {
            return this.defaultDatabase;
        } else {
            if (this.databases && this.databases.length > 0) {
                for (let i = 0; i < this.databases.lenth; i++) {
                    let dbinfo = this.databases[i];
                    if (dbinfo.default && dbinfo.default == true) {
                        return dbinfo.name;
                    }
                }
            }
        }
        return "";
    }
}