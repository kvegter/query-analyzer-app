'use strict';

class QueryLogParser {

    constructor(aQueryLogObject) {
        this.summary = {};
        this.loglines = [];
        // an object (json array) or String which have to be splitted.
    }

    getSummary() { return this.summary};
    getLogLines() {return this.loglines};

}