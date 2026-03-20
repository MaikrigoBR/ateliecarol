# Plano Diretor: Construção da Máquina de Vendas Online (E-Commerce B2B/B2C)

*Este é um documento vivo que guia a arquitetura e expansão do sistema. Se houver perda de contexto ("memória"), consulte e atualize este arquivo.*

**Data de Criação:** Março de 2026

---

## 1. Visão Geral do Projeto
Transformar o atual ecossistema interno (ERP/CRM de Produção) em uma **Loja Virtual Completa** (Máquina de Vendas). 
O foco é conectar organicamente a vitrine (Front-End) com as engrenagens de retaguarda (Estoque, Kanban de Produção e Financeiro) através de tecnologias de pagamento online com segurança nível PCI-DSS.

---

## 2. Fase 1: Arquitetura Financeira Base (Pré-Requisitos)
Antes de expor a loja ao mundo, a casa deve estar impecável financeiramente.
* **Ação 1:** Implementar tela ou modalidade de **DRE (Demonstrativo do Resultado do Exercício)**, separando o Regime de Caixa (o que entrou no banco hoje) do Regime de Competência (venda aprovada hoje). 
* **Ação 2:** Adicionar Lógica de **Adquirência (Maquininhas/Gateway)** no módulo Financeiro. Ensinar ao sistema como calcular o *MDR (Taxa de Desconto)* e o *Split de Parcelas* (ex: uma venda de R$300 no cartão de crédito em 3x pingará no Caixa em D+30, D+60 e D+90, descontando as taxas).
* **Ação 3:** Criar estrutura de **Conciliação Bancária Automatizada** (importação de OFX) para baixar em massa os títulos parcelados, reduzindo atrito manual da equipe.

---

## 3. Fase 2: O Portfólio vira Loja Virtual (Front-end B2C/B2B)
* **Design Inspiration:** Inspirado no minimalismo ultra-focado de Vercel Commerce e Shopify. Elementos *Glassmorphism*, transições sutis com `framer-motion` (Micro-interações), suporte a Dark Mode real e carregamentos ultrarrápidos (Skeleton Loaders).
* **O Catálogo:** Expor a tabela `Products` do banco de dados em uma vitrine pública (um subdomínio ou rota separada `/loja`).
* **Experiência de Compra:** 
    * Construção de um **Carrinho de Compras Efêmero** (State management em Redux ou Zustand).
    * Cálculo de Frete Dinâmico puxando tabelas de dimensões e CEP (API Rest dos Correios ou MelhorEnvio).
    * Seleção fácil de detalhes de personalização do produto por parte do cliente, amarrando metadados aos itens do carrinho.

---

## 4. Fase 3: Checkout, Cartões e Pagamentos (A Prioridade Criptográfica)
A premissa número 1 do pagamento online é: **A aplicação nunca deve persistir números de cartões em seu próprio banco de dados.**

* **Gateway de Escolha (Opções Mais Modernas e Seguras):**
    * **Stripe:** Excepcional pelo "Radar" antifraude alimentado por ML e API developer-friendly superior a qualquer provedor mundial. Excelente Checkout Customizado (Stripe Elements).
    * **Mercado Pago / PagSeguro / Pagar.me:** Gateways brasileiros que abraçam a complexidade do parcelamento local e do PIX com maestria.
* **Mecânica Transparente (Sem Redirecionamento):**
    A tela de inserção do cartão rodará *dentro da aplicação*, mas protegida através do iframe do Gateway (Tokensização).
* **Meios Habilitados:** Cartão de Crédito, Débito e PIX.

---

## 5. Fase 4: Integração Tripla Dinâmica (O Coração da Máquina)
No milissegundo em que o Gateway avisar via `Webhook` que o pagamento no Cartão Online foi ✅ **Aprovado**, o sistema executará simultaneamente as 3 pontas:

1. **Gatilho de Financeiro:** Criará no painel `FinanceFinal.jsx` a *Receita* atrelada às taxas do gateway e projetará as parcelas baseadas nas regras de antecipação.
2. **Baixa Real Time (Estoque):** Puxará a lista técnica daquele produto, fracionando logicamente e deduzindo instantaneamente do módulo `Inventory`, alertando se suprimentos (tintas, papéis) entrarem na zona de perigo.
3. **Delegação para o Kanban (`Orders.jsx` & `Production.jsx`):** O pedido nasce mágico. Ele é jogado do Front-end direto pra Coluna de 📝 **"Fila de Produção"**, e aí **a Automação de WhatsApp** é disparada (usando as melhorias do CRM criadas anteriormente), avisando o cliente via Zap: *"Olá [Cliente], seu pagamento acabou de ser aprovado e seu pedido mágico entrou na pista!"*.

---

## 6. Rotinas de Manutenção do Plano
* **Dica de Engenharia:** Na medida que ferramentas novas/melhores surjam ou a complexidade evolua, o engenheiro de IA ou Desenvolvedor deve revisitar este arquivo (`docs/Plano_Maquina_Vendas_Online.md`) para marcar passos como `"✔ COMPLETED"` e reajustar datas e tecnologias.
* **Segurança:** O modelo arquitetural garante que auditorias (AuditService já implementado no back) registrem a criação de notas das compras remotas garantindo o mesmo padrão *Single Source of Truth* que temos presencialmente.
