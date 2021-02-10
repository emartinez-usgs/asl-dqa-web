/*
header.js
Author: James Holland jholland@usgs.gov
header.js contains functions for creating the page's header
License: Public Domain
*/

function setupHeader(){
    var header = $("#header");
    header.append(
        "<button type='button' id='btnLegend'>Legend</button>"
    );

    $("#btnLegend").on("click",function(){
        $("#legend").dialog( "open" );
    });
    $("#legend").dialog({
        autoOpen: false,
        height: 650,
        width: 1000,
        modal: true
    });

    if(pageType == "station"){
        header.append(
            "<button type='button' id='btnSummary'>Summary</button>"
        );
        $("#btnSummary").on("click",function(){
            window.location = summary_url + "?&sdate=" + getStartDate("simple") + "&edate=" + getEndDate("simple") + "&tdate=" + getDateType();
        });

        header.append(
            "<span id='spnTitle' class='headerTitle'></span>"
        );
    }
    else if(pageType == "summary"){
        header.append("<span class='headerTitle'>Station Summary</span>");

    }
    header.append("<span class='headerVersion'>" + version + "</span>");
    //Adding span for dateRange now, but the dates and their controls will be added in the dateselection code.
    var rightSide = $("<span class='right'></span>");
    if(pageType == "summary"){
        rightSide.append(createGroupSelect("header"));
    }
    rightSide.append(createDateRangeSpan("header"));
    rightSide.append(
        "<button type='button' id='btnRefresh'>Update</button>"
    );
    header.append(rightSide);
    $("#btnRefresh").on("click",function(){
        refreshTable();
    });
    //Adds the actual jqueryui datepicker controls and theme
    bindDateRangeSpan("header");
}

//Must be called after setup data is parsed to get the station name
function setStationTitle(){
    var stationID = getQueryString("station");
    var networkID = getQueryString("network");
    var newTitle = networkID + "-" + stationID;
    $("#spnTitle").text(newTitle);
    document.title = "DQA "+newTitle;
}

function buildLegend(){
    var sorted_keys = Object.keys(mapMNametoMLong).sort()
    for (var i=0; i<sorted_keys.length; i++){
        $("#legendtable tbody").append('<tr><td>' + sorted_keys[i] + '</td><td>' + mapMNametoMLong[sorted_keys[i]] + '</td></tr>')
    }
}
