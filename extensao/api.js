// Configuração (chrome.storage.local) e chamadas ao Web App do Apps Script.

const TIPOS = [
  { id: 'entrada', label: 'Entrada' },
  { id: 'saida_almoco', label: 'Saída Almoço' },
  { id: 'volta_almoco', label: 'Volta Almoço' },
  { id: 'saida', label: 'Saída' },
];

const PREFIXO_URL_WEB_APP = 'https://script.google.com/';

async function getWebAppUrl() {
  const { webAppUrl } = await chrome.storage.local.get({ webAppUrl: '' });
  return webAppUrl;
}

async function setWebAppUrl(url) {
  await chrome.storage.local.set({ webAppUrl: url });
}

function isWebAppUrlValida(url) {
  return url.startsWith(PREFIXO_URL_WEB_APP) && url.endsWith('/exec');
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
