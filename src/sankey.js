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
      {
        name: "Berlin"
      },
      {
        name: "Job Applications"
      },
      {
        name: "Barcelona"
      },
      {
        name: "Madrid"
      },
      {
        name: "Amsterdam"
      },
      {
        name: "Paris"
      },
      {
        name: "London"
      },
      {
        name: "Munich"
      },
      {
        name: "Brussels"
      },
      {
        name: "Dubai"
      },
      {
        name: "Dublin"
      },
      {
        name: "Other Cities"
      },
      {
        name: "No Response"
      },
      {
        name: "Responded"
      },
      {
        name: "Rejected"
      },
      {
        name: "Interviewed"
      },
      {
        name: "No Offer"
      },
      {
        name: "Declined Offer"
      },
      {
        name: "Accepted Offer"
      }
    ],
    links: [
      {
        source: "Berlin",
        target: "Job Applications",
        value: 102,
        color: "#dddddd",
        selectionValue: 20,
        s: 0.19607843137254902
      },
      {
        source: "Barcelona",
        target: "Job Applications",
        value: 39,
        color: "#dddddd",
        selectionValue: 24,
        s: 0.6153846153846154
      },
      {
        source: "Madrid",
        target: "Job Applications",
        value: 35,
        color: "#dddddd",
        selectionValue: 26,
        s: 0.7428571428571429
      },
      {
        source: "Amsterdam",
        target: "Job Applications",
        value: 15,
        color: "#dddddd",
        selectionValue: 2,
        s: 0.13333333333333333
      },
      {
        source: "Paris",
        target: "Job Applications",
        value: 14,
        color: "#dddddd",
        selectionValue: 6,
        s: 0.42857142857142855
      },
      {
        source: "London",
        target: "Job Applications",
        value: 6,
        color: "#dddddd",
        selectionValue: 1,
        s: 0.16666666666666666
      },
      {
        source: "Munich",
        target: "Job Applications",
        value: 5,
        color: "#dddddd",
        selectionValue: 3,
        s: 0.6
      },
      {
        source: "Brussels",
        target: "Job Applications",
        value: 4,
        color: "#dddddd",
        selectionValue: 1,
        s: 0.25
      },
      {
        source: "Dubai",
        target: "Job Applications",
        value: 3,
        color: "#dddddd",
        selectionValue: 1,
        s: 0.3333333333333333
      },
      {
        source: "Dublin",
        target: "Job Applications",
        value: 3,
        color: "#dddddd",
        selectionValue: 2,
        s: 0.6666666666666666
      },
      {
        source: "Other Cities",
        target: "Job Applications",
        value: 12,
        color: "#dddddd",
        selectionValue: 11,
        s: 0.9166666666666666
      },
      {
        source: "Job Applications",
        target: "No Response",
        value: 189,
        color: "#dddddd",
        selectionValue: 176,
        s: 0.9312169312169312
      },
      {
        source: "Job Applications",
        target: "Responded",
        value: 49,
        color: "orange",
        selectionValue: 5,
        s: 0.10204081632653061
      },
      {
        source: "Responded",
        target: "Rejected",
        value: 38,
        color: "#dddddd",
        selectionValue: 21,
        s: 0.5526315789473685
      },
      {
        source: "Responded",
        target: "Interviewed",
        value: 11,
        color: "orange",
        selectionValue: 7,
        s: 0.6363636363636364
      },
      {
        source: "Interviewed",
        target: "No Offer",
        value: 8,
        color: "#dddddd",
        selectionValue: 5,
        s: 0.625
      },
      {
        source: "Interviewed",
        target: "Declined Offer",
        value: 2,
        color: "#dddddd",
        selectionValue: 1,
        s: 0.5
      },
      {
        source: "Interviewed",
        target: "Accepted Offer",
        value: 1,
        color: "orange",
        selectionValue: 0,
        s: 0
      }
    ]
  };

  // const networkWithSelection = {
  //   ...network,
  //   links: network.links.reduce((acc, link) => {
  //     const selectionValue = Math.floor(Math.random() * link.value);

  //     return [
  //       ...acc,
  //       { ...link, selectionValue, s: selectionValue / Math.max(0, link.value) }
  //     ];
  //   }, [])
  // };

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
    nodes: network.nodes.map((d) => Object.assign({}, d)),
    links: network.links.map((d) => Object.assign({}, d))
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
      name: "chartStruct",
      values: [chartStruct]
    },
    {
      name: "userData",
      values: [
        {
          columnsData: {
            x: { rangeZoom: [0, 1] },
            y: { rangeZoom: [0, 1] }
          }
        }
      ]
    },
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
          sourceY: {  expr: "scale( 'yScale', datum.y0)" },
          sourceX: {  expr: "scale('xScale', datum.source.x1)" },
          targetY: {  expr: "scale('yScale', datum.y1)" },
          targetX: {  expr: "scale('xScale', datum.target.x0)" }
        }
      ]
    }
  ];
  const signals = [
    // {
    //   name: "test0",
    //   update: "warn('nodes', data('nodes'))"
    // },
    // {
    //   name: "test",
    //   update: "warn('links', data('links'))"
    // },
    {
      name: "resetSelectionOnClick",
      on: [
        {
          events: "@plottingArea:click",
          update: `{
              chartStructure: data('chartStruct') && data('chartStruct')[0],
              value: eventProxy.event === 'click' && (!eventProxy.domEvent.ctrlKey && !eventProxy.domEvent.metaKey)
            }`
        }
      ]
    },
    {
      name: "OnClickDataMark",
      on: [
        {
          events: "path:click",
          force: true,
          update: `warn('clickDataMark', 
          eventProxy.event === 'click'
          ? { chartStructure: data('chartStruct')[0], 
              value: datum,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey }
          : OnClickDataMark)`
        }
      ]
    },
    {
      name: 'xcur',
      value: null,
      on: [
        {
          events: 'mousedown, touchstart, touchend, wheel',
          update: 'slice(xRange)',
        },
      ],
    },
    {
      name: 'ycur',
      value: 'null',
      on: [
        {
          events: 'mousedown, touchstart, touchend, wheel',
          update: 'slice(yRange)',
        },
      ],
    },
    {
      // get the position of mouse in pixels on mousedown => for panning
      name: 'down',
      value: null,
      on: [
        { events: 'touchend', update: 'null' },
        {
          events: 'mousedown, touchstart',
          update: 'xy()',
        },
      ],
    },
    {
      name: 'wheelDeltaX',
      init: '0',
      on: [
        {
          events: 'view:wheel![!event.item ||!event.item.cursor]',
          update: '(abs(event.deltaX) > abs(event.deltaY) && event.deltaX !== 0) ? event.deltaX/2 : 0',
        },
      ],
    },
    {
      name: 'deltaX',
      init: '[0, 0]',
      on: [
        {
          events: [
            {
              source: 'window',
              type: 'mousemove',
              filter: ['event.altKey', '!event.ctrlKey && !event.metaKey', 'event.button === 0'],
              consume: true,
              between: [
                {
                  type: 'mousedown',
                  filter: ['event.altKey', '!event.ctrlKey && !event.metaKey', 'event.button === 0'],
                },
                { source: 'window', type: 'mouseup' },
              ],
            },
            {
              type: 'touchmove',
              consume: true,
              filter: 'event.touches.length === 1',
            },
          ],
          update: 'down ? [-down[0]+x(), -down[0]+x()]: [0,0]',
        },
        {
          events: [{ signal: 'wheelDeltaX' }],
          update: '[-wheelDeltaX,- wheelDeltaX]',
        },
        {
          events:
            "[@GroupAxisX:mousedown[event.item && event.item.cursor && event.item.cursor==='ew-resize'], window:mouseup] > view:mousemove!",
          update: 'down ? [down[0]-x(), down[0]-x()] : [0,0]',
        },
        {
          events:
            "[@GroupAxisX:mousedown[event.item && event.item.cursor && event.item.cursor==='w-resize'], window:mouseup] > view:mousemove!",
          update: 'down ? [down[0]-x(), 0] : [0,0]',
        },
        {
          events:
            "[@GroupAxisX:mousedown[event.item && event.item.cursor && event.item.cursor==='e-resize'], window:mouseup] > view:mousemove!",
          update: 'down ? [0,down[0]-x()] : [0,0]',
        },
        {
          events:
            "[@GroupAxisY:mousedown[event.item && event.item.cursor && event.item.cursor==='ns-resize'], window:mouseup] > view:mousemove!",
          update: '[0,0]',
        },
        {
          events:
            "[@GroupAxisY:mousedown[event.item && event.item.cursor && event.item.cursor==='n-resize'], window:mouseup] > view:mousemove!",
          update: '[0,0]',
        },
        {
          events:
            "[@GroupAxisY:mousedown[event.item && event.item.cursor && event.item.cursor==='s-resize'], window:mouseup] > view:mousemove!",
          update: '[0,0]',
        },
      ],
    },
    {
      name: 'deltaY',
      init: '[0, 0]',
      on: [
        {
          events: [
            {
              source: 'window',
              type: 'mousemove',
              filter: ['event.altKey', '!event.ctrlKey && !event.metaKey', 'event.button === 0'],
              consume: true,
              between: [{ type: 'mousedown' }, { source: 'window', type: 'mouseup' }],
            },
            {
              type: 'touchmove',
              consume: true,
              filter: 'event.touches.length === 1',
            },
          ],
          update: 'down ? [0,0] : [0,0]',
        },
        {
          events: [{ signal: 'wheelDeltaX' }],
          update: '[0,0]',
        },
        {
          events:
            "[@GroupAxisX:mousedown[event.item && event.item.cursor && event.item.cursor==='ew-resize'], window:mouseup] > view:mousemove!",
          update: '[0,0]',
        },
        {
          events:
            "[@GroupAxisX:mousedown[event.item && event.item.cursor && event.item.cursor==='w-resize'], window:mouseup] > view:mousemove!",
          update: '[0,0]',
        },
        {
          events:
            "[@GroupAxisX:mousedown[event.item && event.item.cursor && event.item.cursor==='e-resize'], window:mouseup] > view:mousemove!",
          update: '[0,0]',
        },
        {
          events:
            "[@GroupAxisY:mousedown[event.item && event.item.cursor && event.item.cursor==='ns-resize'], window:mouseup] > view:mousemove!",
          update: 'down ? [y()-down[1], y()-down[1]] : [0,0]',
        },
        {
          events:
            "[@GroupAxisY:mousedown[event.item && event.item.cursor && event.item.cursor==='n-resize'], window:mouseup] > view:mousemove!",
          update: 'down ? [0,y()-down[1]] : [0,0]',
        },
        {
          events:
            "[@GroupAxisY:mousedown[event.item && event.item.cursor && event.item.cursor==='s-resize'], window:mouseup] > view:mousemove!",
          update: 'down ? [y()-down[1],0] : [0,0]',
        },
      ],
    },
    {
      name: "anchor",
      value: [0, 0],
      on: [
        {
          events: "wheel",
          update: "[invert('xScale', x()), invert('yScale', y())]"
        }
        // {
        //   events: {
        //     type: 'touchstart',
        //     filter: 'event.touches.length===2',
        //   },
        //   update: '[(xdom[0] + xdom[1]) / 2, (ydom[0] + ydom[1]) / 2]',
        // }
      ]
    },
    {
      name: "zoomX",
      init: "[1,1]",
      on: [
        {
          events: "view:wheel![!event.item ||!event.item.cursor]",
          update:
            "abs(event.deltaY) > abs(event.deltaX) ? [pow(1.001, -event.deltaY * pow(16, event.deltaMode)),pow(1.001, -event.deltaY * pow(16, event.deltaMode))]: [1,1]"
        },
        {
          events:
            "@GroupAxisX:wheel![event.item && event.item.cursor && event.item.cursor==='ew-resize']",
          update:
            "[pow(1.001, event.deltaY * pow(16, event.deltaMode)),pow(1.001, event.deltaY * pow(16, event.deltaMode))]"
        },
        {
          events:
            "@GroupAxisX:wheel![event.item && event.item.cursor && event.item.cursor==='w-resize']",
          update: "[pow(1.001, event.deltaY * pow(16, event.deltaMode)),1]"
        },
        {
          events:
            "@GroupAxisX:wheel![event.item && event.item.cursor && event.item.cursor==='e-resize']",
          update: "[1,pow(1.001, event.deltaY * pow(16, event.deltaMode))]"
        },
        {
          events:
            "@GroupAxisY:wheel![event.item && event.item.cursor && event.item.cursor==='ns-resize']",
          update: "[1,1]"
        },
        {
          events:
            "@GroupAxisY:wheel![event.item && event.item.cursor && event.item.cursor==='s-resize']",
          update: "[1,1]"
        },
        {
          events:
            "@GroupAxisY:wheel![event.item && event.item.cursor && event.item.cursor==='n-resize']",
          update: "[1,1]"
        }
      ]
    },

    // Yaxis
    {
      name: "zoomY",
      init: "[1,1]",
      on: [
        {
          events: "view:wheel![!event.item ||!event.item.cursor]",
          update: "[1,1]"
        },
        {
          events:
            "@GroupAxisX:wheel![event.item && event.item.cursor && event.item.cursor==='ew-resize']",

          update: "[1,1]"
        },
        {
          events:
            "@GroupAxisX:wheel![event.item && event.item.cursor && event.item.cursor==='w-resize']",

          update: "[1,1]"
        },
        {
          events:
            "@GroupAxisX:wheel![event.item && event.item.cursor && event.item.cursor==='e-resize']",

          update: "[1,1]"
        },
        {
          events:
            "@GroupAxisY:wheel![event.item && event.item.cursor && event.item.cursor==='ns-resize']",
          update:
            "[pow(1.001, event.deltaY * pow(16, event.deltaMode)),pow(1.001, event.deltaY * pow(16, event.deltaMode))]"
        },
        {
          events:
            "@GroupAxisY:wheel![event.item && event.item.cursor && event.item.cursor==='s-resize']",
          update: "[pow(1.001, event.deltaY * pow(16, event.deltaMode)),1]"
        },
        {
          events:
            "@GroupAxisY:wheel![event.item && event.item.cursor && event.item.cursor==='n-resize']",
          update: "[1,pow(1.001, event.deltaY * pow(16, event.deltaMode))]"
        }
      ]
    },
    {
      name: "zoomObj",
      on: [
        {
          events: { signal: "[zoomX, zoomY]" },
          update: `
          {
            anchor: anchor,
            zoomX: zoomX,
            xRangeNormalized: xRangeNormalized,
            zoomY: zoomY,
            yRangeNormalized: yRangeNormalized,
            width: width,
            height: height
          }`
        }
      ]
    },
    {
      name: 'panObj',
      on: [
        {
          events: { signal: '[deltaX, deltaY]' },
          update: `
          {
            xcur: xcur,
            ycur: ycur,
            xRangeNormalized: xRangeNormalized,
            yRangeNormalized: yRangeNormalized,
            deltaX: deltaX,
            deltaY: deltaY,
            width: width,
            height: height
          }`,
        },
      ],
    },
    {
      name: "extractXZoom",
      update:
        "length(data('userData')) > 0  && data('userData')[0].columnsData.x.rangeZoom"
    },
    {
      name: "extractYZoom",
      update:
        "length(data('userData')) > 0 && data('userData')[0].columnsData.y.rangeZoom"
    },
    {
      name: "xRangeNormalized",
      update: "slice([0,1])",
      on: [
        {
          events: { signal: 'extractXZoom' },
          update: 'extractXZoom'  
        },
       
      ],
    },
    {
      name: "xRange",
      update: "[xRangeNormalized[0]*width,xRangeNormalized[1]*width]"
    },
    {
      name: "yRangeNormalized",
      update: "slice([0,1])",
      on: [
        {
          events: { signal: 'extractYZoom' },
          update: 'extractYZoom'  
        },
       
      ],
    },
    {
      name: "yRange",
      update: "[yRangeNormalized[0]*height,yRangeNormalized[1]*height]"
    },
    getEventProxySignal()
  ];
  const marks = [
    {
      type: "rect",
      name: "plottingArea",
      encode: {
        update: {
          x: { value: 0 },
          width: { signal: "width" },
          y: { value: 0 },
          height: { signal: "height" },
          fill: { value: "transparent" }
          // stroke: [
          //   {
          //     test: 'isDefined(updateColabZoomBorder.displayColor)',
          //     signal: 'isDefined(updateColabZoomBorder.displayColor) && updateColabZoomBorder.displayColor',
          //   },
          //   { value: null },
          // ],
          // strokeWidth: { value: lasso.borderSize },
        }
      }
    },
    {
      name: "nodesMarks",
      type: "rect",
      clip: true,
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
          tooltip: {
            signal:
              "datum.source.name + ' → ' + datum.target.name + '    ' + format(datum.value, ',.0f') + '   (' + format(datum.percentage, '.1%') + ')'"
          }
        },
        hover: { stroke: { value: "orange" } }
      },
    },
    {
      type: "path",
      name: "edgeMarkSelection",
      from: { data: "links" },
      clip: true,
      encode: {
        update: {
          stroke: {
            value: "red"
          },
          strokeWidth: {
            signal: "floor(datum.width*datum.s) "
          },
          path: { field: "path" },
          strokeOpacity: {
            signal: "0.8"
          },
          tooltip: {
            signal: `datum.source.name 
              + ' → ' + datum.target.name 
              + '    ' + format(datum.value, ',.0f') 
              + '   (' + format(datum.percentage, '.1%') 
              + ')'`
          }
        }
      }
    },
    {
      name: "nodesLables",
      type: "text",
      clip: true,
      interactive: false,
      from: { data: "nodes" },
      encode: {
        update: {
          x: { scale: "xScale", field: "x0" },
          dx: { signal: "1.5*abs(datum.x0-datum.x1)" },
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
      range: { signal: "xRange" }
    },
    {
      name: "yScale",
      type: "linear",
      round: false,
      nice: false,
      zero: false,
      domain: { data: "nodes", fields: ["y0", "y1"] },
      range: { signal: "yRange" }
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
