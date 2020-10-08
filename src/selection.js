const vega = window.vega;
//import { dotInPolygon } from './geometry'

export const RAW_DATUM_IDX = 'ANASENRawIDX'

/**
 * Change data in Vega view.
 * @param {{}} vegaView The Vega view.
 * @param {'dataRaw' | 'dataDense'} dataSetName The dataset name.
 * @param {{}} changes List of of objects we need to change.
 * @returns {void}
 */
export const applyChanges = (vegaView, dataSetName, changes) => {
  if (!changes) return

  const { dataToInsert = [], dataToRemove = [], datumTuplesToModify = [] } = changes
  // Create a Vega Changeset and apply the changes in it.
  const changeSet = vega.changeset()
  changeSet.remove(dataToRemove).insert(dataToInsert)
  datumTuplesToModify.forEach(tuple => {
    changeSet.modify(tuple.datum, tuple.field, tuple.value)
  })

  // ... and use it in the Vega view
  vegaView.change(dataSetName, changeSet)
}

/**
 * Run Vega.
 * @param {{}} vegaView The Vega view.
 * @param {'dataRaw' | 'dataDense'} dataSetName The dataset name.
 * @returns {void}
 */
export const runVega = async (vegaView, dataSetName) => {
  return await vegaView.runAsync(
    undefined,
    () => {},
    () => vegaView.data(dataSetName)
  )
}

/***************************************
 * SELECTION
 **************************************/

export const invertSegmentIfUpsideDown = segmentP => {
  const segment = [...segmentP]

  if (segment[1] < segment[0]) {
    segment[0] = segment[1]
    segment[1] = segmentP[0]
  }
  return segment
}

export const createUnselectAllDatamarksChanges = (vegaView, chartStructure, datasetName) => {
  const currentData = vegaView.data(datasetName)
  const datumTuplesToModify = []

  // Loop on data items and unselect them if already selected
  currentData.forEach(datum => {
    if (datum[chartStructure.selectionColumn.name] !== 0 || datum[chartStructure.selectionColumn] !== 0) {
      // -- No shift, all other datamarks are unselected
      datumTuplesToModify.push({
        datum,
        field: [chartStructure.selectionColumn.name || chartStructure.selectionColumn],
        value: 0,
      })
    }
  })

  return { datumTuplesToModify }
}

export const createUnselectAllDatamarksChangesNEW = (vegaView, columnsData, datasetName) => {
  const currentData = vegaView.data(datasetName)
  const datumTuplesToModify = []

  const createDatumTuplesToModify = selectionColumnName => {
    // Loop on data items and unselect them if already selected
    currentData.forEach(datum => {
      if (datum[selectionColumnName] !== 0 || datum[selectionColumnName] !== 0) {
        // -- No shift, all other datamarks are unselected
        datumTuplesToModify.push({
          datum,
          field: [selectionColumnName],
          value: 0,
        })
      }
    })
  }

  let selectionColumnName
  if (columnsData.selection !== undefined) {
    selectionColumnName = columnsData.selection.name
    createDatumTuplesToModify(selectionColumnName)
  }

  if (columnsData.QSelectedColumn !== undefined) {
    selectionColumnName = columnsData.QSelectedColumn.name
    createDatumTuplesToModify(selectionColumnName)
  }

  if (columnsData.DensitySelectionColumn !== undefined) {
    selectionColumnName = columnsData.DensitySelectionColumn.name
    createDatumTuplesToModify(selectionColumnName)
  }

  return { datumTuplesToModify }
}

// Rect brush selections of datamarks with classical numerical (or date) axis (x and y)
export const createRectShape2NumericAxesSelectionChanges = (
  vegaView,
  signalValue,
  datasetName,
  createSelectDataMarkChanges,
  xExclusive = false,
  yExclusive = false
) => {
  if (signalValue.brush.state === 'stop') {
    const brush = signalValue.brush
    const columnsData = signalValue.chartStructure.columnsData

    const xSegmentInDomain = invertSegmentIfUpsideDown(brush.segmentInDomain.x)
    const ySegmentInDomain = invertSegmentIfUpsideDown(brush.segmentInDomain.y)

    const currentData = vegaView.data(datasetName)

    const xColName = columnsData.xcolumn.name
    const yColName = columnsData.ycolumn.name

    const changes = currentData.filter(
      datum =>
        (xExclusive || (datum[yColName] >= ySegmentInDomain[0] && datum[yColName] <= ySegmentInDomain[1])) &&
        (yExclusive || (datum[xColName] >= xSegmentInDomain[0] && datum[xColName] <= xSegmentInDomain[1]))
    )
    return createSelectDataMarkChanges(datasetName, vegaView, columnsData, changes, brush.domEvent.shiftKey)
  }
}

export const createPolygonShape2NumericAxesSelectionChanges = (
  vegaView,
  signalValue,
  datasetName,
  createSelectDataMarkChanges,
  xExclusive = false,
  yExclusive = false
) => {
  // We test if the brush is on stop shape, and if the closingSegmentPath is available (it shows that the user has closed the lasso)
  if (signalValue.brush.state === 'stop' && signalValue.brush.closingSegmentPath) {
    const brush = signalValue.brush
    const columnsData = signalValue.chartStructure.columnsData
    const xColName = columnsData.x.name
    const yColName = columnsData.y.name
    const currentData = vegaView.data(datasetName)
    const changes = currentData.filter(datum => dotInPolygon([datum[xColName], datum[yColName]], brush.polygonInDomain))

    return createSelectDataMarkChanges(
      datasetName,
      vegaView,
      columnsData,
      changes,
      brush.domEvent.shiftKey,
      brush.domEvent.altKey
    )
  }
}

export const createRectShape2NumericAxesSelectionChangesTimechart = (
  vegaView,
  signalValue,
  datasetName,
  createSelectDataMarkChanges,
  xExclusive = false,
  yExclusive = false
) => {
  if (signalValue.brush.state === 'stop') {
    const brush = signalValue.brush
    const columnsData = signalValue.chartStructure.columnsData

    const xSegmentInDomain = invertSegmentIfUpsideDown(brush.segmentInDomain.x)
    const ySegmentInDomain = invertSegmentIfUpsideDown(brush.segmentInDomain.y)

    const quantitativeColName = columnsData.Qcolumn && columnsData.Qcolumn.name
    const quantitativeMinColName = columnsData.QcolumnMin && columnsData.QcolumnMin.name
    const quantitativeMaxColName = columnsData.QcolumnMax && columnsData.QcolumnMax.name
    const byColName = columnsData.Bycolumn.name

    const currentData = vegaView.data(datasetName)

    const changes =
      datasetName === 'dataRaw'
        ? currentData.filter(
            datum =>
              (xExclusive ||
                (datum[quantitativeColName] >= ySegmentInDomain[0] &&
                  datum[quantitativeColName] <= ySegmentInDomain[1])) &&
              (yExclusive || (datum[byColName] >= xSegmentInDomain[0] && datum[byColName] <= xSegmentInDomain[1]))
          )
        : currentData.filter(
            datum =>
              (xExclusive ||
                (datum[quantitativeMinColName] >= ySegmentInDomain[0] &&
                  datum[quantitativeMaxColName] <= ySegmentInDomain[1])) &&
              (yExclusive || (datum[byColName] >= xSegmentInDomain[0] && datum[byColName] <= xSegmentInDomain[1]))
          )
    return createSelectDataMarkChanges(datasetName, vegaView, columnsData, changes, brush.domEvent.shiftKey)
  }
}

export const createRectShape2NumericAxesSelectionChangesTimechartV2 = (
  vegaView,
  signalValue,
  datasetName,
  createSelectDataMarkChanges,
  xExclusive = false,
  yExclusive = false
) => {
  if (signalValue.brush.state === 'stop') {
    const brush = signalValue.brush
    const columnsData = signalValue.chartStructure.columnsData

    const xSegmentInDomain = invertSegmentIfUpsideDown(brush.segmentInDomain.x)
    const ySegmentInDomain = invertSegmentIfUpsideDown(brush.segmentInDomain.y)

    const quantitativeColName = 'PivotedAnasenValues'
    const quantitativeMinColName = columnsData.QColumnMin && columnsData.QColumnMin.name
    const quantitativeMaxColName = columnsData.QColumnMax && columnsData.QColumnMax.name

    const dateColName = columnsData.dateColumn.name

    const currentData = vegaView.data(datasetName)

    const changes =
      datasetName === 'dataRaw'
        ? currentData.filter(
            datum =>
              (xExclusive ||
                (datum[quantitativeColName] >= ySegmentInDomain[0] &&
                  datum[quantitativeColName] <= ySegmentInDomain[1])) &&
              (yExclusive || (datum[dateColName] >= xSegmentInDomain[0] && datum[dateColName] <= xSegmentInDomain[1]))
          )
        : currentData.filter(
            datum =>
              (xExclusive ||
                // Upper part of the line in rect
                (datum[quantitativeMaxColName] >= ySegmentInDomain[0] &&
                  datum[quantitativeMaxColName] <= ySegmentInDomain[1]) ||
                // Lower part of the line in rect
                (datum[quantitativeMinColName] >= ySegmentInDomain[0] &&
                  datum[quantitativeMinColName] <= ySegmentInDomain[1]) ||
                // Middle of the line in rect
                (datum[quantitativeMinColName] <= ySegmentInDomain[0] &&
                  datum[quantitativeMaxColName] >= ySegmentInDomain[1])) &&
              (yExclusive || (datum[dateColName] >= xSegmentInDomain[0] && datum[dateColName] <= xSegmentInDomain[1]))
          )

    // Call API
    // let ops = brush.domEvent.shiftKey ? [] : [getResetSelectionOpToAPI()] // If use press "shift" => no reset op
    if (datasetName === 'dataRaw') {
      const intervalCond = []

      if (!yExclusive) intervalCond.push({ column: dateColName, interval: xSegmentInDomain })
      if (!xExclusive) intervalCond.push({ column: quantitativeColName, interval: ySegmentInDomain })
      // ops = ops.concat(getRectBrushSelectionOpsForApi(intervalCond, []))
    }

    return createSelectDataMarkChanges(
      datasetName,
      vegaView,
      columnsData,
      changes,
      brush.domEvent.shiftKey,
      brush.domEvent.altKey
    )
  }
}

/***************************************
 * CALL TO BACKEND A.P.I.
 **************************************/

// For:
// - barchart
export const getResetSelectionOpToAPI = async () => {
  const op = { op: 'reset' }
  return op
}

// For:
// - barchart
export const getSimpleSelectionOpForApi = async datum => {
  // Omit internal keys.
  const {
    ANASENLabels,
    ANASENRawIDX,
    PivotedAnasenColumns,
    PivotedAnasenValues,
    // eslint-disable-next-line camelcase
    PivotedAnasenValues_Selection,
    l,
    s,
    ...rest
  } = datum

  // Create the formula.
  let formula = []
  for (const key in rest) {
    if (typeof key === 'symbol') continue // For Vega internal Symbol.
    formula.push(`{${key}} = "${rest[key]}"`)
  }
  formula = formula.join(' and ')

  const options = {
    formula,
    keep_only: s === 1, // true = add, false = remove
    reset: true, // TODO Keep track of the current selection to know if we need to reset.
  }

  return options
}

// For:
// - barchart
export const getRectBrushSelectionOpsForApi = async (columnIntervalTuples, columnCategoryTuples) => {
  let formula = []
  const intervalConds = columnIntervalTuples.reduce((acc, columnIntervalTuple) => {
    acc.push(
      `{${columnIntervalTuple.column}} >= "${columnIntervalTuple.interval[0]}" and {${columnIntervalTuple.column}} <= "${columnIntervalTuple.interval[1]}"`
    )
    return acc
  }, [])
  formula = [...intervalConds]
  const categoryConds = columnCategoryTuples.reduce((acc, tuple) => {
    acc.push(`{${tuple.column}} = "${tuple.category}"`)
    return acc
  }, [])
  formula = [...formula, ...categoryConds]
  formula = formula.join(' and ')

  const options = {
    formula,
    keep_only: true, // true = add, false = remove
    reset: true,
  }

  return options
}
