/**
 * Controle de Ponto - Apps Script
 *
 * Cole este código no editor de Apps Script vinculado à sua planilha
 * (Extensões > Apps Script) e publique como Web App.
 *
 * Estrutura da aba "Ponto":
 * Data | Entrada | Saída Almoço | Volta Almoço | Saída | Horas Trabalhadas | Saldo do Dia | Saldo Acumulado
 *
 * Endpoints do Web App:
 * - GET  ?data=yyyy-MM-dd                  -> JSON com saldo acumulado e registros do dia
 * - POST data, tipo, hora (HH:mm opcional) -> registra o ponto e devolve o mesmo JSON do GET
 *
 * Sempre que alterar este arquivo, publique uma nova versão em
 * Implantar > Gerenciar implantações (veja SETUP.md).
 */

const SHEET_NAME = 'Ponto';
const META_LABEL_CELL = 'J1';
const META_CELL = 'K1';
const DEFAULT_META_HORAS = 8.8; // 8h48min/dia (44h/semana). Ajuste na célula K1 da planilha.

const COLUNAS = {
  entrada: 2,
  saida_almoco: 3,
  volta_almoco: 4,
  saida: 5
};

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function doGet(e) {
  const sheet = getSheet_();
  const data = REGEX_DATA.test(e.parameter.data || '') ? e.parameter.data : hoje_();
  return json_(montarResumo_(sheet, data));
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const data = (e.parameter.data || '').trim();
    const tipo = (e.parameter.tipo || '').trim();
    const horaManual = (e.parameter.hora || '').trim();

    if (!REGEX_DATA.test(data) || !COLUNAS[tipo]) {
      return json_({ ok: false, erro: 'Parâmetros inválidos: data ou tipo ausente/desconhecido.' });
    }
    if (horaManual && !REGEX_HORA.test(horaManual)) {
      return json_({ ok: false, erro: 'Horário inválido. Use o formato HH:mm.' });
    }

    const hora = horaManual
      ? horaManual + ':00'
      : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
    const linha = encontrarOuCriarLinha_(sheet, data);

    sheet.getRange(linha, COLUNAS[tipo]).setValue(hora);
    recalcularTotais_(sheet, 2);
    SpreadsheetApp.flush();

    return json_(montarResumo_(sheet, data));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Recalcula automaticamente os totais quando você edita à mão um horário
 * (colunas A a E) diretamente na planilha.
 */
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (range.getRow() < 2 || range.getColumn() > 5) return;
  recalcularTotais_(sheet, range.getRow());
}

/**
 * Execute manualmente pelo editor do Apps Script para forçar um recálculo
 * geral (ex: depois de alterar a meta diária em K1).
 */
function configurarTotalizador() {
  const sheet = getSheet_();
  recalcularTotais_(sheet, 2);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Data', 'Entrada', 'Saída Almoço', 'Volta Almoço', 'Saída']);
  }

  const cabecalhosTotais = sheet.getRange(1, 6, 1, 3).getValues()[0].join('');
  if (!cabecalhosTotais) {
    sheet.getRange(1, 6, 1, 3).setValues([['Horas Trabalhadas', 'Saldo do Dia', 'Saldo Acumulado']]);
  }
  sheet.getRange('A1:H1').setFontWeight('bold');

  if (!sheet.getRange(META_LABEL_CELL).getValue()) {
    sheet.getRange(META_LABEL_CELL).setValue('Meta diária (horas):');
  }
  if (!sheet.getRange(META_CELL).getValue()) {
    sheet.getRange(META_CELL).setValue(DEFAULT_META_HORAS);
  }

  sheet.getRange('F2:F').setNumberFormat('[h]:mm');
  sheet.getRange('G2:H').setNumberFormat('+[h]:mm;-[h]:mm');

  return sheet;
}

function encontrarLinha_(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const datas = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < datas.length; i++) {
    if (formatarData_(datas[i][0]) === data) {
      return i + 2;
    }
  }
  return 0;
}

/**
 * Cria a linha do dia se ainda não existir e mantém a planilha ordenada por
 * data, para que o Saldo Acumulado siga a ordem cronológica mesmo quando um
 * dia antigo é lançado manualmente depois.
 */
function encontrarOuCriarLinha_(sheet, data) {
  const existente = encontrarLinha_(sheet, data);
  if (existente) return existente;

  const novaLinha = sheet.getLastRow() + 1;
  sheet.getRange(novaLinha, 1).setValue(data);
  if (novaLinha > 2) {
    sheet.getRange(2, 1, novaLinha - 1, 8).sort({ column: 1, ascending: true });
  }
  return encontrarLinha_(sheet, data);
}

/**
 * Recalcula Horas Trabalhadas / Saldo do Dia / Saldo Acumulado da linha
 * informada até a última, em lote. Os valores são gravados em fração de dia
 * para o formato de duração [h]:mm funcionar.
 */
function recalcularTotais_(sheet, linhaInicial) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const meta = lerMeta_(sheet);
  let acumuladoHoras = linhaInicial > 2
    ? (Number(sheet.getRange(linhaInicial - 1, 8).getValue()) || 0) * 24
    : 0;

  const numLinhas = lastRow - linhaInicial + 1;
  const dados = sheet.getRange(linhaInicial, 2, numLinhas, 4).getValues();
  const resultado = [];

  for (let i = 0; i < dados.length; i++) {
    const horas = horasTrabalhadas_(dados[i]);
    if (horas === null) {
      resultado.push(['', '', acumuladoHoras / 24]);
      continue;
    }
    const saldoDiaHoras = horas - meta;
    acumuladoHoras += saldoDiaHoras;
    resultado.push([horas / 24, saldoDiaHoras / 24, acumuladoHoras / 24]);
  }

  sheet.getRange(linhaInicial, 6, resultado.length, 3).setValues(resultado);
}

/**
 * Resumo devolvido para a extensão: saldo acumulado de todos os dias
 * completos e os registros do dia pedido. Durações em minutos.
 */
function montarResumo_(sheet, data) {
  const meta = lerMeta_(sheet);
  const lastRow = sheet.getLastRow();
  let saldoHoras = 0;
  let dia = { data: data, entrada: '', saida_almoco: '', volta_almoco: '', saida: '', trabalhadoMin: null, saldoDiaMin: null };

  if (lastRow >= 2) {
    const range = sheet.getRange(2, 1, lastRow - 1, 5);
    const valores = range.getValues();
    const exibicao = range.getDisplayValues();

    for (let i = 0; i < valores.length; i++) {
      const horas = horasTrabalhadas_(valores[i].slice(1));
      if (horas !== null) saldoHoras += horas - meta;

      if (formatarData_(valores[i][0]) === data) {
        dia = {
          data: data,
          entrada: hhmm_(exibicao[i][1]),
          saida_almoco: hhmm_(exibicao[i][2]),
          volta_almoco: hhmm_(exibicao[i][3]),
          saida: hhmm_(exibicao[i][4]),
          trabalhadoMin: horas === null ? null : Math.round(horas * 60),
          saldoDiaMin: horas === null ? null : Math.round((horas - meta) * 60)
        };
      }
    }
  }

  return {
    ok: true,
    metaMin: Math.round(meta * 60),
    saldoAcumuladoMin: Math.round(saldoHoras * 60),
    dia: dia
  };
}

function horasTrabalhadas_(horarios) {
  const entrada = horarios[0];
  const saidaAlmoco = horarios[1];
  const voltaAlmoco = horarios[2];
  const saida = horarios[3];
  if (!(ehHorario_(entrada) && ehHorario_(saidaAlmoco) && ehHorario_(voltaAlmoco) && ehHorario_(saida))) {
    return null;
  }
  return diffHoras_(entrada, saidaAlmoco) + diffHoras_(voltaAlmoco, saida);
}

function lerMeta_(sheet) {
  return Number(sheet.getRange(META_CELL).getValue()) || 0;
}

function hhmm_(texto) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(texto || '').trim());
  return match ? ('0' + match[1]).slice(-2) + ':' + match[2] : '';
}

function hoje_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ehHorario_(valor) {
  return Object.prototype.toString.call(valor) === '[object Date]';
}

function diffHoras_(inicio, fim) {
  return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
}

function formatarData_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(valor).trim();
}
