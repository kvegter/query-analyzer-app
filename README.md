# query-analyzer-app

The query log analyzer is a Neo4j Desktop App to help you to understand the query log file of a Neo4j Enterprise server. 
In version 1.0.1 it is now possible to see the current running queries on a database and see the query stats of the latest 8192 queries (version 3.5.4+).

```
run in the neo4j desktop (1.1.10+)
- add the following Url in the tab "Graph Applications"-"Install Graph Application":
  https://neo.jfrog.io/neo/api/npm/npm/query-log-analyzer
- select a Project and do "Add Application"    
```   
When you experience slowness of the Neo4j server your queries may be inefficient or for example the query load on the server is too high. A good step is then to switch on the query log via the neo4j.conf file. Normally you will set a threshold to log only those queries which take more than an x amount of time (start with 100ms for example). This means that the queries shown in the query log tool are not the complete query load on the server! This tool however can give you a direction to find the possible causes for your query bottlenecks quickly. 
It is good practice to switch the query logging on for development and test servers and analyze your queries frequently when you develop your solution.  

Besides analyzing the query log files in the '__Query Log__' tool from version 1.0.1 it is possible to connect to a database and get a list of current running queries in the '__Current Queries__' tool or retrieve the query statistics in the '__Query Stats__' tool. 
So even without the query log file you can now check the query load on your neo4j server.
<img src="qatool.png"/>


## Query Log 

The Query Log Analyzer needs a query.log file. You can upload this file to the tool and then the tool will analyze this file. After analyzing the file the following message will be shown:
<img src="qla.png"/>

In this example the query log file has 26 rows (each query one row) and 6 distinct queries are found. These 6 distinct queries are shown in the “Query Analysis” tab where you can find per query the statistics. 

### Query Analysis
In the Query Analysis Tab you will see the distinct queries ordered by Query Count * Avg Time descending. Which means that the most expensive query from the log file is placed on top.
<img src="qatab.png"/>

- The Query (the cell below AvgTime - Avg Mem values)

   This is the actual ‘distinct’ query string where Cypher key words are Highlighted.
  - Query Count (sorting possible)

    The count of this distinct query in the log file. 
  - <img src="filtericon.png"/> 
  
    Show only the query log records for this query in the Query Log Tab.
    
  - <img src="highlighticon.png"/>
  
    Highlight this query in the query log records in the Query Log Tab. It can be useful to see which queries are send to the server around the same time. 
  - <img src="timelineicon.png"/>
  
    Experimental; Show the occurrences of this query in the Query Timeline tab.
    
  - <img src="explainicon.png"/> 
  
    The query plan will be shown (explain). This is only available when there is a connection to a database and the query is not executed on the database 'system' (version 4+):
    
    <img width="400px" src="explainquery.png"/>
    
  - <img src="dbicon.png"/>

   Database Name (version 4+)
   
   When the query log file is from a version 4+ server then a label with the database name is shown where this query was executed on.
    
    
- Avg Time, Min Tim, Max Time

  The Time is here the total time the query uses to execute (query cpu + planning + waiting).
- Avg CPU 

  This is actual query execution time on the CPU. When time logging is disabled a 0 will be shown here. 
  
  ```requires: dbms.logs.query.time_logging_enabled=true and dbms.track_query_cpu_time=true```
- Max Planning

  This is the maximum time spend in the query plannings phase. When you hover over the value you will see also the Min and Avg planning times. Normally the first time a query is fired the query is planned and the query execution plan is placed in the query cache. So the next time a query is executed the Planning time will be almost 0. When Time logging is disabled a 0 will be shown here.

  ```requires: dbms.logs.query.time_logging_enabled=true``` 
- Avg Waiting

  The average waiting time before executing the query. The wait can be caused by heavy loads, so the query has to wait to get some execution time or the wait can be caused by waiting for database locks to be released. When Time logging is disabled a 0 will be shown here.

  ```requires: dbms.logs.query.time_logging_enabled=true ```
- Cache Hits %

  This gives the percentage of the data for this query can be loaded from cache. 100% means that all the data is read from cache.

  ```requires: dbms.logs.query.page_logging_enabled=true ```
  
- Avg Mem

  This is the average allocated bytes in memory of this query. Note that this is a cumulative value and tells something about how memory intensive the query was.

  ```requires: dbms.logs.query.allocation_logging_enabled=true and dbms.track_query_allocation=true```

- Protocol + Clients

  With Protocol you can see in which context the query is fired from. Values can be: 
  - bolt

    This is any bolt client connecting to the database.
  - http
  
    This is any http client using the neo4j rest interface (applicable to older neo4j versions)
  - embedded 
    
    This is a cypher call from database logic like procedures and functions.

  Also a client list is shown, this may be useful to identify how many different ip numbers are sending requests to the neo4j server. Note that the bolt driver keeps a pool of connections open to the database, so you can have many clients from one ip number. 

## Query Log

<img src="qlt1.png"/>
<img src="qlt2.png"/>

The query log tab shows every query log row with proper headings. There is a lot of information in there so you need to scroll horizontally to see all the columns. From the First Query Analysis tab you can click on Highlight, then the selected query is highlighted. When you press “Filter” from the first tab only those query log records are shown in this tab. When you want to profile a query than you can copy the query and the used query parameters from this tab.

## Query Timeline

The Query Timeline is an experimental feature and it plots the amount of queries per time unit (default is 5 minutes) and the average query time in seconds. This is bases on the log time which is not the same as the query start time. It will give you a quick overview when it was very busy on the server. 
<img src="qtt.png"/>
