/*
plot.js
Author: James Holland jholland@usgs.gov
plot.js contains functions for creating plot windows and actual plotting
License: Public Domain
*/

function plotTemplate(id, title){
    var dialog = $("<div id='dia"+id+"' title='"+title+"'></div>").dialog({
        width: 800,
        height: 550,
        close: function(event, ui){
            $("#dia"+id).remove();
        }
    });
    var plotTarget = $("<div id='plot"+id+"'></div>");

    dialog.append(plotTarget);
    dialog.append("<button class='button' id='btn"+id+"' value='"+id+"'>Zoom out</button>");
    dialog.append("<button class='button' style='margin-left:10px;' id='imagebtn"+id+"' value='"+id+"'>View Plot Image</button>");

    return dialog;
}

function createDialog(id){
    var ids = id.split("_");
    var pid = ids[1]+"_"+ids[2]; //removes the "d_" from the front of the id
    var title = undefined;

    if (pageType == "summary"){
        title = mapGIDtoGName[mapSIDtoNID[ids[2]]]+"-"+mapSIDtoSName[ids[2]]+" "+mapMIDtoMName[ids[1]];
    }
    else if (pageType == "station"){
        var stationID = getQueryString("station");
        var stationName = mapGIDtoGName[mapSIDtoNID[stationID]]+"-"+mapSIDtoSName[stationID];
        title = stationName+" "+mapCIDtoLoc[ids[2]]+"-"+mapCIDtoCName[ids[2]]+" "+mapMIDtoMName[ids[1]];
    }
    else
        title = "ERROR page type not defined";

    //We may want the ability to have multiple of the same plot up to compare different date ranges.
    //If we do try to implement this, there is a bug. When the last dialog is closed, the first disapears, but doesn't get removed. Same with Second to last and second.
    if($("#dia"+pid).length) //If dialog exists, close it.
        $("#dia"+pid).dialog("close");
    getPlotData(ids, pid, title);
}

function bindPlot(pid, title){
    if (plotdata[pid].length > 0){ //Check if data was returned, if none was returned don't plot anything.
        $('#html').append(plotTemplate(pid, title));
        // If max === min then jqplot does strange scaling so force the issue by getting the max and min and manually setting max and min
        var data = [];
        $.each(plotdata[pid], function(index, item){data.push(item[1])});
        // jqplot does some strange things with scaling so fix those areas, mainly if max = min
        var ymax = Math.max(...data);
        var ymin = Math.min(...data);
        var ydelta = ymax - ymin;
        if(ymax === ymin) {
            ymax = ymax + 1.0;
            ymin = ymin - 1.0;
        }
        else{
            ymax = null;
            ymin = null;
        }
        // Set precision of y axis labels dynamically
        var yprecision = '%.1f';
        if(ydelta < 1.0)
            yprecision = '%.3f';
        else if(ydelta < 10.0)
            yprecision = '%.2f';
        // Build plot element
        plots[pid] = $.jqplot('plot'+pid, [plotdata[pid]], {
            title: title,
            width: 800,
            height: 420,
            cursor: {
                show: true,
                zoom: true,
                showTooltip: false
            },

            highlighter: {
                show: true,
                sizeAdjust: 3.0
            },
            axes: {
                xaxis: {
                    tickOptions:{
                        formatString:'%b %#d %Y',
                        fontSize: '10pt',
                        angle: -30
                    },
                    renderer: $.jqplot.DateAxisRenderer,
                    tickRenderer: $.jqplot.CanvasAxisTickRenderer,
                    labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                },
                yaxis: {
                    tickOptions:{
                        fontSize: '10pt',
                        formatString: yprecision
                    },
                    pad: 1.05,
                    min: ymin,
                    max: ymax
                }
            },
            series:[
              {
                showLine:false,
                markerOptions: { size: 4, style:'circle' }
              },
            ]
        });

        //Bind the zoom out button
        $("#btn"+pid).click(function () {
            plots[$(this).val()].resetZoom();
        });
        $('#dia'+pid).bind('dialogresize', function(event, ui) {
            plots[pid].replot( { resetAxes: true } );
        });
        // Bind plot image dialog to view plot image button
        $("#imagebtn"+pid).click(function(){createImageDialog(pid, title);});
    }

}

function getPlotData(ids, pid, title){
    var daterange = getQueryDates();
    if (pageType == "station"){
        $.get("cgi-bin/metrics.py", 
            {cmd: "channelplot", param: "channel."+ids[2]+"_metric."+ids[1]+"_dates."+daterange},
            function(data){
                parsePlotReturn(data, pid);
            }
        ).done(function(){
            bindPlot(pid, title);
        });

    }
    else if (pageType == "summary"){
        $.get("cgi-bin/metrics.py", 
            {cmd: "stationplot", param: "station."+ids[2]+"_metric."+ids[1]+"_dates."+daterange},
            function(data){
                parsePlotReturn(data, pid);
            }
        ).done(function(){
            bindPlot(pid, title);
        });
    }
}

function parsePlotReturn(data,pid){
    plotdata["xmax"+pid] = undefined;
    plotdata["xmin"+pid] = undefined;
    plotdata["ymax"+pid] = undefined;
    plotdata["ymin"+pid] = undefined;
    plotdata[pid] = new Array();
    var rows = new Array();
    rows = data.split("\n");
    for(var i = 0; i <rows.length; i++){
        row = rows[i].split(",");   //row[0] is date, row[1] is value
        if(row[1] && row[0]){
            var rdate = parseDate(row[0],'-');
            var rval = parseFloat(parseFloat(row[1]).toFixed(2)); //Second parseFloat loses trailing 0s and lets us not have to parseFloat on every comparison and store.
            plotdata[pid].push([rdate,rval]);
            /*//Padding makes this code unneeded
            if(plotdata["xmax"+pid] == undefined || rdate > plotdata["xmax"+pid])
            plotdata["xmax"+pid] = rdate;
            if(plotdata["xmin"+pid] == undefined || rdate < plotdata["xmin"+pid])
            plotdata["xmin"+pid] = rdate;
            if(plotdata["ymax"+pid] == undefined || rval > plotdata["ymax"+pid])
            plotdata["ymax"+pid] = rval;
            if((plotdata["ymin"+pid] == undefined) || rval < plotdata["ymin"+pid])
            plotdata["ymin"+pid] = rval;
            */
        }
    }
}

// Create and display an image plot dialog where user can right click and save to file or new tab and print
function createImageDialog(pid, title){
    var imageDialog = $("<div id='diaImage"+pid+"' title='Image for "+title+"'></div>").dialog({
        width: 800,
        height: 550,
        close: function(event, ui){
            $("#diaImage"+pid).remove();
        }
    });
    var imagediv = $("<div id='image"+pid+"'></div>");
    imageDialog.append(imagediv);
    var image = $('#plot'+pid).jqplotToImageElem();
    imagediv.append(image);
}
