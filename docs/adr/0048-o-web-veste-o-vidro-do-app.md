# O web veste o vidro do app

O dashboard e o admin do web passam a usar o material do app mobile: a
superfície iOS, o vidro com blur e brilho, a luz ambiente e a barra quase
opaca na navegação. Isso revoga a coluna "é de cada plataforma" do ADR-0025
para fundo, cartão e separador. A escala de texto continua separada. A paleta
mora em `shared/` e os dois lados geram dela o próprio CSS, cada um com teste
que falha quando o arquivo em disco anda separado.

**Status:** accepted. Issue #459.

## Por quê

O ADR-0025 separou as superfícies porque o mobile foi desenhado com linguagem
Apple e o dashboard era zinc. Um piloto no dashboard do especialista mostrou o
vidro funcionando no web, e manter duas linguagens para o mesmo produto passou
a custar mais que a diferença de contexto entre telefone e desktop.

## O que fica sólido, de propósito

Modal, dropdown, popover, input, botão, balão de chat e casca de tabela
continuam na superfície sólida do app, sem blur. Blur atrás de texto denso e
de camada sobreposta prejudica a leitura e pesa no navegador. Na dúvida, um
cartão novo vira `glass`; um controle ou camada sobreposta, `bg-surface`.

## Consequências

- O material vale dentro da classe `material-glass`, posta na raiz dos layouts
  do dashboard e do admin. Login, cadastro e a landing ficam de fora: têm visual
  de marketing próprio.
- Fora do escopo, `glass` vale o cartão zinc chapado. Tirar a classe de um
  layout volta aquela área inteira ao visual anterior sem tocar em componente.
- O trecho `material-glass` do `globals.css` é gerado da paleta e não se edita
  à mão; a receita do vidro (blur, sombra, luz ambiente) logo abaixo dele é
  escrita à mão e segue `design/mobile/kit/glass.css`.
