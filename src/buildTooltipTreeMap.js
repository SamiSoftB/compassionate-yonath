const buildTooltip = (chartStruct) => {
  const cold = chartStruct.columnsData;

  const selectionName = chartStruct.columnsData.selection.name;

  let res = `merge(createObject(datum.column, datum.name),`;

  res =
    res +
    `
  datum['${selectionName}'] > 0 
  ? merge( createObject( '${cold.size.name}', datum.size), 
           createObject( '${cold.size.name}'+ ' Selection', datum.sizeSelected )              )
  : createObject( '${cold.size.name}', datum.size))`;

res= `merge(createObject('${cold.color.name}', datum.color), ${res})` 

  return res;
};

export default buildTooltip;
