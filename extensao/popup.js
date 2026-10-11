let webAppUrl = '';
let hoje = '';
let diaHoje = null;
let diaSelecionado = null;
let metaMin = null;
let ocupado = false;
let statusTimer = null;
let horarioEditado = false;

const SVG_NS = 'http://www.w3.org/2000/svg';
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * 52;
const ICONES = {
  entrada: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
  saida_almoco: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7'],
  volta_almoco: ['M17 8h1a4 4 0 1 1 0 8h-1', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z', 'M6 2v2', 'M10 2v2', 'M14 2v2'],
  saida: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
};
const ICONE_CHECK = ['M20 6L9 17l-5-5'];

const refreshButton = document.getElementById('refresh-button');
const settingsButton = document.getElementById('settings-button');
const settingsEl = document.getElementById('settings');
const urlInput = document.getElementById('url-input');
const settingsSave = document.getElementById('settings-save');
const settingsCancel = document.getElementById('settings-cancel');
const copyLinkButton = document.getElementById('copy-link');
const themeButtons = document.querySelectorAll('#theme-options button');
const todayDate = document.getElementById('today-date');
const ringProgress = document.getElementById('ring-progress');
const workedEl = document.getElementById('worked');
const workedOfEl = document.getElementById('worked-of');
const heroDay = document.getElementById('hero-day');
const heroChip = document.getElementById('hero-chip');
const balanceEl = document.getElementById('balance');
const saldoValue = document.getElementById('saldo-value');
const saldoHint = document.getElementById('saldo-hint');
const dayTitle = document.getElementById('day-title');
const backToday = document.getElementById('back-today');
const clockEl = document.getElementById('clock');
const timelineEl = document.getElementById('timeline');
const primaryAction = document.getElementById('primary-action');
const dayFooter = document.getElementById('day-footer');
const manualToggle = document.getElementById('manual-toggle');
const manualPanel = document.getElementById('manual-panel');
const manualDate = document.getElementById('manual-date');
const manualTime = document.getElementById('manual-time');
const manualTipo = document.getElementById('manual-tipo');
const manualSubmit = document.getElementById('manual-submit');
const statusEl = document.getElementById('status');

init();

async function init() {
  hoje = dataLocalISO(new Date());
  manualDate.value = hoje;
  manualDate.max = hoje;
  manualTime.value = horaLocal(new Date());
  todayDate.textContent = formatarDiaExtenso(hoje);
  ringProgress.style.strokeDasharray = String(CIRCUNFERENCIA_ANEL);
  ringProgress.style.strokeDashoffset = String(CIRCUNFERENCIA_ANEL);

  TIPOS.forEach((tipo) => {
    const option = document.createElement('option');
    option.value = tipo.id;
    option.textContent = tipo.label;
    manualTipo.appendChild(option);
  });

  setInterval(atualizarRelogio, 15000);

  refreshButton.addEventListener('click', carregar);
  settingsButton.addEventListener('click', () => abrirConfiguracoes());
  settingsCancel.addEventListener('click', fecharConfiguracoes);
  settingsSave.addEventListener('click', salvarConfiguracoes);
  manualToggle.addEventListener('click', () => alternarManual());
  manualDate.addEventListener('change', onTrocarDia);
  manualTime.addEventListener('input', () => { horarioEditado = true; });
  manualSubmit.addEventListener('click', onLancamentoManual);
  backToday.addEventListener('click', () => {
    manualDate.value = hoje;
    onTrocarDia();
  });
  primaryAction.addEventListener('click', () => {
    const proximo = proximoTipo(diaAtual());
    if (proximo) onRegistrarAgora(proximo);
  });

  marcarTema(lerTema());
  themeButtons.forEach((botao) => {
    botao.addEventListener('click', () => {
      salvarTema(botao.dataset.tema);
      marcarTema(botao.dataset.tema);
    });
  });

  // O link de configuração do celular só faz sentido gerar a partir da extensão.
  copyLinkButton.hidden = !EM_EXTENSAO;
  copyLinkButton.addEventListener('click', copiarLinkCelular);

  // Na PWA a página fica aberta em segundo plano: ao voltar, atualiza o dia e os dados.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) aoVoltarParaApp();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) aoVoltarParaApp();
  });

  atualizarRelogio();
  renderTudo();

  webAppUrl = await getWebAppUrl();
  const urlDoLink = lerUrlDoLink();
  const configuradoPeloLink = Boolean(urlDoLink) && urlDoLink !== webAppUrl;
  if (configuradoPeloLink) {
    webAppUrl = urlDoLink;
    await setWebAppUrl(urlDoLink);
  }
  if (!webAppUrl) {
    heroChip.textContent = 'Sem conexão';
    saldoHint.textContent = 'Configure a URL para começar';
    abrirConfiguracoes();
    setOcupado(false);
    return;
  }
  carregar();
  if (configuradoPeloLink) mostrarStatus('URL do Web App configurada pelo link.');
}

function marcarTema(tema) {
  themeButtons.forEach((botao) => {
    botao.setAttribute('aria-pressed', String(botao.dataset.tema === tema));
  });
}

function aoVoltarParaApp() {
  const hojeAgora = dataLocalISO(new Date());
  if (hojeAgora !== hoje) {
    const acompanhavaHoje = manualDate.value === hoje;
    hoje = hojeAgora;
    todayDate.textContent = formatarDiaExtenso(hoje);
    manualDate.max = hoje;
    diaHoje = null;
    if (acompanhavaHoje) {
      manualDate.value = hoje;
      diaSelecionado = null;
    }
    renderTudo();
  }
  if (!horarioEditado) manualTime.value = horaLocal(new Date());
  atualizarRelogio();
  carregar();
}

async function copiarLinkCelular() {
  if (!webAppUrl) {
    mostrarStatus('Salve a URL do Web App antes de copiar o link.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(montarLinkCelular(webAppUrl));
    mostrarStatus('Link copiado! Envie para você mesmo e abra no iPhone.');
  } catch (err) {
    mostrarStatus('Não foi possível copiar o link.', true);
  }
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
    heroChip.textContent = 'Sem conexão';
    mostrarStatus(err.message, true);
  } finally {
    setOcupado(false);
  }
}

async function onTrocarDia() {
  const data = manualDate.value;
  if (!data) return;

  if (data === hoje && diaHoje) {
    diaSelecionado = diaHoje;
    renderTudo();
    sugerirTipoManual();
    return;
  }

  diaSelecionado = null;
  renderTudo();
  if (!webAppUrl) return;
  try {
    aplicarResumo(await buscarResumo(webAppUrl, data));
  } catch (err) {
    mostrarStatus(err.message, true);
  }
}

function aplicarResumo(resumo) {
  metaMin = resumo.metaMin;
  renderSaldo(resumo);

  if (resumo.dia.data === hoje) {
    diaHoje = resumo.dia;
  }
  if (resumo.dia.data === manualDate.value) {
    diaSelecionado = resumo.dia;
    sugerirTipoManual();
  }
  renderTudo();
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
    horarioEditado = false;
    mostrarStatus(`${tipo.label} registrada às ${resumo.dia[tipo.id]} (${formatarData(data)}).`);
  } catch (err) {
    mostrarStatus(err.message, true);
  } finally {
    setOcupado(false);
  }
}

// Toque em um horário da linha do tempo: hoje registra agora; em outro dia leva ao lançamento manual.
function onToqueNoHorario(tipo) {
  if (manualDate.value === hoje) {
    onRegistrarAgora(tipo);
    return;
  }
  manualTipo.value = tipo.id;
  alternarManual(true);
  manualTime.focus();
}

// --- Renderização ---

function diaAtual() {
  return diaSelecionado && diaSelecionado.data === manualDate.value ? diaSelecionado : null;
}

function proximoTipo(dia) {
  if (!dia) return null;
  return TIPOS.find((t) => !dia[t.id]) || null;
}

function renderTudo() {
  renderHero();
  renderDia();
}

function renderSaldo(resumo) {
  const saldo = resumo.saldoAcumuladoMin;
  saldoValue.textContent = formatarSaldo(saldo);
  balanceEl.classList.toggle('negativo', saldo < 0);
  balanceEl.classList.toggle('positivo', saldo > 0);

  let situacao = 'Em dia';
  if (saldo > 0) situacao = 'Horas de sobra';
  if (saldo < 0) situacao = 'Horas devendo';
  saldoHint.textContent = situacao;
}

function renderHero() {
  const dia = diaAtual();
  const ehHoje = manualDate.value === hoje;
  heroDay.textContent = ehHoje ? 'Hoje' : formatarData(manualDate.value);

  const trabalhado = dia ? (minutosTrabalhados(dia) ?? 0) : null;
  const temMeta = metaMin !== null && metaMin > 0;
  workedEl.textContent = trabalhado === null ? '--:--' : formatarDuracao(trabalhado);
  workedOfEl.textContent = temMeta ? `de ${formatarDuracao(metaMin)}` : '';

  let progresso = 0;
  let situacao = 'andamento';
  let texto = 'Carregando...';

  if (trabalhado !== null && temMeta) {
    progresso = Math.min(1, trabalhado / metaMin);
    const diferenca = trabalhado - metaMin;
    if (!dia.entrada && !ehHoje) {
      situacao = 'vazio';
      texto = 'Sem registros';
    } else if (diferenca < 0) {
      situacao = 'falta';
      texto = `Faltam ${formatarDuracao(diferenca)}`;
    } else {
      situacao = 'ok';
      texto = diferenca === 0 ? 'Meta cumprida' : `Meta cumprida · +${formatarDuracao(diferenca)}`;
    }
  }

  heroChip.textContent = texto;
  heroChip.className = `chip ${situacao}`;
  ringProgress.classList.toggle('ok', situacao === 'ok');
  ringProgress.style.strokeDashoffset = String(CIRCUNFERENCIA_ANEL * (1 - progresso));
}

function renderDia() {
  const data = manualDate.value;
  const ehHoje = data === hoje;
  const dia = diaAtual();
  const proximo = proximoTipo(dia);

  dayTitle.textContent = ehHoje ? 'Registros de hoje' : `Registros de ${formatarData(data)}`;
  backToday.hidden = ehHoje;
  clockEl.hidden = !ehHoje;

  timelineEl.innerHTML = '';
  TIPOS.forEach((tipo) => {
    const horario = dia && dia[tipo.id];
    const li = document.createElement('li');
    li.className = 'step';
    if (horario) li.classList.add('done');
    if (ehHoje && proximo && proximo.id === tipo.id) li.classList.add('next');

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'step-button';
    botao.disabled = ocupado || !webAppUrl;
    botao.title = ehHoje ? `Registrar ${tipo.label} agora` : `Lançar ${tipo.label} manualmente`;
    botao.addEventListener('click', () => onToqueNoHorario(tipo));

    const dot = document.createElement('span');
    dot.className = 'step-dot';
    dot.appendChild(criarIcone(horario ? ICONE_CHECK : ICONES[tipo.id]));

    const label = document.createElement('span');
    label.className = 'step-label';
    label.textContent = tipo.label;

    const time = document.createElement('span');
    time.className = 'step-time';
    time.textContent = horario || (dia ? '—' : '');

    botao.appendChild(dot);
    botao.appendChild(label);
    botao.appendChild(time);
    li.appendChild(botao);
    timelineEl.appendChild(li);
  });

  const mostrarAcao = ehHoje && proximo !== null;
  primaryAction.hidden = !mostrarAcao;
  primaryAction.disabled = ocupado || !webAppUrl;
  if (mostrarAcao) primaryAction.textContent = `Registrar ${proximo.label}`;

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

function criarIcone(caminhos) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  caminhos.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
}

function sugerirTipoManual() {
  const dia = diaAtual();
  if (!dia) return;
  const proximo = TIPOS.find((t) => !dia[t.id]);
  manualTipo.value = (proximo || TIPOS[TIPOS.length - 1]).id;
}

function alternarManual(abrir) {
  const mostrar = typeof abrir === 'boolean' ? abrir : manualPanel.hidden;
  manualPanel.hidden = !mostrar;
  manualToggle.setAttribute('aria-expanded', String(mostrar));
  manualToggle.classList.toggle('aberto', mostrar);
}

function setOcupado(valor) {
  ocupado = valor;
  refreshButton.disabled = valor || !webAppUrl;
  manualSubmit.disabled = valor || !webAppUrl;
  renderDia();
}

function atualizarRelogio() {
  clockEl.textContent = horaLocal(new Date());
  if (manualDate.value === hoje) renderHero();
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

function formatarDiaExtenso(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDuracao(minutos) {
  const abs = Math.abs(minutos);
  return `${Math.floor(abs / 60)}:${pad(abs % 60)}`;
}

function formatarSaldo(minutos) {
  return `${minutos < 0 ? '-' : '+'}${formatarDuracao(minutos)}`;
}
