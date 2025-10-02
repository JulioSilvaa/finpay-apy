# Contexto do Projeto CobrançaFácil

## Documentos de Referência

### 1. Arquitetura
- Ver: `docs/clean_arch_mvp_doc.md`
- Contém: Estrutura de camadas, entidades, use cases

### 2. Schema do Banco
- Ver: `docs/database_schema_transactional`
- Contém: Modelo completo com todas as tabelas

### 3. Plano de Execução MVP
- Ver: `docs/mvp_execution_plan`
- Contém: Cronograma de 30 dias, fases detalhadas

### 4. Modelo de Negócio
- Taxa: 1.5% sobre cada transação
- Asaas cobra: PIX grátis, Boleto R$3.49, Cartão 4.99%
- Autônomo recebe: valor - platformFee - asaasFee

### 5. Documentação técnica 
- Ver: `docs/complete_technical_doc.md`
- Contém: Informações técnicas do funcionamento. 

## Regras Críticas
1. SEMPRE filtrar queries por tenantId (multi-tenancy)
2. Cálculo de fees DEVE estar na entidade Invoice
3. Webhook DEVE processar em transaction
4. NUNCA usar localStorage no backend (é frontend)

## Próximos Passos
- [x] Setup inicial
- [ ] Implementar entidades Domain
- [ ] Criar repositórios Prisma
- [ ] Implementar use cases