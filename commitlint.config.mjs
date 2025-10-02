export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação
        'refactor', // Refatoração
        'test',     // Testes
        'chore',    // Tarefas de manutenção
        'perf',     // Performance
        'ci',       // CI/CD
        'build',    // Build
        'revert',   // Reverter commit
      ],
    ],
  },
}
