# Arquitetura do agente Nexo

## Responsabilidades

- **Backend Node/TypeScript:** autenticação, autorização, Soul, contexto, seleção de
  ferramentas, confirmações e auditoria.
- **PostgreSQL:** usuários, projetos, conversas e memórias estruturadas.
- **Langflow:** fluxos visuais especializados de recuperação.
- **Qdrant:** busca vetorial dos documentos Markdown do vault Obsidian.
- **OpenRouter:** modelo escolhido por conversa.

O Langflow não redige uma resposta intermediária. O fluxo ativo recebe a consulta,
gera o embedding, recupera trechos no Qdrant e retorna `text`, `source_path` e
`project_id` ao agente.

## Soul

A Soul global contém nome, papel, personalidade, contexto da Gobrax e instruções
permanentes. Ela é carregada em toda execução e pode ser editada por administradores
em `PATCH /admin/agent/soul`.

## Memória seletiva

O modelo só grava memória quando chama uma destas ferramentas:

- `remember_user_memory`: preferência, identidade, responsabilidade ou hábito
  durável útil entre projetos.
- `remember_project_memory`: decisão, meta, regra ou fato durável compartilhado
  no projeto atual.
- nenhuma ferramenta: saudações, pedidos passageiros, informações incertas,
  conteúdo bruto de e-mails e segredos.

Uma chave estável atualiza a memória anterior em vez de criar duplicatas. Usuários
podem auditar e arquivar suas memórias pessoais; membros veem as memórias do projeto;
proprietários e administradores podem arquivá-las.

## Ferramentas

`AgentToolRegistry` é o ponto único de extensão. Cada integração registra definição,
validação, execução e rótulo de auditoria. Ferramentas de leitura podem executar
diretamente; enviar, apagar, publicar ou alterar dados externos deve exigir
confirmação explícita.

As próximas integrações planejadas são ClickUp e GitLab via OAuth por usuário, com
tokens criptografados e escopos mínimos.
