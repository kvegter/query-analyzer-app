/****************************************************************************
 ** Neo4j Database Accessor using bolt
 **
 ***************************************************************************/
'use strict';


class NeoAccessor {


    constructor(desktopAPI,  dataDependentApp) {
        this.dapi = desktopAPI;
        this.useEnc = false;
        this.neoConnection = false;
        this.dataDependentApp = dataDependentApp;
    }

    async init() {
        let prms;
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
                    this.neo4jApiUrl = "bolt" + "://" + this.neoHost + ":" + this.graphdb.connection.configuration.protocols.bolt.port;

                    this.neo4jDriver = this.getDriver(this.graphdb.connection.configuration.protocols.bolt.password);
                    this.neoConnection = true;
                    console.log("Connected to database server " + this.neoHost + " with user " + this.neoUser) ;
                    prms= this.getNeo4jVersion();
                    await prms;
                    this.dataDependentApp.init();
                }
            } else {
                console.log(" There is no active database in the neo4j desktop. Only the Query Log functionality is available");
                this.showModalWindow("Remark","There is no active database in the neo4j desktop. Only the Query Log functionality is available");
            }
        }  else {
            this.showConnectForm();
            console.log(" No active Database, start a database in the Neo4j Desktop first")
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


    async _initNeo(neoHost, neoPort, neoScheme,  neoUser, neoPassword, useEncrypted) {
        let prms;
        try {
            this.neoHost = neoHost;
            this.neoPort = neoPort;
            this.neoUser = neoUser;
            this.neoScheme = neoScheme;
            if (useEncrypted != null) {
                this.useEnc = useEncrypted;
            }
            let boltURL = "bolt" + "://" + this.neoHost + ":" + this.neoPort;
            this.neo4jApiUrl = this.neoScheme + "://" + this.neoHost + ":" + this.neoPort;
            this.neo4jDriver = await this.getDriver(neoPassword);

            console.log("Connected to database server " + this.neoHost + " with user " + this.neoUser) ;
            this.neoConnection = true;

            prms = this.getNeo4jVersion();
            await prms;
            prms = this.dataDependentApp.init();
            await prms;
        } catch (e) {
            let retryAction = '<button class="ui aprove button" onClick="nac.showConnectForm();" role="button" style="display: block; margin-left: auto; margin-right: auto;"><i class="icon refresh"></i> Try Again</button>'

            console.log(" IN CATCH");
            console.log(e);
            this._showErrorWarning(retryAction, "Connection Error", e);
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
        let content = '<div class="ui red segment">' + aError + '</div>';
        // ""

        if (aError.message.indexOf("WebSocket connection failure.") > -1) {
            content +='<div class="ui oranger segment">Your Neo4j server maybe not running or the Connection problems can be caused by using untrusted SSL certificates on your server. Either install trusted certificates, or try again without encryption.</div>';
        }
        errorContent.innerHTML = content;
        errorActions.innerHTML = defaultAction;
        // now popup
        $('#errorModal').modal('show');
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
        //console.log("something changed in the form");
        let lhost = document.getElementById("f_host").value;
        let lport = document.getElementById("f_port").value;
        let lusername = document.getElementById( "f_username").value;
        let lpassword = document.getElementById("f_password").value;
        let lencrypted = document.getElementById("f_cbencrypted").checked;
        //console.log("lhost" + lhost);
        //console.log("lport" + lport);
        //console.log("lusername " + lusername);
        //console.log("lpassword " + lpassword);
        //console.log("lencrypted " + lencrypted);
        if (lhost && lport && lusername && lpassword) {
            //console.log(" data filled");
            this._enableElement("connectButton");
        } else {
            this._disableElement("connectButton");
            //console.log(" data not filled");
        }
    }

    async showConnectForm() {
        // $('#connectModal').modal('destroy');
        $('#connectModal').modal('show');
        //console.log("after show")

    }

    processConnectForm() {
        //console.log("process connect form start");
        //
        let lhost = document.getElementById("f_host").value;
        let lport = document.getElementById("f_port").value;
        let lscheme = document.getElementById("f_scheme").value;
        let lusername = document.getElementById( "f_username").value;
        let lpassword = document.getElementById("f_password").value;
        let lencrypted = document.getElementById("f_cbencrypted").checked;
        //console.log(lencrypted);
        this._initNeo(lhost, lport,lscheme, lusername, lpassword, lencrypted);

    }

    getDriver(pw) {
        let drv = null;
        if (!this.neo4jDriver || this.neo4jDriver == null ){
            let conf = {encrypted : "ENCRYPTION_ON", disableLosslessIntegers: false}; // default
            console.log(" this.useEnc " + this.useEnc);
            if (!this.useEnc) {
                conf.encrypted = "ENCRYPTION_OFF";
            }

            // version 2 of the driver does not use v1 anymore
            console.log("connecting to " + this.neo4jApiUrl );
            drv = neo4j.driver(this.neo4jApiUrl, neo4j.auth.basic(this.neoUser, pw), conf);
        } else {
            drv = this.neo4jDriver;
        }
        return drv;
    }

    async getNeo4jVersion() {
        let session = this.getReadSession();
        if (!session) {
            return 0;
        }

        let reco = await this.runQuery( session, "call dbms.components() yield name, versions, edition return name, versions, edition");
        let rec = reco.records[0];
        this.neodb = new NeoDb(rec.get("name"),rec.get( "versions"),rec.get( "edition") );

        if (this.neodb.majorVersion > 3) {
            // multidatabase !
            // get system session
            let databases = [];
            let syssession = this.getReadSession("system");
            //console.log(syssession);
            let sysrecs = await this.runQuery(syssession, " show databases");
            sysrecs.records.forEach(function (rcd) {
                let lind = rcd.toObject();
                databases.push(lind);
            });
            this.neodb.setDatabases(databases);
        }
        return this.neodb;
    }

    getWriteSession(dbname) {
        let drv = this.getDriver();
        let sess;
        if (dbname && this.neodb.majorVersion > 3) {
            sess = drv.session({defaultAccessMode: neo4j.session.WRITE, db: dbname});
        } else {
            sess = drv.session(neo4j.session.WRITE);
        }
        return sess;
    }

	getReadSession(dbname) {
        let drv = this.getDriver();
        let sess;
        //console.log(this.neodb);
        if (dbname&& this.neodb.majorVersion > 3) {
            //console.log(" checking multi db");
            sess = drv.session({ defaultAccessMode: neo4j.session.READ, database: dbname});
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
        return rs;
    }
    async runQueryBase(session, qry, params) {
        let current = this;
        let records = [];
        let results;
        let prom = session.run(qry, params);
        //await prom;
        prom.catch(function (error) {
                let msg = error.message;
                if (msg.startsWith("There is no procedure with the name `db.schema`")) {
                    msg = "The Neo4j Database Count report is dependend on db.schema() which is available on neo4j 3.1 and higher";
                }
                let cs = document.getElementById("appSummary").innerHTML;
                document.getElementById("appSummary").innerHTML = cs + '<br/>ERROR: ' + msg;
            });
        return prom;
    }


}

class NeoDb {

    constructor(aName, aVersion, aEdition) {
        // later on there mus be a space to have the db name?
        this.name = aName;
        this.version = aVersion;
        this.edition = aEdition;
        let vstring = "" + aVersion;
        let varray = vstring.split(".");
        this.majorVersion = parseInt(varray[0],10);
        this.minorVersion = parseInt(varray[1], 10);
        this.patchVersion = parseInt(varray[2], 10);

    }

    setDatabases(aDatabaseList) {
        this.databases = aDatabaseList;
    }

    isEnterprise() {
        return "enterprise" == this.edition;
    }

}