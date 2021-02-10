/*
datatable.js
Author: James Holland jholland@usgs.gov
datatable.js contains functions functions for the datatable found on both summary and station modes.
License: Public Domain
*/

var dTable; //DataTable object used throughout
var doFilter = true; //Boolean that controls whether to apply filters or not

var dTableAjaxMan = $.manageAjax.create('dTableAjaxMan',
    {
        queue: false,
        cacheResponse: false
    }
);

function bindTableActions() {
    dTable.find('tbody td').click(function(){
        let id = $(this).attr('id');
        if(id != undefined){
            if(id.charAt(0) == 'd')
                createDialog(id);
            else if(id.charAt(0) == 'l'){
                let station_id = id.split('_')[1]
                window.location = summary_url
                + '?network=' + mapGIDtoGName[mapSIDtoNID[station_id]]
                + '&station=' + mapSIDtoSName[station_id]
                + '&sdate=' + getStartDate('simple')
                + '&edate=' + getEndDate('simple')
                + '&tdate=' + getDateType();
            }
        }
    });

    //Highlight row
    $('#grid tbody').on('mouseenter', 'tr', function(){
        $(this).addClass('rowSelected');
    }).on('mouseleave', 'tr', function(){
        $(this).removeClass('rowSelected');
    });
}

function clearTable(){
    var rows = dTable.fnGetNodes();
    for( var i = 0; i<rows.length; i++){
        var cellTds = dTable.fnGetTds(rows[i]);
        //fnGetTds returns according to the internal data structure the j increment should match the column index.
        for( var j = 0; j<cellTds.length; j++){
            if(String($(cellTds[j]).attr("id")).charAt(0) == "d"){ //only clear data cells 
                dTable.fnUpdate("", rows[i], j, false, false); 
            }
            if(String($(this).attr("id")).charAt(0) == "a"){
                dTable.fnUpdate(parseFloat(0), rows[i], j, false, false);
            }

        }
    }
}

function buildTable(){
    var dataGrid = document.getElementById("grid");
    var metricsSorted = new Array();
    var metrics = new Array();
    var gridhead = $("#grid thead tr");
    for(header in mapMNametoMID) {
        if(mapMNametoMID.hasOwnProperty(header)) {
            metrics.push(header);
        }
    }
    metricsSorted = metrics.sort(naturalSort);
    if(pageType == "summary"){

        gridhead.append('<th id="network">Network</th>');
        gridhead.append('<th id="Station">Station</th>');
        gridhead.append('<th id="groups">Groups</th>');
        for( var i = 0; i<metricsSorted.length; i++){
            gridhead.append('<th id="' + mapMNametoMID[metricsSorted[i]] + '" title="' + mapMNametoMShort[metricsSorted[i]] + '">' + metricsSorted[i] + '</th>');
        }
        gridhead.append('<th id="aggregate">Aggregate</th>');

        for(station in mapSIDtoNID){
            if(mapSIDtoNID.hasOwnProperty(station)){
                var row = $(
                    '<tr id = "'+station+'"><td>'+mapGIDtoGName[mapSIDtoNID[station]]+'</td>'
                    +'<td id="l_'+station+'" class="ltd">'+mapSIDtoSName[station]+'</td>'
                    +'<td>,'+mapSIDtoGIDs[station]+',</td></tr>'
                );
                //Adding 1.01 causes datatables to automatically set the column types to numeric
                for( var i = 0; i<metricsSorted.length; i++){
                    row.append('<td id="d_'+mapMNametoMID[metricsSorted[i]]+'_'+station+'">1.01</td>');
                }
                //Append aggregate cell here
                row.append('<td id="a_'+station+'">1.01</td>');

                $("#grid tbody").append(row);
            }
        }

    }else if(pageType == "station"){
        gridhead.append('<th id="location">Location</th>');
        gridhead.append('<th id="channel">Channel</th>');
        for( var i = 0; i<metricsSorted.length; i++){
            gridhead.append('<th id="' + mapMNametoMID[metricsSorted[i]] + '" title="' + mapMNametoMShort[metricsSorted[i]] + '">' + metricsSorted[i] + '</th>');
        }
        gridhead.append('<th id="aggregate">Aggregate</th>');

        for(channel in mapCIDtoCName){
            if(mapCIDtoCName.hasOwnProperty(channel)){
                var row = $(
                    '<tr id = "'+channel+'"><td>'+mapCIDtoLoc[channel]+'</td>'
                    +'<td>'+mapCIDtoCName[channel]+'</a></td></tr>'
                );
                //Adding 1.01 causes datatables to automatically set the column types to numeric
                for( var i = 0; i<metricsSorted.length; i++){
                    row.append('<td id="d_'+mapMNametoMID[metricsSorted[i]]+'_'+channel+'">1.01</td>');
                }
                //Add Aggregate column
                row.append('<td id="a_'+channel+'">1.01</td>');

                $("#grid tbody").append(row);
            }
        }
    }
}

//Adds a filtering method that removes empty rows
$.fn.dataTableExt.afnFiltering.push(
    function(oSettings, aData, iDataIndex){
        if (!doFilter) return true;
        var rowlen = aData.length;

        dTable = $('#grid').dataTable();
        var rows = dTable.fnGetNodes();
        var cellTds = dTable.fnGetTds(rows[iDataIndex]);

        for (var c = 0; c < rowlen; c++){
            if (isNaN(parseFloat(aData[c])) == false && String($(cellTds[c]).attr("id")).charAt(0) == "d"){ //only look at data columns
                return true;
            }
        }

        return false;
    }
);

//Basic initialization and setup for datatable
function initializeTable(){

    dTable = $('#grid').dataTable({
        "bJQueryUI": true,
        "bPaginate": false
        //        ,"sScrollY":"300px"
        ,"sScrollY": (window.innerHeight - 220)+"px"
        // ,"sScrollYInner": "110%"
        ,"sScrollX": "100%"
        //,"sScrollXInner": "5200px"
        ,"bScrollCollapse": true
        //,"sDom": 'TC<"clear">lfrtip'
    });
    if (pageType == "summary"){
        dTable.fnSetColumnVis(2, false);
    }
    dTable.fnSort([
        [0, 'asc'],
        [1, 'asc']
    ]);
}

function formatTableTools(button, icon){
    $(button).removeClass('DTTT_button');
    $(button).button({icons: {primary: icon}});
    $('.DTTT_container').buttonset();
}

//fillTable() queries the CGI for data, parses it with parseDataReturn(), then calls processAllAggr().
//It uses global variable numCols to track how many columns have been updated.
function fillTable(){
    resetPercents();
    dTableAjaxMan.abort();
    /*$.manageAjax.destroy('dTableAjaxMan');
    dTableAjaxMan = $.manageAjax.create('dTableAjaxMan',
    {
    queue: false,
    cacheResponse: false
    }
    );*/

    if (pageType == "summary"){

        var rowIDs = new String(); //Will contain a list of delimited channel/station IDs EG 20-21-22-35
        rowIDs = "";
        var dates = getQueryDates();
        var oldSearch = dTable.fnSettings().oPreviousSearch.sSearch;
        for (var SID in mapSIDtoSName){
            if (mapSIDtoSName[SID].toUpperCase().indexOf(oldSearch.toUpperCase()) > -1){
                rowIDs = rowIDs + "-" + SID;
            }
        }
        rowIDs = rowIDs.substr(1); //trims initial "-" from the string
        $.each(dTable.fnSettings().aoColumns, function(c){
            if(dTable.fnSettings().aoColumns[c].bVisible == true){
                if(mapMNametoMID[dTable.fnSettings().aoColumns[c].sTitle]){
                    var metricID = mapMNametoMID[dTable.fnSettings().aoColumns[c].sTitle];
                    dTableAjaxMan.add({
                        success: function(data){
                            parseDataReturn(data, metricID);
                            if(dTableAjaxMan.inProgress <= 1){
                                processAllAggr();//compute aggregate This is called twice during the first load
                                doFilter = true;
                                dTable.fnDraw();
                            }
                        },
                        url: metrics_url,
                        data: {cmd: "stationgrid", param: "station."+rowIDs+
                            "_metric."+metricID+"_dates."+dates}
                    });
                }
            }
        });
    } else if (pageType == "station"){
        var rowIDs = new String(); //Will contain a list of delimited channel/station IDs EG 20-21-22-35
        rowIDs = "";
        var dates = getQueryDates();
        var oldSearch = dTable.fnSettings().oPreviousSearch.sSearch;
        for (var CID in mapCIDtoCName){
            if (mapCIDtoCName[CID].toUpperCase().indexOf(oldSearch.toUpperCase()) > -1){
                rowIDs = rowIDs + "-" + CID;
            }
        }
        rowIDs = rowIDs.substr(1); //trims initial "-" from the string
        $.each(dTable.fnSettings().aoColumns, function(c){
            if(dTable.fnSettings().aoColumns[c].bVisible == true){
                if(mapMNametoMID[dTable.fnSettings().aoColumns[c].sTitle]){
                    var metricID = mapMNametoMID[dTable.fnSettings().aoColumns[c].sTitle];
                    dTableAjaxMan.add({
                        success: function(data){
                            parseDataReturn(data, metricID);
                            if(dTableAjaxMan.inProgress <= 1){
                                processAllAggr();//compute aggregate This is called twice during the first load
                                doFilter = true;
                                dTable.fnDraw();
                            }
                        },
                        url: metrics_url,
                        data: {cmd: "channelgrid", param: "channel."+rowIDs+
                            "_metric."+metricID+"_dates."+dates}
                    });
                }
            }
        });
    }
}

function parseDataReturn(data,mid){
    var rows = new Array();
    rows = data.split("\n");
    for(var i = 0; i <rows.length; i++){
        row = rows[i].split(","); //stationID/channelID, value, percentage
        if(row[0] && row[1] && mid){ //Check if id, value, and metricID exist
            addPercent(row[0], mid, row[2]);
            var cell = document.getElementById("d_"+mid+"_"+row[0]);
            if(cell){
                var pos = dTable.fnGetPosition(cell);
                $("#d_"+mid+"_"+row[0]).addClass("ltd");
                //Double parseFloat() drops excess 0's
                dTable.fnUpdate(parseFloat(parseFloat(row[1]).toFixed(2)), pos[0], pos[2], false, false);
            }
        }
    }
}

//Called in by btnRefresh created in header.js.  Calling refresh will clear and repull data on a built table.
function refreshTable(){
    doFilter = false;
    dTable.fnDraw();
    clearTable();
    fillTable();
}

