# Registro de ponto por localização no iPhone (app Atalhos)

Com uma automação do app **Atalhos**, o iPhone detecta que você **chegou** ou **saiu** da empresa e pergunta se pode registrar o ponto. Ao confirmar, ele chama o seu Web App do Apps Script, que grava no próximo horário vazio do dia.

Como você sai para almoçar, os 4 eventos do dia acontecem em ordem e o script preenche cada um sozinho:

| Evento do dia | Gatilho | Registrado como |
|---|---|---|
| Chegou de manhã | Chegar | Entrada |
| Saiu para o almoço | Sair | Saída Almoço |
| Voltou do almoço | Chegar | Volta Almoço |
| Foi embora | Sair | Saída |

Quem decide o tipo é o servidor (`tipo=auto`), não o iPhone. Por isso um único atalho serve para os quatro eventos.

## Antes de começar

1. O `Code.gs` precisa estar na versão com `tipo=auto`, publicado como **nova versão** em *Implantar → Gerenciar implantações* (a URL não muda).
2. No Apps Script, em *Configurações do projeto*, o **fuso horário** deve ser `America/Sao_Paulo`. O horário gravado é o do servidor.
3. Tenha a URL do Web App (`https://script.google.com/macros/s/.../exec`) à mão, por exemplo copiada para a área de transferência.

## 1. Criar o atalho "Bater ponto"

No app **Atalhos**, aba **Atalhos**, toque em **+** e adicione, nesta ordem:

1. **Obter Conteúdo da URL**
   - URL: cole a URL do Web App.
   - Toque em **Mostrar Mais** e configure:
     - Método: **POST**
     - Corpo da Solicitação: **Formulário**
     - **Adicionar novo campo** → tipo **Texto** → Chave: `tipo` → Texto: `auto`
2. **Obter Valor do Dicionário**
   - Obter: **Valor** para a chave `mensagem` (em: *Conteúdo da URL*).
3. **Mostrar Notificação**
   - Corpo: o valor obtido no passo anterior.

Dê o nome **Bater ponto** ao atalho.

Teste uma vez manualmente tocando no atalho. Ele grava um ponto de verdade na planilha, então confira a linha do dia depois. A notificação deve mostrar algo como:

> Entrada registrada às 08:02 (2026-10-12) · saldo +5:12

Se o toque for repetido em menos de 10 minutos, a resposta é "Ignorado: já houve um registro há menos de 10 min." e nada é gravado. Isso protege contra o gatilho disparar duas vezes.

## 2. Criar as duas automações

Aba **Automação** → **+** → **Criar Automação Pessoal**. Faça duas vezes, uma para **Chegar** e outra para **Sair**:

1. Escolha **Chegar** (depois, **Sair**).
2. **Local**: toque em **Escolher** e selecione o endereço da empresa. Use um raio de **150 a 200 m**. Raio muito pequeno falha por causa da imprecisão do GPS.
3. **Horário**: *A Qualquer Momento*.
4. Toque em **Seguinte**, adicione a ação **Executar Atalho** e escolha **Bater ponto**.
5. Na tela seguinte, deixe a execução como **Executar Após Confirmação** (em versões mais antigas do iOS: **Perguntar Antes de Executar**). Mantenha **Notificar Quando Executar** ligado.
6. Toque em **OK**.

Com a confirmação ligada, ao chegar ou sair aparece uma notificação do Atalhos. Toque nela e confirme para registrar.

## 3. Permissões do iPhone

- *Ajustes → Privacidade e Segurança → Serviços de Localização → Atalhos*: **Sempre**.
- *Ajustes → Notificações → Atalhos*: permitir notificações.
- *Serviços de Localização* ligados, e *Localização Precisa* ligada para o Atalhos.

## Limites e cuidados

- **O horário gravado é o da confirmação**, não o da chegada. Confirme logo que a notificação aparecer. Se precisar corrigir, use o lançamento manual no app.
- O iOS pode **atrasar o gatilho** em alguns minutos e pode disparar quando você apenas **passa perto** da empresa. A confirmação existe para isso: ignore a notificação.
- Se um registro automático ficar na posição errada (por exemplo, esqueceu de confirmar a saída do almoço e a próxima confirmação virou a Saída Almoço), corrija o dia pelo lançamento manual do app.
- O atalho guarda a **URL do Web App**, que funciona como senha. **Não compartilhe** o atalho nem prints da tela dele.

## Extras

- **Bater ponto sem abrir o app:** adicione o mesmo atalho à Tela de Início, ao Botão de Ação (iPhone 15 Pro ou mais novo) ou use *Ajustes → Acessibilidade → Toque → Toque nas Costas*.
- Para ver o **saldo** e fazer **lançamentos manuais**, use o app instalado na Tela de Início (veja o README).
