// import { registerCoordsArrayToPathInVega } from './tools/geometry'

// registerCoordsArrayToPathInVega()

const _getMetaRectBrush = (config = { name: 'unknown', minMoveInPixels: 8 }) => ({
  name: config.name,
  value: {
    state: 'init',
    segmentInRange: { x: [0, 0], y: [0, 0] },
  },
  description:
    'The rectangle to select brush uses here the event proxy to detect that the user is beginning to draw a shape with the mouse',
  on: [
    {
      events: 'window:mouseup[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)]',
      description: 'For unknown raison, we must put this events declaration at the beginning',
      update: `
        eventProxy.event === 'stopdrawingshape' && ${config.name}.state !== 'init' && isOnView
          ? {
              state: 'stop',
              segmentInRange: eventProxy.mouseMoveInRange,
              segmentInDomain: eventProxy.mouseMoveInDomain,
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      description:
        'The user has reach the amount of pixels to claim that he is drawing a shape, we start the boxSelection',
      update: `
        eventProxy.event === 'startdrawingshape' && isOnView
          ? {
              state: 'start',
              segmentInRange: eventProxy.mouseMoveInRange,
              segmentInDomain: eventProxy.mouseMoveInDomain,
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      description: 'The user keep drawing its shape, we store new coords',
      update: `eventProxy.event === 'drawingshape' && isOnView
          ?
            {
              state: 'resizing',
              segmentInRange: eventProxy.mouseMoveInRange,
              segmentInDomain: eventProxy.mouseMoveInDomain,
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      description: 'The user keep drawing its shape, we store new coords',
      update: `
        (eventProxy.event === 'drawingshape' && 
          !(abs(eventProxy.mouseMoveInRange.deltaX) ${config.XOperatorCondition} ${config.minMoveInPixels} ${
        config.YOperatorCondition !== null
          ? `&& abs(eventProxy.mouseMoveInRange.deltaY) ${config.YOperatorCondition} ${config.minMoveInPixels}`
          : ''
      })) 
          ?
            {
              state: 'init',
              segmentInRange: { x: [0, 0], y: [0, 0] },
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      description: 'For unknown raison, we must put this events declaration at the beginning',
      update: `
        eventProxy.event === 'stopdrawingshape' && ${config.name}.state !== 'init' && ${config.name}.state !== 'stop'
          ? {
              state: 'stop',
              segmentInRange: eventProxy.mouseMoveInRange,
              segmentInDomain: eventProxy.mouseMoveInDomain,
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
  ],
})

export const getRectBrush = (config = { minMoveInPixels: 8 }) => {
  return _getMetaRectBrush({ ...config, name: 'rectBrush', XOperatorCondition: '>', YOperatorCondition: '>' })
}

export const getSliceXBrush = (config = { minMoveInPixels: 8 }) => {
  return _getMetaRectBrush({ ...config, name: 'sliceXBrush', XOperatorCondition: '>', YOperatorCondition: '<=' })
}

export const getExclusiveSliceXBrush = (config = { minMoveInPixels: 8 }) => {
  return _getMetaRectBrush({ ...config, name: 'sliceXBrush', XOperatorCondition: '>', YOperatorCondition: null })
}

export const getSliceYBrush = (config = { minMoveInPixels: 8 }) => {
  return _getMetaRectBrush({ ...config, name: 'sliceYBrush', XOperatorCondition: '<=', YOperatorCondition: '>' })
}

const _getMetaSelectionBrush = (config = { name: 'rectBrush' }) => ({
  name: config.name + 'ForSelection',
  value: {
    state: 'init',
    brush: {},
    chartStructure: {},
  },
  on: [
    {
      events: [{ signal: config.name }],
      update: `
          ${config.name}.state === 'stop'
            ? {
                brush: ${config.name},
                chartStructure: data('chartStruct')[0]
              }
            : ${config.name + 'ForSelection'}`,
    },
  ],
})

export const getRectBrushForSelection = (config = {}) => {
  return _getMetaSelectionBrush({ name: 'rectBrush' })
}

export const getSliceXBrushForSelection = (config = {}) => {
  return _getMetaSelectionBrush({ name: 'sliceXBrush' })
}

export const getExclusiveSliceXBrushForSelection = (config = {}) => {
  return _getMetaSelectionBrush({ name: 'sliceXBrush' })
}

export const getSliceYBrushForSelection = (config = {}) => {
  return _getMetaSelectionBrush({ name: 'sliceYBrush' })
}

export const getLassoBrushForSelection = (config = {}) => {
  return _getMetaSelectionBrush({ name: 'lassoBrush' })
}

export const getLassoBrush = (config = { name: 'lassoBrush', minMoveInPixels: 8, maxDistanceToClose: 80 }) => ({
  name: config.name,
  value: {
    state: 'init',
    segmentInRange: { x: [0, 0], y: [0, 0] },
  },
  on: [
    {
      events: 'window:mouseup[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)]',
      update: `
        eventProxy.event === 'stopdrawingshape' && ${config.name}.state !== 'init'
          ? {
              state: 'stop',
              polygonInRange: eventProxy.polygonInRange,
              polygonInDomain: eventProxy.polygonInDomain,
              path: coordsArrayToPath(eventProxy.polygonInRange),
              domEvent: eventProxy.domEvent,
              closingSegmentPath: ${config.name}.closingSegmentPath
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      description:
        'The user has reach the amount of pixels to claim that he is drawing a shape, we start the lassoSelection',
      update: `
        eventProxy.event === 'startdrawingshape'
          ? {
              state: 'start',
              polygonInRange: eventProxy.polygonInRange,
              polygonInDomain: eventProxy.polygonInDomain,
              path: coordsArrayToPath(eventProxy.polygonInRange),
              closingSegmentPath: null,
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      description: 'The user keep drawing its shape, we store new coords',
      update: `eventProxy.event === 'drawingshape'
          ?
            {
              state: 'resizing',
              polygonInRange: eventProxy.polygonInRange,
              polygonInDomain: eventProxy.polygonInDomain,
              path: coordsArrayToPath(eventProxy.polygonInRange),
              closingSegmentPath: eventProxy.mouseMoveInRange.distance <= ${config.maxDistanceToClose} ?
                coordsArrayToPath([ [eventProxy.mouseMoveInRange.x[0], eventProxy.mouseMoveInRange.y[0]], [eventProxy.mouseMoveInRange.x[1], eventProxy.mouseMoveInRange.y[1]] ]) : null,
              domEvent: eventProxy.domEvent
            }
          : ${config.name}`,
    },
    {
      events: '[view:mousedown[event.button === 0 && (!event.altKey || event.ctrlKey || event.metaKey)], window:mouseup] > window:mousemove!',
      update: `
        eventProxy.event === 'stopdrawingshape' && ${config.name}.state !== 'init' && ${config.name}.state !== 'stop'
          ? {
              state: 'stop',
              polygonInRange: eventProxy.polygonInRange,
              polygonInDomain: eventProxy.polygonInDomain,
              path: coordsArrayToPath(eventProxy.polygonInRange),
              domEvent: eventProxy.domEvent,
              closingSegmentPath: ${config.name}.closingSegmentPath
            }
          : ${config.name}`,
    },
  ],
})
