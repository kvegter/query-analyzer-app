
### 1.0.2
* Updated layout with a left bar for access to the Query Log, Current Queries and Query Stats
* Stream the current query.log entries directly from the server
* Can handle Neo4j Cluster and Neo4j Aura configurations, getting the query logs of all the servers in one view
* Change query log configuration (dynamic settings)
* Updates with respect to Neo4j 4.1 (query plan, query log record format)
* fixes for supporting encrypted connections
* show error messages if they are logged (v4+)

(This release supports query log information until Neo4j v4.1)

### 1.0.1

* added explain query functionality
* see the list of current running queries in the database
* see the query stats of the last 8192 invocations (3.5.4+)
* order on columns in Query Log Summary, Current Queries and Query Stats
* multi-db enabled (neo4j version 4 and higher)

### 0.0.5

* renamed app from neo4j-qlog-analyzer to query-log-analyzer 
* UI improvements