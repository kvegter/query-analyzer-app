### 1.0.6
_This release supports query log information from Neo4j version 3.1 to v4.4_

* Support for Aura Query log files.

### 1.0.5
_This release supports query log information from Neo4j version 3.1 to v4.4_

* Fixing date parsing in Safari browser
* Improved Login Form

### 1.0.4
_This release supports query log information from Neo4j version 3.1 to v4.4_

* Fixing an issue when running a 3.x cluster
* Improved login form

### 1.0.3
_This release supports query log information from Neo4j version 3.1 to v4.3_

* Support for query.log in json format
* Capable to work with servers where security is off.
* Cluster support: In Current Queries and Query Stats it is visible on which server in the cluster the db is the leader (blue db icon). 
* Cluster support: Added server instance id to the unfinished queries list

### 1.0.2
_This release supports query log information from Neo4j version 3.1 to v4.2_

* Filter the queries in the Query Analysis tab
* Stream the current query.log entries directly from the server (v3.5+, apoc required)
* Supports Neo4j Cluster configurations 
* Change query log configuration (dynamic settings)
* Updated layout with a left bar for access to the Query Log, Current Queries and Query Stats
* Updates with respect to Neo4j 4.1 (query plan, query log record format)
* fixes for supporting encrypted connections
* show error messages if they are logged (v4+)
* show unfinished queries (v4+)

### 1.0.1

* added explain query functionality
* see the list of current running queries in the database
* see the query stats of the last 8192 invocations (3.5.4+)
* order on columns in Query Log Summary, Current Queries and Query Stats
* multi-db enabled (neo4j version 4 and higher)

### 0.0.5

* renamed app from neo4j-qlog-analyzer to query-log-analyzer 
* UI improvements