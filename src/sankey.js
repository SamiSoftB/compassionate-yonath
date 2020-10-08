import buildTooltip from "./buildTooltipTreeMap";
import {
  linearGradientBlue,
  linearGradientBluePastel,
  divergentGradientBlueRed,
  divergentGradientBlueRedPastel,
  categoriesPalette10,
  categoriesPalette10Pastel
} from "./chartsStyling";

import {
  getRectBrush,
  getSliceXBrush,
  getSliceYBrush,
  getRectBrushForSelection,
  getSliceXBrushForSelection,
  getSliceYBrushForSelection
} from "./rectSelectionBrush";

import d3 from "./d3";

import { omit, reduce } from "ramda";

const getEventProxySignal = (config = { minMoveInPixels: 10 }) => ({
  name: "eventProxy",
  value: {
    event: null,
    mouseMoveInRange: { x: [0, 0], y: [0, 0] },
    mouseMoveInDomain: { x: [0, 0], y: [0, 0] },
    polygonInRange: []
  },
  on: [
    // Mousedown
    {
      events:
        "view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey]",
      update: `{
        event: null,
        domEvent: event,
        item: event.item,
        mouseMoveInRange: { x: [x(), x()], y: [y(), y()], distance: 0 },
        polygonInRange: [ [ x(), y() ] ],
        polygonInDomain: [ [ invert('xScale', x()), invert('yScale', y()) ] ]
      }`
    },
    {
      events:
        "view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey]",
      update: `{
        event: 'mousedown',
        domEvent: eventProxy.event,
        item: eventProxy.item,
        mouseMoveInRange: eventProxy.mouseMoveInRange,
        mouseMoveInDomain: {
          x: [invert('xScale', eventProxy.mouseMoveInRange.x[0]), invert('xScale', eventProxy.mouseMoveInRange.x[1])],
          y: [invert('yScale', eventProxy.mouseMoveInRange.y[0]), invert('yScale', eventProxy.mouseMoveInRange.y[1])]
        },
        polygonInRange: eventProxy.polygonInRange,
        polygonInDomain: eventProxy.polygonInDomain
      }`
    },
    // Mousemove
    // polygonInRange: push(eventProxy.polygonInRange, [clamp(x(), 0, width), clamp(y(), 0, height)]),
    {
      events:
        "[view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey], window:mouseup] > window:mousemove!",
      update: `{
        event: eventProxy.event,
        domEvent: event,
        item: eventProxy.item,
        mouseMoveInRange: {
          x: [eventProxy.mouseMoveInRange.x[0], x()],
          y:[eventProxy.mouseMoveInRange.y[0] , y()],
          distance: eventProxy.mouseMoveInRange.distance
        }
      }`
    },
    {
      events:
        "[view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey], window:mouseup] > window:mousemove!",
      update: `{
        event: eventProxy.event,
        domEvent: event,
        item: eventProxy.item,
        mouseMoveInRange: {
          x: eventProxy.mouseMoveInRange.x,
          y: eventProxy.mouseMoveInRange.y,
          distance: sqrt(pow(eventProxy.mouseMoveInRange.x[1] - eventProxy.mouseMoveInRange.x[0], 2) + pow(eventProxy.mouseMoveInRange.y[1] - eventProxy.mouseMoveInRange.y[0], 2))
        },
        mouseMoveInDomain: {
          x: invert('xScale', eventProxy.mouseMoveInRange.x),
          y: invert('yScale', eventProxy.mouseMoveInRange.y)
        },
        polygonInRange: eventProxy.polygonInRange,
        polygonInDomain: eventProxy.polygonInDomain,
      }`
    },
    {
      events:
        "[view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey], window:mouseup] > window:mousemove!",
      update: `{
        event: eventProxy.event,
        domEvent: event,
        item: eventProxy.item,
        mouseMoveInRange: {
          x: eventProxy.mouseMoveInRange.x,
          deltaX: eventProxy.mouseMoveInRange.x[1] - eventProxy.mouseMoveInRange.x[0],
          y: eventProxy.mouseMoveInRange.y,
          deltaY: eventProxy.mouseMoveInRange.y[1] - eventProxy.mouseMoveInRange.y[0],
          distance: eventProxy.mouseMoveInRange.distance
        },
        mouseMoveInDomain: eventProxy.mouseMoveInDomain,
        polygonInRange: eventProxy.polygonInRange,
        polygonInDomain: eventProxy.polygonInDomain,
      }`
    },
    {
      events:
        "[view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey], window:mouseup] > window:mousemove!",
      update: `{
        event:
          (abs(eventProxy.mouseMoveInRange.deltaX) >= ${config.minMoveInPixels} || abs(eventProxy.mouseMoveInRange.deltaY) >= 10)
          ? (eventProxy.event === 'startdrawingshape' || eventProxy.event === 'drawingshape' ? 'drawingshape' : 'startdrawingshape')
          : eventProxy.event,
        domEvent: event,
        item: eventProxy.item,
        mouseMoveInRange: eventProxy.mouseMoveInRange,
        mouseMoveInDomain: eventProxy.mouseMoveInDomain,
        polygonInRange: eventProxy.polygonInRange,
        polygonInDomain: eventProxy.polygonInDomain
      }`
    },
    {
      events:
        "[view:mousedown[event.button === 0 && !event.crtlKey && !event.metaKey], window:mouseup] > window:mousemove!",
      update: `{
        event: event.buttons === 0 ? ((eventProxy.event !== 'startdrawingshape' && eventProxy.event !== 'drawingshape') ? 'click': 'stopdrawingshape') : eventProxy.event,
        domEvent: event,
        item: eventProxy.item,
        mouseMoveInRange: eventProxy.mouseMoveInRange,
        mouseMoveInDomain: eventProxy.mouseMoveInDomain,
        polygonInRange: eventProxy.polygonInRange,
        polygonInDomain: eventProxy.polygonInDomain
      }`
    },
    // Mouseup
    {
      events:
        "view:mouseup[event.button === 0 && !event.crtlKey && !event.metaKey]",
      update: `
        {
          event: (eventProxy.event !== 'startdrawingshape' && eventProxy.event !== 'drawingshape') ? 'click': 'stopdrawingshape',
          domEvent: event,
          item: eventProxy.item,
          mouseMoveInRange: eventProxy.mouseMoveInRange,
          mouseMoveInDomain: eventProxy.mouseMoveInDomain,
          polygonInRange: eventProxy.polygonInRange,
          polygonInDomain: eventProxy.polygonInDomain
        }`
    },
    {
      events:
        "window:mouseup[event.button === 0 && !event.crtlKey && !event.metaKey]",
      update: `
        {
          event: (eventProxy.event !== 'click' && eventProxy.event !== 'stopdrawingshape' ||
            eventProxy.domEvent.clientX !== event.clientX || eventProxy.domEvent.clientY !== event.clientY) ? 'clickOut': eventProxy.event,
          domEvent: event,
          item: eventProxy.item,
          mouseMoveInRange: eventProxy.mouseMoveInRange,
          mouseMoveInDomain: eventProxy.mouseMoveInDomain,
          polygonInRange: eventProxy.polygonInRange,
          polygonInDomain: eventProxy.polygonInDomain
        }`
    }

    /* {
      "events": "window:mouseout",
      "update": "{ event: null, domEvent: event, item: event.item, mouseMoveInRange: { x: [x(), x()], y: [y(), y()] } }"
    } */
  ]
});

const vegaSpec = (width, height, chartStruct) => {
  const network = {
    nodes: [
      { name: "Berlin" },
      { name: "Job Applications" },
      { name: "Barcelona" },
      { name: "Madrid" },
      { name: "Amsterdam" },
      { name: "Paris" },
      { name: "London" },
      { name: "Munich" },
      { name: "Brussels" },
      { name: "Dubai" },
      { name: "Dublin" },
      { name: "Other Cities" },
      { name: "No Response" },
      { name: "Responded" },
      { name: "Rejected" },
      { name: "Interviewed" },
      { name: "No Offer" },
      { name: "Declined Offer" },
      { name: "Accepted Offer" }
    ],
    links: [
      {
        source: "Berlin",
        target: "Job Applications",
        value: 102,
        color: "#dddddd"
      },
      {
        source: "Barcelona",
        target: "Job Applications",
        value: 39,
        color: "#dddddd"
      },
      {
        source: "Madrid",
        target: "Job Applications",
        value: 35,
        color: "#dddddd"
      },
      {
        source: "Amsterdam",
        target: "Job Applications",
        value: 15,
        color: "#dddddd"
      },
      {
        source: "Paris",
        target: "Job Applications",
        value: 14,
        color: "#dddddd"
      },
      {
        source: "London",
        target: "Job Applications",
        value: 6,
        color: "#dddddd"
      },
      {
        source: "Munich",
        target: "Job Applications",
        value: 5,
        color: "#dddddd"
      },
      {
        source: "Brussels",
        target: "Job Applications",
        value: 4,
        color: "#dddddd"
      },
      {
        source: "Dubai",
        target: "Job Applications",
        value: 3,
        color: "#dddddd"
      },
      {
        source: "Dublin",
        target: "Job Applications",
        value: 3,
        color: "#dddddd"
      },
      {
        source: "Other Cities",
        target: "Job Applications",
        value: 12,
        color: "#dddddd"
      },
      {
        source: "Job Applications",
        target: "No Response",
        value: 189,
        color: "#dddddd"
      },
      {
        source: "Job Applications",
        target: "Responded",
        value: 49,
        color: "orange"
      },
      { source: "Responded", target: "Rejected", value: 38, color: "#dddddd" },
      {
        source: "Responded",
        target: "Interviewed",
        value: 11,
        color: "orange"
      },
      { source: "Interviewed", target: "No Offer", value: 8, color: "#dddddd" },
      {
        source: "Interviewed",
        target: "Declined Offer",
        value: 2,
        color: "#dddddd"
      },
      {
        source: "Interviewed",
        target: "Accepted Offer",
        value: 1,
        color: "orange"
      }
    ]
  };

  const networkWithSelection = {
    ...network,
    links: network.links.reduce((acc, link) => {
      const selectionValue = Math.floor(Math.random() * link.value);

      return [
        ...acc,
        { ...link, selectionValue, s: selectionValue / Math.max(0, link.value) }
      ];
    }, [])
  };

  const align = "center";
  const padding = 10;

  const sankey = d3
    .sankey()
    .nodeId((d) => d.name)
    //.nodeAlign(d3['sankeyCenter'])
    .nodeWidth(15)
    .nodePadding(padding)
    .extent([
      [0, 0],
      [width, height - 0]
    ])
    .iterations(23);

  const { nodes, links } = sankey({
    nodes: networkWithSelection.nodes.map((d) => Object.assign({}, d)),
    links: networkWithSelection.links.map((d) => Object.assign({}, d))
  });

  const linksFiltered = links.reduce(
    (acc, cur) => [
      ...acc,
      {
        ...cur,
        source: omit(["sourceLinks", "targetLinks"], cur.source),
        target: omit(["sourceLinks", "targetLinks"], cur.target)
      }
    ],
    []
  );

  const typography = {
    IR11: {
      fontFamily: "Arial",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: 0,
      lineHeight: "13px"
    },
    IB13: {
      fontFamily: "Arial",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: 0,
      lineHeight: "13px"
    }
  };
  // const palette = { base: { 200: "#DFE6ED", 900: "#374B5F" } };
  // const columnsData = chartStruct.columnsData;
  // const colorField = chartStruct.columnsData.color
  //   ? chartStruct.columnsData.color.name
  //   : "PivotedAnasencolumns";
  // const colorFieldCategoriesCount = chartStruct.columnsData.color
  //   ? chartStruct.columnsData.Bycolumns.find((col) => {
  //       return col.name === colorField;
  //     }).count
  //   : chartStruct.columnsData.Qcolumn.length;

  function _buildColorsScales(chartStruct) {
    const color = chartStruct?.columnsData?.color;

    switch (color?.type) {
      case "CATEGORICAL": {
        return [
          {
            name: "colorFull",
            type: "ordinal",
            domain: { data: "tree", field: "color" },
            range: categoriesPalette10
          },
          {
            name: "colorLight",
            type: "ordinal",
            domain: { data: "tree", field: "color" },
            range: categoriesPalette10Pastel
          }
        ];
      }

      case "QUANTITATIVE": {
        return [
          {
            name: "colorFull",
            type: "linear",
            interpolate: "hcl",
            zero: false,
            domain: [
              { signal: "colorExtent[0]" },
              { signal: "(colorExtent[0]+colorExtent[1])/2" },
              { signal: "colorExtent[1]" }
            ],
            range: { signal: "chooseGradient" }
          },
          {
            name: "colorLight",
            type: "linear",
            interpolate: "hcl",
            zero: false,
            domain: [
              { signal: "colorExtent[0]" },
              { signal: "(colorExtent[0]+colorExtent[1])/2" },
              { signal: "colorExtent[1]" }
            ],
            range: { signal: "chooseGradientPastel" }
          }
        ];
      }

      default:
        return [];
    }
  }

  const data = [
    {
      name: "nodes",
      values: nodes.reduce(
        (acc, cur) => [
          ...acc,
          {
            index: cur.index,
            x0: cur.x0,
            x1: cur.x1,
            y0: cur.y0,
            y1: cur.y1,
            text: cur.name
          }
        ],
        []
      )
    },
    {
      name: "links",
      values: linksFiltered,
      transform: [
        {
          type: "linkpath",
          orient: "horizontal",
          shape: "diagonal",
          sourceY: { expr: "datum.y0" },
          sourceX: { expr: "datum.source.x1+3" },
          targetY: { expr: "datum.y1" },
          targetX: { expr: "datum.target.x0-3" }
        }
      ]
    },
    {
      name: "linksSelection",
      values: linksFiltered
    }
  ];
  const signals = [
    {
      name: "test0",
      update: "warn('nodes', data('nodes'))"
    },
    {
      name: "test",
      update: "warn('links', data('links'))"
    }
  ];
  const marks = [
    {
      name: "nodesMarks",
      type: "rect",
      from: { data: "nodes" },
      encode: {
        update: {
          x: { scale: "xScale", field: "x0" },
          x2: { scale: "xScale", field: "x1" },
          y: { scale: "yScale", field: "y0" },
          y2: { scale: "yScale", field: "y1" },
          fill: { value: "rgb(185,185,185)" },
          stroke: { value: "white" },
          strokeWidth: { value: 0 }
        },
        hover: {
          stroke: { value: "black" },
          strokeWidth: { value: 2 }
        }
      }
    },
    {
      type: "path",
      name: "edgeMark",
      from: { data: "links" },
      clip: true,
      encode: {
        update: {
          stroke: [
            {
              value: "rgb(221,221,221)"
            }
          ],
          strokeWidth: { field: "width" },
          path: { field: "path" },
          strokeOpacity: {
            signal: "0.8"
          },
          zindex: {
            signal: "0"
          },
          tooltip: {
            signal:
              "datum.source.name + ' → ' + datum.target.name + '    ' + format(datum.value, ',.0f') + '   (' + format(datum.percentage, '.1%') + ')'"
          }
        },
        hover: { stroke: { value: "orange" } }
      }
    },
    {
      type: "path",
      name: "edgeMarkSelection",
      from: { data: "edgeMark" },
      clip: true,
      encode: {
        update: {
          stroke: [
            {
              value: "red"
            }
          ],
          strokeWidth: { field: "width" },
          path: { field: "path" },
          x: { value: 100 },
          y: { value: 0 },
          strokeOpacity: {
            signal: "0.8"
          },
          zindex: {
            signal: "warn('linksSelection', data('linksSelection'), data('edgeMark'), 5)"
          },
          tooltip: {
            signal:
              `datum.datum.source.name 
              + ' → ' + datum.datum.target.name 
              + '    ' + format(datum.datum.value, ',.0f') 
              + '   (' + format(datum.datum.percentage, '.1%') 
              + ')'`
          }
        }
      },
      transform: [
        {
          type: "linkpath",
          orient: "horizontal",
          shape: "diagonal",
          sourceY: "datum.datum.y0",
          sourceX: "datum.datum.source.x1+3",
          targetY: "datum.datum.y1",
          targetX: "datum.datum.target.x0-3"
        }
      ]
    },
    {
      name: "nodesLables",
      type: "text",
      interactive: false,
      from: { data: "nodes" },
      encode: {
        update: {
          x: { scale: "xScale", field: "x0" },
          dx: { value: 20 },
          y: { scale: "yScale", field: "y0" },
          dy: { signal: "abs(datum.y0-datum.y1)/2+3" },
          fill: { value: "black" },
          text: { field: "text" }
        }
      }
    }
  ];
  const scales = [
    {
      name: "xScale",
      type: "linear",
      round: false,
      nice: false,
      zero: false,
      domain: { data: "nodes", fields: ["x0", "x1"] },
      range: "width"
    },
    {
      name: "yScale",
      type: "linear",
      round: false,
      nice: false,
      zero: false,
      domain: { data: "nodes", fields: ["y0", "y1"] },
      range: { signal: "[0, height]" }
    }
  ];
  const axes = [];

  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width: width,
    height: height,
    autosize: { type: "none", resize: true },
    padding: { top: 10, right: 80, bottom: 10, left: 10 },
    data,
    signals,
    marks,
    scales,
    axes,
    config: {
      axis: {
        domain: false,
        tickSize: 3,
        tickcolor: "#888",
        labelFont: "Inter, Courier New"
      }
    }
  };
};

export default vegaSpec;
