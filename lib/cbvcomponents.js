'use strict';

class TwoHandleRangeSlider {
    constructor(containerId, config, handler) {
        // defaults
        // the handler should have a function "onSliderChange(params)"
        //console.log(" constructor TwoHandleRangeSlider");
        this.handler = handler;
        this.height = 30;
        this.width = 400;
        this.containerId = containerId;
        this.minValue = 0;
        this.maxValue = 100; // date later
        if (config) {
            this.height = config.height;
            this.width = config.width;
            this.minValue = config.minValue;
            this.maxValue = config.maxValue;
        }
    }
    async load() {
        let html = "";
        html += this._getCSS();
        html += '<div class="range_container" >\n' +
            '    <div class="sliders_control">\n' +
            '        <input id="fromSlider" type="range" value="0" min="0" max="1000"/>\n' +
            '        <input id="toSlider" type="range" value="1000" min="0" max="1000"/>\n' +
            '    </div>\n' +
            '    <div class="form_control">\n' +
            '        <div class="form_control_container">\n' +
            '            <input class="form_control_container__time__input" type="hidden" id="fromInput" value="0" min="0" max="1000"/>\n' +
            '        </div>\n' +
            '        <div class="form_control_container">\n' +
            '            <input class="form_control_container__time__input" type="hidden" id="toInput" value="100" min="0" max="1000"/>\n' +
            '        </div>\n' +
            '    </div>\n' +
            '</div>';
        let parent = document.getElementById(this.containerId);
        parent.innerHTML = html;
        const fromSlider = document.querySelector('#fromSlider');
        const toSlider = document.querySelector('#toSlider');
        //const fromInput = document.querySelector('#fromInput');
        //const toInput = document.querySelector('#toInput');
        this._fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', toSlider);
        this._setToggleAccessible(toSlider);

        fromSlider.oninput = () => this._controlFromSlider(fromSlider, toSlider);
        toSlider.oninput = () => this._controlToSlider(fromSlider, toSlider);
    }

    _controlFromSlider(fromSlider, toSlider) {
        const [from, to] = this._getParsed(fromSlider, toSlider);
        this._fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', toSlider);
        if (from > to) {
            fromSlider.value = to;
        }
        let displayInfo = this.handler.onSliderChange({from: from, to: to});
        let sliderPos = fromSlider.getBoundingClientRect();
        // console.log("FROM display info: " + displayInfo.fromDisplay + " slider pos X:" + sliderPos.x  + " Y:" + sliderPos.y);
        fromSlider.title = displayInfo.fromDisplay;

    }

    _controlToSlider(fromSlider, toSlider) {
        const [from, to] = this._getParsed(fromSlider, toSlider);
        this._fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', toSlider);
        this._setToggleAccessible(toSlider);
        if (from <= to) {
            toSlider.value = to;
        } else {
            toSlider.value = from;
        }
        let displayInfo = this.handler.onSliderChange({from: from, to: to});
        // console.log("TO display info: " + displayInfo.toDisplay);
        toSlider.title = displayInfo.toDisplay;
    }

    _getParsed(currentFrom, currentTo) {
        const from = parseInt(currentFrom.value, 10);
        const to = parseInt(currentTo.value, 10);
        return [from, to];
    }

    _fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
        const rangeDistance = to.max-to.min;
        const fromPosition = from.value - to.min;
        const toPosition = to.value - to.min;
        controlSlider.style.background = `linear-gradient(
      to right,
      ${sliderColor} 0%,
      ${sliderColor} ${(fromPosition)/(rangeDistance)*100}%,
      ${rangeColor} ${((fromPosition)/(rangeDistance))*100}%,
      ${rangeColor} ${(toPosition)/(rangeDistance)*100}%, 
      ${sliderColor} ${(toPosition)/(rangeDistance)*100}%, 
      ${sliderColor} 100%)`;
    }

    _setToggleAccessible(currentTarget) {
        const toSlider = document.querySelector('#toSlider');
        if (Number(currentTarget.value) <= 0 ) {
            toSlider.style.zIndex = 2;
        } else {
            toSlider.style.zIndex = 0;
        }
    }


    _getCSS() {
        let css = "<style>";
        css += `
.range_container {
    max-height : 75px;
}

.sliders_control {
  position: relative;
  min-height: 25px;
}

.form_control {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: 24px;
  color: #635a5a;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: all;
  width: 24px;
  height: 24px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #C6C6C6;
  cursor: pointer;
}

input[type=range]::-moz-range-thumb {
  -webkit-appearance: none;
  pointer-events: all;
  width: 24px;
  height: 24px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #C6C6C6;
  cursor: pointer;  
}

input[type=range]::-webkit-slider-thumb:hover {
  background: #f7f7f7;
}

input[type=range]::-webkit-slider-thumb:active {
  box-shadow: inset 0 0 3px #387bbe, 0 0 9px #387bbe;
  -webkit-box-shadow: inset 0 0 3px #387bbe, 0 0 9px #387bbe;
}

input[type="number"] {
  color: #8a8383;
  width: 50px;
  height: 30px;
  font-size: 20px;
  border: none;
}

input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button {  
   opacity: 1;
}

input[type="range"] {
  -webkit-appearance: none; 
  appearance: none;
  height: 2px;
  width: 100%;
  position: absolute;
  background-color: #C6C6C6;
  pointer-events: none;
}

#fromSlider {
  height: 0;
  z-index: 1;
}

`;
        css+= "</style>";
        return css;
    }
}

class FixedHeaderTable {
    constructor(containerId, config) {
        // defaults
        this.height = 700;
        this.subcontainerwidth = 1600;
        this.subcontainerheightextra = 50;
        this.containerId = containerId;
        this.tableclass = (containerId + "_fixedtable").replace("@","_"); // you cannot use a @
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

    async showTable() {
        let html = "";
        let tableContainer = document.getElementById(this.containerId);
        html += this._getCSS();
        html += "<div style='width: " + this.subcontainerwidth + "px; height: " + (this.height + this.subcontainerheightextra)  + "px; overflow: auto; ' >";
        html += this._createTableHeader();
        html += this.tablerowshtml;
        html += "</tbody></table>";
        html += "</div>";
        // console.log(" html \n " + html);
        tableContainer.innerHTML = html;
        //console.log("showTable " +  this.containerId);
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