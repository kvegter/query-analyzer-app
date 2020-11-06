'use strict';

class FixedHeaderTable {
    constructor(containerId, config) {
        // defaults
        this.height = 600;
        this.subcontainerwidth = 1600;
        this.subcontainerheightextra = 50;
        this.containerId = containerId;
        this.tableclass = containerId + "_fixedtable";
        this.head_background_color = "#e1eddd";
        this.fontSize = "1.0em";
        this.head_color = "#000000";
        this.borderLeft = "1px solid darkgreen";
        this.tableWidthFill = 10;
        this.columns = [];
        this.tablerowshtml = "";
        this.rowCount = 0;
        this.height = this.height - this.subcontainerheightextra;

        if (config) {
            if (config.headerColor) this.head_color = config.headerColor;
            if (config.headerBackgroundColor) this.head_background_color = config.headerBackgroundColor;
            if (config.height) this.height = config.height - this.subcontainerheightextra;
            if (config.fontSize) this.fontSize = config.fontSize;
            if (config.borderLeft) this.borderLeft = config.borderLeft;
            if (config.tableWidthFill) this.tableWidthFill = config.tableWidthFill;
            if (config.columns) this.columns = config.columns;
            if (config.subContainerWidth) this.subcontainerwidth = config.subContainerWidth;
        }
        // config options
        // { headerColor : #000000,
        //   headerBackgroundColor : #e1eddd
        //   head
        //   height : 600,
        //   fontSize: 1.0em,
        //   columns : [{ name: name, hoovertext: hoovertext, thAtrributes: attributes string , size : px }]
        //   borderLeft: 1px solid darkgreen
        //   tableWidthFill: 5

    }

    showTable() {
        let html = "";
        html += this._getCSS();
        html += "<div style='width: " + this.subcontainerwidth + "px; height: " + (this.height + this.subcontainerheightextra)  + "px; overflow: auto; ' >";
        html += this._createTableHeader();
        html += this.tablerowshtml;
        html += "</tbody></table>";
        html += "</div>";
        // console.log(" html \n " + html);
        document.getElementById(this.containerId).innerHTML = html;
    }

    _createTableHeader() {
        let html = "<table class='" + this.tableclass + "'><thead><tr>"
        for (let i=0; i< this.columns.length; i++) {
            let col = this.columns[i];
            let tha = "";
            if (col.thAttributes) {
                tha = col.thAttributes;
            }
            html+= "<th " + tha + " >" + col.name + "</th>";
        }
        html += "</tr></thead><tbody>"
        return html;
    }

    addTableRowAsHTML(aTRString) {
        // console.log("adding tr row:\n" + aTRString);
        // this must be a complete valid <tr></tr> construction, in theory more than one is also possible.
        this.tablerowshtml += aTRString + "\n";
    }
    addTableRowData(aValueArray) {
        // do something smart here with the alternating colors
        if (aValueArray && aValueArray.length > 0) {
            let html = "<tr>";
            for (let index = 0; index < aValueArray.length; index++) {
                html += "<td>" + aValueArray[index] + "</td>\n";
            }
            html+= "</tr>"
            this.tablerowshtml += html + "\n";
        }

    }
    _getCSS() {
        let css = "<style>";
        css += "  ." + this.tableclass + " { \n";
        css += "     width: " + this._getTableWidth() + "px; \n";
        css += "     table-layout: fixed; \n";
        css += "     border-collapse: collapse; \n";
        css += "     word-wrap: break-word; \n";
        css += "     font-size: " + this.fontSize + " ; \n";
        css += "  } \n";

        css += "  ." + this.tableclass + " th { \n" ;
        css += "     text-decoration: none; \n";
        css += "     border-left: " + this.borderLeft + "; \n"
        css += "   } \n";

        css += "  ." + this.tableclass + " th, \n" ;
        css += "  ." + this.tableclass + " td { \n" ;
        css += "     padding: 5px; \n";
        css += "     text-align: left; \n"
        css += "     border-left: " + this.borderLeft + "; \n"
        css += "   } \n\n";

        // columns
        for (let i=0; i< this.columns.length; i++) {
            let col = this.columns[i];
            let colnr = i + 1;
            css += "  ." + this.tableclass + " td:nth-child(" + colnr + "), \n";
            css += "  ." + this.tableclass + " th:nth-child(" + colnr + ") { \n";
            css += "     width: " + col.size + "px; \n";
            css += "  }\n\n";
        }
        css += "  ." + this.tableclass + " thead { \n" ;
        css += "     background-color: #e1eddd; \n";
        css += "     color: #000000; \n" ; // parametrise later
        css += "   } \n\n";

        css += "  ." + this.tableclass + " thead tr { \n" ;
        css += "     display : block; \n";
        css += "     position: relative; \n" ;
        css += "   } \n\n";

        css += "  ." + this.tableclass + " tbody { \n" ;
        css += "     display : block; \n";
        css += "     overflow-y: auto; \n" ;
        css += "     overflow-x: hidden; \n" ;
        css += "     width: " + this._getTableWidth() + "px; \n" ;
        css += "     height: " + this.height + "px; \n" ;
        css += "   } \n\n";

        css+= "</style>";
        return css;
    }
    _getTableWidth() {
        let totalwidth = 0;
        for (let i=0; i<this.columns.length; i++) {
            let col = this.columns[i];
            totalwidth += col.size;
        }

        return totalwidth + this.tableWidthFill;
    }
}