//import * as R from "ramda";

import { applyChanges, runVega } from "./selection";

import vegaSpec from "./sankey";
const vegaEmbed = window.vegaEmbed;
const vega = window.vega;

const createObject = (x, y) => {
  return { [x]: y };
};

vega.expressionFunction("createObject", createObject);

let vegaView;

const chartStruct = {
  columnsData: {
    groups: [
      {
        name: "City",
        count: 2,
        type: "CATEGORICAL"
      },
      {
        name: "Team",
        count: 3,
        type: "CATEGORICAL"
      },
      {
        name: "Employee",
        //count: 12,
        type: "CATEGORICAL"
      }
    ],
    color: {
      name: "Project",
      type: "CATEGORICAL"
    },
    size: {
      name: "nbrChoco",
      type: "QUANTITATIVE",
      domain: [0, 20]
    },
    selection: {
      name: "s",
      type: "SELECTION"
    },
    idx: {
      name: "index",
      type: "LINE"
    }
  }
};

const _createSelectDataMarkChanges = (
  vegaView,
  columnsData,
  values,
  keepSelection = false,
  removeFromSelection = false
) => {
  const datumTuplesToModify = [];
  const currentData = vegaView.data("links");
  const selectionColName = columnsData.selection.name;
  const quantitativeColName = "value"; /* columnsData.Qcolumn.name */
  const quantitativeSelectionColName =
    "SelectionValue"; /* columnsData.QSelectedColumn.name */
  const datumIdxColName = columnsData.idx.name;

  currentData.forEach((datum) => {
    const isIntendedForSelection = values.some(
      (value) => value[datumIdxColName] === datum[datumIdxColName]
    );
    // Case 1: keep current selection and remove from selection bars in the brush
    if (
      values.length > 0 &&
      keepSelection && // shift key pressed keep current selection
      datum[selectionColName] > 0 &&
      removeFromSelection && // altKey pressed => remove
      isIntendedForSelection
    ) {
      datumTuplesToModify.push({
        datum,
        field: selectionColName,
        value: 0
      });
    }
    // Case 2: select bars
    if (!removeFromSelection && isIntendedForSelection) {
      datumTuplesToModify.push({
        datum,
        field: selectionColName,
        value: 1
      });
      // Set selected amount to amount
      datumTuplesToModify.push({
        datum,
        field: quantitativeSelectionColName,
        value: datum[quantitativeColName]
      });
    }
    // Case 3: TODO Describe.
    if (
      !keepSelection &&
      datum[selectionColName] > 0 &&
      !isIntendedForSelection
    ) {
      // -- No shift, all other datamarks are unselected
      datumTuplesToModify.push({
        datum,
        field: selectionColName,
        value: 0
      });
    }
    // Default case
  });

  return { datumTuplesToModify };
};

const handleResetSelectionClick = (_signal, signalValue) => {
  if (!signalValue) return;

  try {
    const currentData = vegaView.data("links");
    const selection = vegaView.data("chartStruct")[0].columnsData.selection
      .name;

    const datumTuplesToModify = [];
    currentData.forEach((datum) => {
      if (datum[selection] && datum[selection] > 0) {
        datumTuplesToModify.push({
          datum,
          field: selection,
          value: 0
        });
      }
    });
    applyChanges(vegaView, "links", { datumTuplesToModify });
    runVega(vegaView, "links");

    // Call the API.
    //getResetSelectionOpToAPI()
  } catch (e) {
    console.error(e);
  }
};

const handleMarkSelectionClick = (_signal, signalValue) => {
  try {
    console.log("markSelection signalValue", signalValue);
    applyChanges(
      vegaView,
      "links",
      _createSelectDataMarkChanges(
        vegaView,
        signalValue.chartStructure.columnsData,
        [signalValue.value],
        signalValue.ctrlKey || signalValue.metaKey,
        signalValue.altKey
      )
    );
    runVega(vegaView, "links");

    // Call the API.
    // getSimpleSelectionOpForApi({
    //   datum: signalValue.value,
    //   isResetting: !signalValue.shiftKey,
    //   isRemoving: signalValue.shiftKey && signalValue.altKey,
    //   type: 'formula',
    // })
  } catch (e) {
    console.error(e);
  }
};

const handleZoom = (_signal, signalValue) => {
  if (!vegaView || !signalValue) return null;
  const {
    anchor,
    zoomX,
    zoomY,
    xRangeNormalized,
    yRangeNormalized,
    width,
    height
  } = signalValue;

  const newXRange = [
    anchor[0] / width + (xRangeNormalized[0] - anchor[0] / width) * zoomX[0],
    anchor[0] / width + (xRangeNormalized[1] - anchor[0] / width) * zoomX[1]
  ];
  const newYRange = [
    anchor[1] / height + (yRangeNormalized[0] - anchor[1] / height) * zoomY[0],
    anchor[1] / height + (yRangeNormalized[1] - anchor[1] / height) * zoomY[1]
  ];

  const userData = vegaView.data("userData")[0];
  const columnsData = userData.columnsData;

  const newUserData = {
    ...columnsData,
    x: {
      ...columnsData.x,
      rangeZoom: newXRange,
      zoomed: true
    },
    y: {
      ...columnsData.y,
      rangeZoom: newYRange,
      zoomed: true
    },
    operation: "zooming"
  };
  const datumTuplesToModify = [
    {
      datum: userData,
      field: "columnsData",
      value: newUserData
    }
  ];

  applyChanges(vegaView, "userData", { datumTuplesToModify });
};

const handlePan = (_signal, signalValue) => {
  if (!signalValue) return null;
  const {
    xcur,
    xRangeNormalized,
    yRangeNormalized,
    deltaX,
    width,
    ycur,
    deltaY,
    height
  } = signalValue;

  const newXRange = [
    (xcur[0] + deltaX[0]) / width,
    (xcur[1] + deltaX[1]) / width
  ];
  const newYRange = [
    (ycur[0] + deltaY[0]) / height,
    (ycur[1] + deltaY[1]) / height
  ];

  const userData = vegaView.data("userData")[0];
  const columnsData = userData.columnsData;

  const newUserData = {
    ...columnsData,
    x: {
      ...columnsData.x,
      rangeZoom: newXRange,
      zoomed: true
    },
    y: {
      ...columnsData.y,
      rangeZoom: newYRange,
      zoomed: true
    },
    operation: "zooming"
  };
  const datumTuplesToModify = [
    {
      datum: userData,
      field: "columnsData",
      value: newUserData
    }
  ];

  applyChanges(vegaView, "userData", { datumTuplesToModify });
};

document.getElementById("app").innerHTML = `<div id="vega-container"></div>`;

vegaEmbed("#vega-container", vegaSpec(600, 500, chartStruct), {
  mode: "vega"
})
  .then((result) => {
    // add bar selection handler
    // see: https://vega.github.io/vega/docs/api/view/

    vegaView = result.view;

    // result.view.addSignalListener("panObj", handlePan);
    result.view.addSignalListener(
      "resetSelectionOnClick",
      handleResetSelectionClick
    );
    result.view.addSignalListener("OnClickDataMark", handleMarkSelectionClick);
    result.view.addSignalListener("zoomObj", handleZoom);
    result.view.addSignalListener("panObj", handlePan);
  })
  .catch((error) => {
    console.error("vega:error", error);
  });
