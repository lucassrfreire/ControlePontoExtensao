// Configuração e chamadas ao Web App do Apps Script.
// Roda como extensão do Chrome (chrome.storage.local) e como página/PWA no celular (localStorage).

const EM_EXTENSAO = typeof chrome !== 'undefined' && Boolean(chrome.storage && chrome.storage.local);

// Carregado no <head>: marca a página antes da primeira pintura para o web.css valer sem "pulo" de layout.
if (!EM_EXTENSAO) document.documentElement.classList.add('web');

// Aparência: 'auto' (segue o sistema), 'claro' ou 'escuro'. Fica no localStorage para ser lida
// de forma síncrona e aplicada antes da primeira pintura (sem piscar).
const CHAVE_TEMA = 'tema';

function lerTema() {
  try {
    return localStorage.getItem(CHAVE_TEMA) || 'auto';
  } catch (err) {
    return 'auto';
  }
}

function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro') raiz.dataset.theme = 'light';
  else if (tema === 'escuro') raiz.dataset.theme = 'dark';
  else delete raiz.dataset.theme;
}

function salvarTema(tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (err) {
    // Sem armazenamento disponível: vale só até fechar a página.
  }
  aplicarTema(tema);
}

aplicarTema(lerTema());

const URL_PWA = 'https://lucassrfreire.github.io/ControlePontoExtensao/extensao/popup.html';
const CHAVE_STORAGE_URL = 'webAppUrl';

const TIPOS = [
  { id: 'entrada', label: 'Entrada' },
  { id: 'saida_almoco', label: 'Saída Almoço' },
  { id: 'volta_almoco', label: 'Volta Almoço' },
  { id: 'saida', label: 'Saída' },
];

const PREFIXO_URL_WEB_APP = 'https://script.google.com/';

async function getWebAppUrl() {
  if (EM_EXTENSAO) {
    const { webAppUrl } = await chrome.storage.local.get({ [CHAVE_STORAGE_URL]: '' });
    return webAppUrl;
  }
  try {
    return localStorage.getItem(CHAVE_STORAGE_URL) || '';
  } catch (err) {
    return '';
  }
}

async function setWebAppUrl(url) {
  if (EM_EXTENSAO) {
    await chrome.storage.local.set({ [CHAVE_STORAGE_URL]: url });
    return;
  }
  try {
    localStorage.setItem(CHAVE_STORAGE_URL, url);
  } catch (err) {
    // Navegação privada: a URL vale só até fechar a página.
  }
}

function isWebAppUrlValida(url) {
  return url.startsWith(PREFIXO_URL_WEB_APP) && url.endsWith('/exec');
}

// A URL do Web App vai no fragmento (#), que o navegador nunca envia a servidores.
function montarLinkCelular(url) {
  return `${URL_PWA}#u=${encodeURIComponent(url)}`;
}

function lerUrlDoLink() {
  const valor = new URLSearchParams(location.hash.replace(/^#/, '')).get('u') || '';
  return isWebAppUrlValida(valor) ? valor : '';
}

async function buscarResumo(url, data) {
  const resposta = await fetch(`${url}?data=${encodeURIComponent(data)}`);
  return lerResposta(resposta);
}

async function registrarPonto(url, data, tipo, hora) {
  const body = new URLSearchParams({ data, tipo });
  if (hora) body.set('hora', hora);
  const resposta = await fetch(url, { method: 'POST', body });
  return lerResposta(resposta);
}

async function lerResposta(resposta) {
  if (!resposta.ok) {
    throw new Error(`O Apps Script respondeu com erro ${resposta.status}.`);
  }

  let json;
  try {
    json = JSON.parse(await resposta.text());
  } catch (err) {
    throw new Error('Resposta inesperada do Apps Script. Confira se a nova versão foi implantada com acesso "Qualquer pessoa".');
  }

  if (!json.ok) {
    throw new Error(json.erro || 'Erro desconhecido ao falar com a planilha.');
  }
  return json;
}
