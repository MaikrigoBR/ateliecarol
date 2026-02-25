# Validação Manual de Auditoria e Edição

Como o ambiente de teste automatizado apresentou problemas, siga este roteiro para validar as novas funcionalidades:

## 1. Inventário
1. Acesse a aba **Inventário**.
2. Clique em **Adicionar Item**.
3. Crie um novo item (ex: "Teste Material", Tipo: Material).
4. Verifique se o item aparece na lista.
5. Clique no ícone de **Lápis (Editar)** no item criado.
6. Altere o nome ou quantidade e salve.
7. Verifique se a alteração refletiu na lista.
8. (Opcional) Exclua o item e confirme.

## 2. Clientes
1. Acesse a aba **Clientes**.
2. Clique em **Novo Cliente**.
3. Cadastre um cliente fictício.
4. Na lista, clique no ícone de **Lápis (Editar)** ao lado do cliente.
5. Altere o nome ou e-mail e salve.
6. Verifique a atualização na lista.
7. Exclua o cliente e confirme.

## 3. Logs de Auditoria
1. Vá para **Configurações** (ícone de engrenagem).
2. Clique na aba **Histórico de Alterações** (ícone de atividade).
3. Verifique se as ações acima (Criação, Edição, Exclusão) estão listadas com:
   - **Usuário**: (Seu email ou "Sistema")
   - **Ação**: CREATE, UPDATE, DELETE
   - **Entidade**: Inventory, Customer
   - **Detalhes**: Descrição do que foi feito.

## Solução de Problemas
- Se os logs não aparecerem, verifique o console do navegador (F12) para erros de conexão com o banco de dados (IndexedDB/Firebase).
- Certifique-se de estar logado para que o campo "Usuário" seja preenchido corretamente.
