/*
setup.js
Author: James Holland jholland@usgs.gov
Setup.js contains the base objects and  calls for creating a menu, grid, and plotting.
License: Public Domain
*/

//Mappings
var mapTIDtoGIDs = {}; //TID = Group type ID, GID = Group ID
var mapTIDtoTName = {}; //TName = Group Type name
var mapTNametoTID = {}; //Allows for reverse lookups
var mapGIDtoGName = {}; // GName = Group Name
var mapSIDtoSName = {}; //SID = Station ID, SName = Station Name
var mapGIDtoSIDs = {};
var mapSIDtoNID = {}; //NID = Network ID
var mapMIDtoMName = {}; //MID = Metric ID, MName = Metric Name
var mapMNametoMID = {};
var mapMNametoMShort = {}; // Metric Name to Metric short description
var mapMNametoMLong = {}; // Metric Name to Metric long description
var mapSIDtoGIDs = {};
var mapCNametoCID = {};
var mapCIDtoCName = {};
var mapCIDtoLoc = {};
var groups = new Array();
var plots = {};
var plotdata = {};
var pageType = undefined; //Allows rest of functions to check page type without passing type around. It is only changed in getSetupData.

var version = "v2.1.0";

$(document).ready(function(){
    //Detect which type of page we are loading. If a stationID was passed in the query string it is station.
    var stationID;
    if (stationID = getQueryString("station")){
        pageType = "station";
    }
    else {
        pageType = "summary";
    }
    getSetupData();
    setupHeader();
});

$(document).ajaxStop(function(){ //This may compete with ajaxStop trigger in progressbar.js
    $(this).unbind("ajaxStop"); //Prevents ajaxStop from being called in the future. We only need it on initial load.
    setupTabs();
    resetWeights();
    processAllAggr();
    //Make all buttons jqueryui buttons
    $("button").button();
    setupDateType(); //Sets it to ordinal date if they were on ordinal date before.
});

function getSetupData(){
    if (pageType == "station"){
        var station = getQueryString("station");
        var network = getQueryString( "network");
        network = (network != null) ? "_network." + network : ''
        $.get(metrics_url,
            {cmd: "groups_dates_stations_metrics_channels", param: "station." + station + network},
            function(data){
                parseSetupResponse(data);
                setStationTitle(); //Sets the Title in the header like so "IU-ANMO" and changes document title to "DQA IU-ANMO"
                buildTable();
                initializeTable();
                clearTable(); //Clears 1.01 values before populating with proper values
                fillTable();
                bindTableActions();
                buildLegend();
            }
        ); 
    }
    else if (pageType == "summary"){
        $.get(metrics_url,
            {cmd: "groups_dates_stations_metrics"},
            function(data){
                parseSetupResponse(data);
                //populateGroups(); //We need to implement tabbing for this now
                buildTable();
                initializeTable();
                clearTable(); //Clears 1.01 values before populating with real values
                fillTable();
                bindTableActions();
                buildLegend();
            }
        );
    }
}

function parseSetupResponse(response){
    var rows = response.split(/\n/);
    for (var i =0; i< rows.length; i++){
        var parts = rows[i].split(',');  //Typical return like Type, TypeID, Values
        switch(parts[0]){
            case 'DE': //DE, YYYY-MM-DD End date
                if (parts.length != 2) {
                    continue;
                }
                setupLastDate(parts[1]);
                break;
            case 'DS': //DS YYYY-MM-DD  start Date
                if (parts.length != 2) {
                    continue;
                }
                setupFirstDate(parts[1]);
                break;
            case 'T': //T, GroupTypeID, GroupTypeName (Network, Country, etc), Groups associated with Type
                mapTNametoTID[parts[2]] = parts[1]; //Allows lookup by TName
                mapTIDtoTName[parts[1]] = parts[2];
                if (mapTIDtoGIDs[parts[1]] == undefined){
                    mapTIDtoGIDs[parts[1]] = new Array();
                }
                for (var t = 3; t<parts.length; t++){
                    mapTIDtoGIDs[parts[1]].push( parts[t]);
                }
                break;
            case 'G': //G, GroupID, GroupName (IU, CU, Asia, etc), GroupTypeID
                mapGIDtoGName[parts[1]] = parts[2];
                break;
            case 'S': //S, StationID, NetworkID, StationName, groupIDs
                mapSIDtoSName[parts[1]] = parts[3];
                mapSIDtoNID[parts[1]] = parts[2];
                for(var t=4; t<parts.length; t++){
                    if(mapGIDtoSIDs[parts[t]] == undefined){
                        mapGIDtoSIDs[parts[t]] = new Array();
                    }
                    mapGIDtoSIDs[parts[t]].push(parts[1]);
                    if(mapSIDtoGIDs[parts[1]] == undefined){
                        mapSIDtoGIDs[parts[1]] = new Array();
                    }
                    mapSIDtoGIDs[parts[1]].push(parts[t]);
                }
                break;
            case 'C': //C, ChannelID, ChannelName, LocationName, StationID
                mapCIDtoCName[parts[1]] = parts[2];
                mapCNametoCID[parts[2]] = parts[1];
                mapCIDtoLoc[parts[1]] = parts[3];
                break;
            case 'M': //M, MetricID, MetricName
                mapMIDtoMName[parts[1]]=parts[2];
                mapMNametoMID[parts[2]]=parts[1];
                mapMNametoMShort[parts[2]]=parts[3].substring(1, parts[3].length - 1); // Remove quotes
                mapMNametoMLong[parts[2]]=parts[4].substring(1, parts[4].length - 1); // Remove quotes
                break;
        }
    }
}

