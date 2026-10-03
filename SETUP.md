# Como configurar o Controle de Ponto

Este projeto tem:
- `Code.gs` — script que grava os horários na planilha (cola no Apps Script).
- `extensao/` — extensão do Chrome com saldo, registro rápido e lançamento manual (recomendado, veja a seção 7).
- `index.html` — a tela simples com os botões (alternativa sem extensão).
- `SETUP.md` — este guia.

## 1. Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha nova.
2. Dê o nome que quiser para a planilha (ex: "Controle de Ponto").
3. Não precisa criar a aba nem os cabeçalhos manualmente — o script cria a aba "Ponto" com os cabeçalhos automaticamente na primeira vez que você registrar um ponto.

## 2. Publicar o Apps Script

1. Na planilha, vá em **Extensões > Apps Script**.
2. Apague o conteúdo padrão do arquivo `Código.gs` que abrir.
3. Copie todo o conteúdo do arquivo [`Code.gs`](Code.gs) deste projeto e cole lá.
4. Salve (ícone de disquete ou `Ctrl+S`).
5. Clique em **Implantar > Nova implantação**.
6. Em "Selecionar tipo", clique no ícone de engrenagem e escolha **App da Web**.
7. Configure:
   - **Executar como:** Eu (seu e-mail)
   - **Quem pode acessar:** Qualquer pessoa
8. Clique em **Implantar**.
9. O Google vai pedir para autorizar o script (é a sua própria conta acessando a sua própria planilha — pode aparecer um aviso de "app não verificado"; clique em "Avançado" > "Acessar [nome do projeto] (não seguro)" para prosseguir, já que o app é seu).
10. Depois de autorizar, copie a **URL do app da Web** gerada (algo como `https://script.google.com/macros/s/AKfycb.../exec`).

## 3. Configurar a página HTML

1. Copie o arquivo `config.example.js` para `config.js`, na mesma pasta.
2. Abra `config.js` em um editor de texto e substitua `COLE_AQUI_A_URL_DO_WEB_APP` pela URL que você copiou no passo anterior, mantendo as aspas.
3. Salve o arquivo.

O `config.js` está no `.gitignore` de propósito: quem tem a URL do Web App consegue ler e gravar na sua planilha, então ela não deve ir para o repositório.

## 4. Criar um atalho de acesso rápido

**Opção simples:** dê dois cliques em `index.html` para abrir no navegador padrão. Para ter um atalho na área de trabalho:

1. Clique com o botão direito em `index.html` neste projeto.
2. Escolha "Criar atalho".
3. Arraste o atalho criado para a Área de Trabalho.

**Alternativa:** abra `index.html` no navegador e adicione a aba aos Favoritos, fixando-a na barra de favoritos para acesso em um clique.

## 5. Usar

1. Abra `index.html` (pelo atalho).
2. A data já vem preenchida com o dia atual — troque se for lançar um dia anterior.
3. Clique no botão correspondente (Entrada, Saída Almoço, Volta Almoço, Saída).
4. Confira na planilha: uma linha para o dia selecionado, com o horário na coluna certa.

## 6. Totalizador de horas (saldo devedor/credor)

A planilha calcula automaticamente, por linha (dia):
- **Horas Trabalhadas** — soma do período da manhã (Entrada → Saída Almoço) com o da tarde (Volta Almoço → Saída). Só aparece quando os 4 horários do dia estão preenchidos.
- **Saldo do Dia** — horas trabalhadas menos a meta diária. Negativo = devendo horas, positivo = horas de sobra.
- **Saldo Acumulado** — soma corrida do saldo do dia com o de todos os dias anteriores. É o seu "banco de horas": negativo = você está devendo no total, positivo = tem sobra acumulada.

Esses 3 valores são calculados pelo script (não são fórmulas de planilha, o que evita erros de formato/idioma) sempre que: você clica em um botão na página, ou você edita manualmente um horário direto na planilha (o script reage sozinho via `onEdit`, sem precisar configurar nada a mais).

A meta diária fica na célula **K1** da aba "Ponto" (rótulo em J1), com valor padrão de **8.8** (8h48min, referente a 44h semanais). Edite essa célula a qualquer momento para o valor da sua jornada. Depois de mudar a meta, rode `configurarTotalizador` (passo abaixo) para recalcular tudo com o novo valor — a edição da célula de meta sozinha não dispara o recálculo.

### Se você já usava a versão anterior (com erro #ERROR! nas colunas de totais)

1. Repita o passo 2 (cole o novo conteúdo de `Code.gs` no editor do Apps Script, substituindo tudo, e salve). Não precisa reimplantar/gerar nova URL, pois `doPost` continua exposto do mesmo jeito.
2. No editor do Apps Script, no menu suspenso de funções (ao lado do botão ▶ Executar), selecione `configurarTotalizador`.
3. Clique em **Executar** (a primeira execução pode pedir autorização de novo — aceite, é a mesma conta/planilha). Isso substitui as células com erro pelos valores corretos em todas as linhas existentes.
4. Ajuste a célula K1 com a sua jornada diária real, se for diferente de 8.8, e rode `configurarTotalizador` de novo para recalcular com o novo valor.

## 7. Extensão do Chrome

A extensão mostra o saldo acumulado do banco de horas, os registros do dia, botões para registrar com o horário atual e um formulário de lançamento manual (dia + horário + tipo).

### Atualizar o Apps Script (obrigatório para a extensão)

A extensão usa um endpoint de leitura (`doGet`) e o horário manual no `doPost`, que só existem a partir desta versão do `Code.gs`:

1. Cole o `Code.gs` atualizado no editor do Apps Script (substituindo tudo) e salve.
2. Vá em **Implantar > Gerenciar implantações**, clique no lápis (editar) da implantação existente.
3. Em **Versão**, escolha **Nova versão** e clique em **Implantar**. A URL continua a mesma.

Sem esse passo a extensão mostra "Resposta inesperada do Apps Script".

### Instalar

1. Abra `chrome://extensions` no Chrome.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta `C:\PROJETOS\ControlePonto\extensao`.
4. Fixe a extensão na barra (ícone de quebra-cabeça → alfinete em "Controle de Ponto").
5. Abra a extensão: na primeira vez ela pede a **URL do Web App** — cole a mesma URL `.../exec` usada no `config.js` e clique em Salvar. Dá para trocar depois pelo botão ⚙.

### Usar

- **Registrar agora:** o próximo registro esperado do dia fica destacado em verde. Clicar registra com o horário atual. Se o tipo já tiver horário, a extensão pergunta antes de substituir.
- **Lançamento manual:** escolha o dia, o horário e o tipo, e clique em Lançar. Ao trocar o dia, o quadro "Registros" mostra o que já existe naquela data e o tipo sugerido passa a ser o próximo que falta.
- **Saldo acumulado:** verde = horas de sobra, vermelho = horas devendo. O botão ⟳ recarrega os dados da planilha (útil se você editou algo direto no Sheets).

Dias lançados fora de ordem (ex: um dia antigo esquecido) são inseridos na posição cronológica correta da planilha, para o Saldo Acumulado continuar coerente.

## Se algo der errado

- **Extensão mostra "Resposta inesperada do Apps Script":** o Apps Script não foi reimplantado como nova versão (seção 7) ou o acesso da implantação não está como "Qualquer pessoa".
- **Nada acontece ao clicar:** confira se `WEB_APP_URL` foi preenchida corretamente em `config.js` (sem espaços extras, com `/exec` no final).
- **Erro de permissão:** repita o passo 2, item 9 — o script precisa de autorização da sua conta Google na primeira implantação (ou na primeira execução manual de uma função nova, como `configurarTotalizador`).
- **Alterou o `Code.gs` depois de já ter implantado:** volte em **Implantar > Gerenciar implantações**, edite a implantação existente e clique em "Nova versão" para que as mudanças entrem em vigor (a URL continua a mesma). Isso só é necessário se você mudou `doPost`; rodar `configurarTotalizador` manualmente não exige nova implantação.
- **Saldo Acumulado parece errado:** ele soma as linhas em ordem, de cima para baixo — evite reordenar ou apagar linhas manualmente; se precisar corrigir um dia, edite os horários da própria linha em vez de mover linhas. Se desconfiar que algo ficou inconsistente, rode `configurarTotalizador` para recalcular tudo do zero.
