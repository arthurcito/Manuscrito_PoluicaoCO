var geometry = table;

var threshold = 0.032;

for (var i = 0; i < 10; i++) {
  var startDate = ee.Date('2018-07-01').advance(i, 'week');
  var endDate = startDate.advance(6, 'day');

  var collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CO')
    .select('CO_column_number_density')
    .filterDate(startDate, endDate);

  var meanImage = collection.mean().clip(geometry);

  // Cria duas máscaras: uma para background, outra para poluição
  var background = meanImage.updateMask(meanImage.lte(threshold));
  var polluted = meanImage.updateMask(meanImage.gt(threshold));

  // Adiciona ambas ao mapa com paletas diferentes
  Map.addLayer(background, {min: 0, max: threshold, palette: ['#cccccc']}, 'Semana ' + (i + 1) + ' - background');
  Map.addLayer(polluted, {min: threshold, max: 0.05, palette: ['yellow', 'red', 'purple', 'black']}, 'Semana ' + (i + 1) + ' - CO acima limiar');
}

Map.setCenter(-60.873, 2.0, 7);
