let webAppUrl = '';
let hoje = '';
let diaHoje = null;
let diaSelecionado = null;
let ocupado = false;
let statusTimer = null;

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONES = {
  entrada: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
  saida_almoco: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7'],
  volta_almoco: ['M17 8h1a4 4 0 1 1 0 8h-1', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z', 'M6 2v2', 'M10 2v2', 'M14 2v2'],
  saida: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
};

const refreshButton = document.getElementById('refresh-button');
const settingsButton = document.getElementById('settings-button');
const settingsEl = document.getElementById('settings');
const urlInput = document.getElementById('url-input');
const settingsSave = document.getElementById('settings-save');
const settingsCancel = document.getElementById('settings-cancel');
const saldoCard = document.querySelector('.saldo-card');
const saldoValue = document.getElementById('saldo-value');
const saldoHint = document.getElementById('saldo-hint');
const clockEl = document.getElementById('clock');
const quickGrid = document.getElementById('quick-grid');
const manualDate = document.getElementById('manual-date');
const manualTime = document.getElementById('manual-time');
const manualTipo = document.getElementById('manual-tipo');
const manualSubmit = document.getElementById('manual-submit');
const dayTitle = document.getElementById('day-title');
const dayTotal = document.getElementById('day-total');
const todayDate = document.getElementById('today-date');
const dayList = document.getElementById('day-list');
const dayFooter = document.getElementById('day-footer');
const statusEl = document.getElementById('status');

init();

async function init() {
  hoje = dataLocalISO(new Date());
  manualDate.value = hoje;
  manualDate.max = hoje;
  manualTime.value = horaLocal(new Date());
  todayDate.textContent = formatarData(hoje);

  TIPOS.forEach((tipo) => {
    const option = document.createElement('option');
    option.value = tipo.id;
    option.textContent = tipo.label;
    manualTipo.appendChild(option);
  });

  atualizarRelogio();
  setInterval(atualizarRelogio, 15000);

  refreshButton.addEventListener('click', carregar);
  settingsButton.addEventListener('click', () => abrirConfiguracoes());
  settingsCancel.addEventListener('click', fecharConfiguracoes);
  settingsSave.addEventListener('click', salvarConfiguracoes);
  manualDate.addEventListener('change', onTrocarDia);
  manualSubmit.addEventListener('click', onLancamentoManual);

  renderQuick();
  renderDia();

  webAppUrl = await getWebAppUrl();
  if (!webAppUrl) {
    saldoHint.textContent = 'Configure a URL do Web App para começar.';
    abrirConfiguracoes();
    setOcupado(false);
    return;
  }
  carregar();
}

// --- Carregamento ---

async function carregar() {
  if (!webAppUrl) return;
  setOcupado(true);
  try {
    aplicarResumo(await buscarResumo(webAppUrl, hoje));
    if (manualDate.value && manualDate.value !== hoje) {
      aplicarResumo(await buscarResumo(webAppUrl, manualDate.value));
    }
  } catch (err) {
    saldoHint.textContent = 'Não foi possível carregar a planilha.';
    mostrarStatus(err.message, true);
  } finally {
    setOcupado(false);
  }
}

async function onTrocarDia() {
  const data = manualDate.value;
  if (!data || !webAppUrl) return;

  if (data === hoje && diaHoje) {
    diaSelecionado = diaHoje;
    renderDia();
    sugerirTipoManual();
    return;
  }

  diaSelecionado = null;
  renderDia();
  try {
    aplicarResumo(await buscarResumo(webAppUrl, data));
  } catch (err) {
    mostrarStatus(err.message, true);
  }
}

function aplicarResumo(resumo) {
  renderSaldo(resumo);

  if (resumo.dia.data === hoje) {
    diaHoje = resumo.dia;
    renderQuick();
  }
  if (resumo.dia.data === manualDate.value) {
    diaSelecionado = resumo.dia;
    renderDia();
    sugerirTipoManual();
  }
}

// --- Registro ---

function onRegistrarAgora(tipo) {
  const atual = diaHoje && diaHoje[tipo.id];
  if (atual && !confirm(`${tipo.label} de hoje já está registrada às ${atual}. Substituir pelo horário atual?`)) {
    return;
  }
  registrar(hoje, tipo, '');
}

function onLancamentoManual() {
  const data = manualDate.value;
  const hora = manualTime.value;
  const tipo = TIPOS.find((t) => t.id === manualTipo.value);

  if (!data || !hora) {
    mostrarStatus('Informe o dia e o horário.', true);
    return;
  }
  if (data > hoje) {
    mostrarStatus('Não é possível lançar em uma data futura.', true);
    return;
  }

  const atual = diaSelecionado && diaSelecionado.data === data && diaSelecionado[tipo.id];
  if (atual && !confirm(`${tipo.label} de ${formatarData(data)} já está registrada às ${atual}. Substituir por ${hora}?`)) {
    return;
  }
  registrar(data, tipo, hora);
}

async function registrar(data, tipo, hora) {
  if (!webAppUrl) {
    abrirConfiguracoes();
    return;
  }

  setOcupado(true);
  try {
    const resumo = await registrarPonto(webAppUrl, data, tipo.id, hora);
    aplicarResumo(resumo);
    mostrarStatus(`${tipo.label} registrada às ${resumo.dia[tipo.id]} (${formatarData(data)}).`);
  } catch (err) {
    mostrarStatus(err.message, true);
  } finally {
    setOcupado(false);
  }
}

// --- Renderização ---

function renderSaldo(resumo) {
  const saldo = resumo.saldoAcumuladoMin;
  saldoValue.textContent = formatarSaldo(saldo);
  saldoCard.classList.toggle('negativo', saldo < 0);
  saldoCard.classList.toggle('positivo', saldo > 0);

  let situacao = 'em dia';
  if (saldo > 0) situacao = 'horas de sobra';
  if (saldo < 0) situacao = 'horas devendo';
  saldoHint.textContent = `${situacao} · meta diária ${formatarDuracao(resumo.metaMin)}`;
}

function renderQuick() {
  quickGrid.innerHTML = '';
  const proximo = TIPOS.find((t) => !(diaHoje && diaHoje[t.id]));

  TIPOS.forEach((tipo) => {
    const horario = diaHoje && diaHoje[tipo.id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-button';
    if (horario) button.classList.add('done');
    if (diaHoje && proximo && proximo.id === tipo.id) button.classList.add('next');
    button.disabled = ocupado || !webAppUrl;

    const icon = document.createElement('span');
    icon.className = 'quick-icon';
    icon.appendChild(criarIcone(tipo.id));

    const text = document.createElement('span');
    text.className = 'quick-text';

    const label = document.createElement('span');
    label.className = 'quick-label';
    label.textContent = tipo.label;

    const time = document.createElement('span');
    time.className = 'quick-time';
    time.textContent = horario || '—';

    text.appendChild(label);
    text.appendChild(time);
    button.appendChild(icon);
    button.appendChild(text);
    button.addEventListener('click', () => onRegistrarAgora(tipo));
    quickGrid.appendChild(button);
  });
}

function renderDia() {
  const data = manualDate.value;
  dayTitle.textContent = data === hoje ? 'Registros de hoje' : `Registros de ${formatarData(data)}`;
  dayList.innerHTML = '';

  const dia = diaSelecionado && diaSelecionado.data === data ? diaSelecionado : null;

  TIPOS.forEach((tipo) => {
    const horario = dia && dia[tipo.id];
    const li = document.createElement('li');

    const icon = document.createElement('span');
    icon.className = `day-icon${horario ? ' registrado' : ''}`;
    icon.appendChild(criarIcone(tipo.id));

    const label = document.createElement('span');
    label.className = 'day-label';
    label.textContent = tipo.label;

    const time = document.createElement('span');
    time.className = 'day-time';
    time.textContent = horario || (dia ? '—' : '...');
    if (!horario) time.classList.add('vazio');

    li.appendChild(icon);
    li.appendChild(label);
    li.appendChild(time);
    dayList.appendChild(li);
  });

  const trabalhado = dia ? minutosTrabalhados(dia) : null;
  dayTotal.hidden = trabalhado === null;
  if (trabalhado !== null) {
    dayTotal.textContent = `Total trabalhado: ${formatarDuracao(trabalhado)}`;
  }

  if (dia && dia.saldoDiaMin !== null) {
    dayFooter.textContent = `Saldo do dia: ${formatarSaldo(dia.saldoDiaMin)}`;
    dayFooter.classList.toggle('negativo', dia.saldoDiaMin < 0);
    dayFooter.hidden = false;
  } else {
    dayFooter.hidden = true;
  }
}

// Dia completo usa o total calculado pela planilha; dia em andamento (hoje)
// soma os períodos fechados e conta o período aberto até o horário atual.
function minutosTrabalhados(dia) {
  if (dia.trabalhadoMin !== null) return dia.trabalhadoMin;
  if (!dia.entrada) return null;

  const agora = dia.data === hoje ? paraMinutos(horaLocal(new Date())) : null;
  const periodos = [[dia.entrada, dia.saida_almoco], [dia.volta_almoco, dia.saida]];
  let total = 0;

  periodos.forEach(([inicio, fim]) => {
    if (!inicio) return;
    if (fim) {
      total += paraMinutos(fim) - paraMinutos(inicio);
    } else if (agora !== null) {
      total += Math.max(0, agora - paraMinutos(inicio));
    }
  });
  return total;
}

function criarIcone(tipoId) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  ICONES[tipoId].forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
}

function sugerirTipoManual() {
  if (!diaSelecionado) return;
  const proximo = TIPOS.find((t) => !diaSelecionado[t.id]);
  manualTipo.value = (proximo || TIPOS[TIPOS.length - 1]).id;
}

function setOcupado(valor) {
  ocupado = valor;
  refreshButton.disabled = valor || !webAppUrl;
  manualSubmit.disabled = valor || !webAppUrl;
  renderQuick();
}

function atualizarRelogio() {
  clockEl.textContent = horaLocal(new Date());
  if (manualDate.value === hoje) renderDia();
}

// --- Configurações ---

function abrirConfiguracoes() {
  urlInput.value = webAppUrl;
  settingsEl.hidden = false;
  urlInput.focus();
}

function fecharConfiguracoes() {
  settingsEl.hidden = true;
}

async function salvarConfiguracoes() {
  const url = urlInput.value.trim();
  if (!isWebAppUrlValida(url)) {
    mostrarStatus('Use a URL do Web App (começa com https://script.google.com/ e termina com /exec).', true);
    return;
  }
  webAppUrl = url;
  await setWebAppUrl(url);
  fecharConfiguracoes();
  carregar();
}

// --- Utilitários ---

function mostrarStatus(mensagem, erro = false) {
  statusEl.textContent = mensagem;
  statusEl.classList.toggle('status-error', erro);
  statusEl.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.hidden = true;
  }, erro ? 5000 : 2500);
}

function pad(numero) {
  return String(numero).padStart(2, '0');
}

function dataLocalISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function paraMinutos(hhmm) {
  const [horas, minutos] = hhmm.split(':').map(Number);
  return horas * 60 + minutos;
}

function horaLocal(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDuracao(minutos) {
  const abs = Math.abs(minutos);
  return `${Math.floor(abs / 60)}:${pad(abs % 60)}`;
}

function formatarSaldo(minutos) {
  return `${minutos < 0 ? '-' : '+'}${formatarDuracao(minutos)}`;
}
