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
      name: "id",
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
  const currentData = vegaView.data("tree");
  const selectionColName = columnsData.selection.name;
  const quantitativeColName = "size"; /* columnsData.Qcolumn.name */
  const quantitativeSelectionColName =
    "sizeSelected"; /* columnsData.QSelectedColumn.name */
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
  if (!signalValue.value) return;

  try {
    if (signalValue.selectionIsOn) {
      //console.log("hello", signalValue)
      const currentData = vegaView.data("tree");
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
      applyChanges(vegaView, "tree", { datumTuplesToModify });
      runVega(vegaView, "tree");

      // Call the API.
      //getResetSelectionOpToAPI()
    }
  } catch (e) {
    console.error(e);
  }
};

const handleMarkSelectionClick = (_signal, signalValue) => {
  try {
    //console.log("markSelection signalValue", signalValue);
    applyChanges(
      vegaView,
      "tree",
      _createSelectDataMarkChanges(
        vegaView,
        signalValue.chartStructure.columnsData,
        [signalValue.value],
        signalValue.ctrlKey,
        signalValue.altKey
      )
    );
    runVega(vegaView, "tree");
    vegaView.runAsync();

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

const _getRectBrushSelectionOpsForApi = ({
  vegaView,
  signalValue,
  xExclusive = false,
  yExclusive = false
}) => {
  const brush = signalValue.brush;

  if (brush.state === "stop") {
    const chartStructure = signalValue.chartStructure;
    const columnsData = chartStructure.columnsData;

    const xSegmentInDomain = brush.segmentInDomain.x;
    const ySegmentInDomain = brush.segmentInDomain.y;

    const currentData = vegaView.data("tree");

    const intervals = {
      x: xSegmentInDomain,
      y: ySegmentInDomain
    };

    console.log('brush', xSegmentInDomain, ySegmentInDomain)

    const indexes = currentData.filter((datum) => {
      return (
        (xExclusive ||
          (datum.y0 <= ySegmentInDomain[1] &&
            datum.y1 >= ySegmentInDomain[0])) &&
        (yExclusive ||
          (datum.x0 <= xSegmentInDomain[1] && datum.x1 >= xSegmentInDomain[0]))
      );
    });

    console.log('indexes', indexes)
    // getRectBrushSelectionOpsForApi({
    //   quantitativeExclusiveFlag,
    //   categoryExclusiveFlag,
    //   columnsData,
    //   indexes,
    //   intervals,
    //   quantitativeBrushSegmentInDomain,
    //   categoryBrushList,
    //   nameNIdxOfByColumnTuples,
    //   brush,
    // })

    return _createSelectDataMarkChanges(
      vegaView,
      columnsData,
      indexes,
      brush.domEvent.ctrlKey || brush.domEvent.metaKey,
      brush.domEvent.altKey
    );
  }
};

const handleRectangleSelectionBrush = (_signal, signalValue) => {
  try {
    applyChanges(
      vegaView,
      "tree",
      _getRectBrushSelectionOpsForApi({ vegaView, signalValue })
    );
    runVega(vegaView, "tree");
  } catch (e) {
    console.error(e);
  }
};

const handleXSliceSelectionBrush = (_signal, signalValue) => {
  try {
    applyChanges(
      vegaView,
      "tree",
      _getRectBrushSelectionOpsForApi({
        vegaView,
        signalValue,
        xExclusive: true
      })
    );
    runVega(vegaView, "tree");
  } catch (e) {
    console.error(e);
  }
};

const handleYSliceSelectionBrush = (_signal, signalValue) => {
  try {
    applyChanges(
      vegaView,
      "tree",
      _getRectBrushSelectionOpsForApi({
        vegaView,
        signalValue,
        yExclusive: true
      })
    );
    runVega(vegaView, "tree");
  } catch (e) {
    console.error(e);
  }
};

document.getElementById("app").innerHTML = `<div id="vega-container"></div>`;

vegaEmbed("#vega-container", vegaSpec(400, 400, chartStruct), {
  mode: "vega"
})
  .then((result) => {
    // add bar selection handler
    // see: https://vega.github.io/vega/docs/api/view/

    vegaView = result.view;

    // result.view.addSignalListener("panObj", handlePan);
    // result.view.addSignalListener(
    //   "resetSelectionOnClick",
    //   handleResetSelectionClick
    // );
    // result.view.addSignalListener("OnClickDataMark", handleMarkSelectionClick);
    // result.view.addSignalListener(
    //   "rectBrushForSelection",
    //   handleRectangleSelectionBrush
    // );
    // result.view.addSignalListener(
    //   "sliceXBrushForSelection",
    //   handleXSliceSelectionBrush
    // );
    // result.view.addSignalListener(
    //   "sliceYBrushForSelection",
    //   handleYSliceSelectionBrush
    // );
  })
  .catch((error) => {
    console.error("vega:error", error);
  });
