/* 
// Código referente a analise de Aerosol Absorvente (TROPOMI) UVI. Aqui, seleciono uma semana com base na quantidade de focos de calor,
// para criar uma visualização dos valores Máximo e Percentil-75% de UVI. 
// Após essa etapa, exporto para criar pontos amostrais no Qgis somente sobre os pixels com valores maiores que 0,
// pois de acordo com a própria documentação TROPOMI esse valor é o limiar que indica presença de fumaça.
*/

// Define as datas como variáveis
var startDate = '2018-11-11';
var endDate = '2018-11-17';
var filterDate = startDate + '_a_' + endDate;

// Coleta os dados
var collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI')
  .select('absorbing_aerosol_index')
  .filterDate(startDate, endDate);
  
var geometry = table;
var limiar = 0.000001;

// Obtem o valor máaximo de cada pixel na semana
var maxImage = collection.max().clip(geometry);

// Cria duas máscaras: uma para background, outra para poluição
var backgroundMax = maxImage.updateMask(maxImage.lte(limiar));
var pollutedMax = maxImage.updateMask(maxImage.gt(limiar));

// Adiciona ambas ao mapa com paletas diferentes
Map.addLayer(backgroundMax, {min: -1, max: limiar, palette: ['#cccccc']},'Max Background', false);
Map.addLayer(pollutedMax, {min: limiar, max: 2, palette: ['purple', 'black']}, 'Max Fumaca');


//----VISUALIZACAO DO QUARTIL SUPERIOR (percentil 75% = P75)----//
// Obtém o valor do percentil 75 por pixel (quartil superior no tempo)
var quartilP75Image = collection.reduce(ee.Reducer.percentile([75])).clip(geometry);

// Cria duas máscaras: uma para background, outra para poluição
var backgroundP75 = quartilP75Image.updateMask(quartilP75Image.lte(limiar));
var pollutedP75 = quartilP75Image.updateMask(quartilP75Image.gt(limiar));

// Adiciona ambas ao mapa com paletas diferentes
Map.addLayer(backgroundP75, {min: -1, max: limiar, palette: ['#cccccc']},'P75 Background', false);
Map.addLayer(pollutedP75, {min: limiar, max: 2, palette: ['yellow', 'red']}, 'P75 Fumaca');



//----------------EXPORTACAO E ENQUADRAMENTO----------------//
Export.image.toDrive({
  image: maxImage,
  description: 'MaximaSemanal ' + filterDate,
  scale: 1113.2, // Especifica a resolução espacial em metros
  region: geometry // Define a região de interesse para exportação
});

Export.image.toDrive({
  image: quartilP75Image,
  description: 'QuartilSupSemanal ' + filterDate,
  scale: 1113.2, // Especifica a resolução espacial em metros
  region: geometry // Define a região de interesse para exportação
});


Map.setCenter(-60.873, 2.0, 6.5);
