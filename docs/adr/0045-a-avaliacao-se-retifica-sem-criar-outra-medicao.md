# A avaliação se retifica sem criar outra medição

A imutabilidade absoluta impedia corrigir erro de digitação e registrar uma nova
avaliação para corrigi-lo criava evolução fictícia. A issue #385 permite ao autor
especialista, ainda vinculado e autorizado, retificar medidas e nota pelo BFF com
prova privilegiada. Uma RPC reservada ao servidor preserva o conteúdo anterior em
acervo sensível e atualiza a versão vigente atomicamente, com comparação da versão
esperada. Identidade, origem, autoria e datas da medição permanecem iguais. As
leituras existentes recebem o valor corrigido sem juntar duas medições.

**Status:** accepted pelo mantenedor em 16/10/2026. Substitui a imutabilidade
absoluta da avaliação do especialista no ADR-0030; preserva as demais regras.

Preferimos manter o valor vigente na tabela já consumida por web/mobile/IA a
inserir outra avaliação e depender de cada leitor filtrar versões substituídas.
O trade-off é permitir UPDATE exclusivamente dentro da RPC; não abrimos UPDATE ao
especialista. Versões anteriores ficam separadas, legíveis pelo titular e autor
autorizado, e somem por cascata com a avaliação/conta. A finalidade é conferir a
retificação enquanto a avaliação integra o acompanhamento, sem prazo eterno nem
presunção de obrigação de prontuário. Pedido de eliminação/bloqueio segue o canal
de direitos e avaliação da necessidade de conservação, inclusive do acervo.

A LGPD garante correção (art. 18, III) e qualidade (art. 6º, V), sem impor esta
arquitetura. A necessidade e retenção do acervo são decisões do produto sujeitas
à revisão de seu responsável; metadados de auditoria técnica não levam medidas
nem observações. Fontes e limites em
[pesquisa LGPD](../research/physical-assessment-corrections-lgpd.md).
