//PARTE 01 - CODIGO PARA EXTRAIR A MEDIA UNIFICADA DE TODOS OS PONTOS AMOSTRAIS:
var points = table;  // Pontos Amostrais Baseados em Fitorregioes
var scale = 1113.2;

// DEFINA O BLOCO DE SEMANAS AQUI:
var semanaInicial = 0;   // Semana 1 (0-indexado)
var semanaFinal = 312;    // Semana 313 (0-indexado)
var semanasSelecionadas = ee.List.sequence(semanaInicial, semanaFinal);

/*
// Caso deseje uma lista com semanas esepcificas, utilizar esse trecho e suspender trecho acima.
// SEMANAS DE REFERÊNCIA (0-indexado) - Semanas com menos de 200 Focos de Calor (VIIRS + MODIS)
var semanasSelecionadas = ee.List([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 21, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,
  63, 64, 65, 66, 67, 68, 72, 73, 74, 75, 76, 77, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
  111, 112, 113, 114, 115, 118, 122, 123, 124, 125, 126, 129, 130, 131, 132, 135, 144, 145, 147, 148, 149, 150, 151, 152,
  153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 168, 181, 193, 196, 198, 199, 200, 201, 202, 203,
  204, 205, 206, 207, 208, 209, 210, 211, 212, 214, 215, 217, 218, 219, 224, 225, 226, 227, 230, 231, 235, 236, 253, 254, 255, 256,
  257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 303, 305, 306, 307, 308, 309, 310, 311, 312
]);
*/

// Função para calcular a média de CO em todos os pontos por semana
var stats = semanasSelecionadas.map(function(i) {
  var startDate = ee.Date('2018-07-01').advance(ee.Number(i), 'week');
  var endDate = startDate.advance(6, 'day');

  var meanImage = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CO')
    .select('CO_column_number_density')
    .filterDate(startDate, endDate)
    .mean();

  var valoresPorPonto = meanImage.reduceRegions({
    collection: points,
    reducer: ee.Reducer.mean(),
    scale: scale,
    tileScale: 4,
    maxPixelsPerRegion: 1e13
  });

  // Remove valores nulos
  var valoresFiltrados = valoresPorPonto
    .filter(ee.Filter.notNull(['mean']))
    .aggregate_array('mean');

  var mediaTodosPontos = ee.Array(valoresFiltrados).reduce('mean', [0]);

  return ee.Feature(null, {
    'Semana': ee.Number(i).add(1),
    'Data_Início': startDate.format('YYYY-MM-dd'),
    'Média_CO': mediaTodosPontos
  });
});

// Converte para FeatureCollection
var statsFC = ee.FeatureCollection(stats);

// Mostra a tabela no Console
print('📋 Tabela com Média Semanal de CO (semanas específicas):', statsFC);

// Gera o gráfico de linha
var chart = ui.Chart.feature.byFeature(statsFC, 'Semana', 'Média_CO')
  .setChartType('LineChart')
  .setOptions({
    title: 'Média Semanal de CO - Semanas Selecionadas',
    hAxis: { title: 'Semana' },
    vAxis: { title: 'CO médio (mol/m²)' },
    lineWidth: 2,
    pointSize: 3,
    legend: { position: 'none' }
  });

print(chart);





//---------------------------------------------------------//

//PARTE 02 - CODIGO PARA EXTRAIR A MEDIA DE CADA PONTO INDIVIDUALMENTE:
var points = table;
var scale = 1113.2;

// Para cada semana, calcular o valor de CO para todos os pontos
var todasAsSemanas = semanasSelecionadas.map(function(semanaIndex) {
  semanaIndex = ee.Number(semanaIndex);
  
  var startDate = ee.Date('2018-07-01').advance(semanaIndex, 'week');
  var endDate = startDate.advance(6, 'day');

  var imagemMedia = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CO')
    .select('CO_column_number_density')
    .filterDate(startDate, endDate)
    .mean();

  var pontosComMedia = imagemMedia.reduceRegions({
    collection: points,
    reducer: ee.Reducer.mean(),
    scale: scale,
    tileScale: 4,
    maxPixelsPerRegion: 1e13
  });

  // Adiciona metadados da semana e data a cada ponto
  return pontosComMedia.map(function(f) {
    return f.set({
      'Semana': semanaIndex.add(1),
      'Data_Início': startDate.format('YYYY-MM-dd')
    });
  });
});

// Junta todas as semanas e pontos em uma só coleção
var resultados = ee.FeatureCollection(todasAsSemanas).flatten();

// Filtra apenas os que têm valor de CO calculado
var resultadosFiltrados = resultados.filter(ee.Filter.notNull(['mean']));

// Visualizar no console
print('📋 Resultados por ponto e semana:', resultadosFiltrados.limit(10));

// Exportar como CSV
Export.table.toDrive({
  collection: resultadosFiltrados,
  description: 'Export_CO_Semanal_PorPonto',
  fileFormat: 'CSV',
  selectors: ['fid', 'Local_Tipo', 'Semana', 'Data_Início', 'mean']
});





//---------------------------------------------------------//

//PARTE 03 - APRIMORAMENTO DO CODIGO (PARTE 01) PARA EXTRAIR DESVIO PADRAO E VARIANCIA:
var points = table;  // Seus 12 pontos amostrais
var scale = 1113.2;


// Função principal
var stats = semanasSelecionadas.map(function(i) {
  var startDate = ee.Date('2018-07-01').advance(ee.Number(i), 'week');
  var endDate = startDate.advance(6, 'day');

  var meanImage = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CO')
    .select('CO_column_number_density')
    .filterDate(startDate, endDate)
    .mean();

  var valoresPorPonto = meanImage.reduceRegions({
    collection: points,
    reducer: ee.Reducer.mean(),
    scale: scale,
    tileScale: 4,
    maxPixelsPerRegion: 1e13
  });

  // Coletar os valores filtrados (não nulos)
  var valores = valoresPorPonto
    .filter(ee.Filter.notNull(['mean']))
    .aggregate_array('mean');

  var array = ee.Array(valores);
  var media = array.reduce('mean', [0]);
  var variancia = array.reduce('variance', [0]);
  var desvioPadrao = variancia.sqrt();
  var coeficienteVariacao = desvioPadrao.divide(media).multiply(100);

  return ee.Feature(null, {
    'Semana': ee.Number(i).add(1),
    'Data_Inicio_Semana': startDate.format('YYYY-MM-dd'),
    'Media': media,
    'Variancia': variancia,
    'DesvioPadrao': desvioPadrao,
    'CoeficienteVariacao': coeficienteVariacao,
  });
});

var statsFC = ee.FeatureCollection(stats);

// Exibe no Console
print('📋 Tabela com Média, Variância e Desvio Padrão:', statsFC);

// Gráfico
var chart = ui.Chart.feature.byFeature(statsFC, 'Semana', ['Média_CO', 'DesvioPadrão_CO'])
  .setChartType('LineChart')
  .setOptions({
    title: 'Média Semanal de CO com Desvio Padrão',
    hAxis: { title: 'Semana' },
    vAxis: { title: 'CO (mol/m²)' },
    lineWidth: 2,
    pointSize: 4,
    series: {
      0: { lineWidth: 2, color: '#1f77b4' },
      1: { lineWidth: 1, color: '#ff7f0e', lineDashStyle: [4, 4] }
    },
    legend: { position: 'bottom' }
  });

print(chart);

// Exportar para CSV se desejar:
Export.table.toDrive({
  collection: statsFC,
  description: 'MediaDispersaoTotal_COAmostraV05',
  fileFormat: 'CSV'
});
