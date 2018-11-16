# query-analyzer-app

run in the browser
- goto release and download zip.
- open index.html in the browser


run in the neo4j desktop

add the following to the file '~/Library/Application Support/Neo4j Desktop/Application/graphApps.json'

``` 
{  
  "appId": "neo4j-qlog-analyzer",
  "appName": "Query Log Analyzer",
  "packageUrl": "https://neo.jfrog.io/neo/api/npm/npm/query-log-analyzer"
}
```

for desktop 1.1.10+ :
 
- add the packageUrl above in the tab "Graph Applications"-"Install Graph Application"   
- select a Project and do "Add Application"    
