# Instruções para rodar o Backend

A lógica do backend foi completamente implementada utilizando **Node.js, Express e PostgreSQL (via Prisma)**.

## Passo a passo para rodar o projeto

1. **Configurar o Banco de Dados PostgreSQL:**
   Abra o arquivo `.env` na raiz do projeto e ajuste a variável `DATABASE_URL` para a string de conexão do seu PostgreSQL local (ou serviço em nuvem, como Render ou Supabase).
   ```env
   DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/barberpro?schema=public"
   ```

2. **Gerar as tabelas no Banco de Dados:**
   Após configurar o `.env`, abra o terminal na pasta do projeto e rode o comando:
   ```bash
   npx prisma db push
   ```
   *Este comando lerá o arquivo `prisma/schema.prisma` e criará todas as tabelas (Serviços, Agendamentos, Bloqueios, Configurações e Admin).*

3. **Iniciar o Servidor API:**
   Com o banco criado, inicie o backend usando:
   ```bash
   npx nodemon src/index.js
   ```
   *O servidor iniciará na porta 3000 (ou na porta definida no .env). O Express também está configurado para servir a pasta raiz como estática, então você poderá acessar o front-end pela mesma porta.*

4. **Testar o Sistema:**
   - Acesse `http://localhost:3000/index.html`
   - Para acessar o painel de administrador, vá em `http://localhost:3000/admin/login.html` (Login: `admin` / Senha: `1234`)
   - O primeiro passo no admin é **cadastrar serviços** para que eles apareçam na página do cliente.

## Regras de Negócio Implementadas
- **RG08:** Uma transação do Prisma foi implementada em `createAppointment` para bloquear dois usuários tentando agendar o mesmo horário simultaneamente.
- **RG03, RG09 e RG10:** Validações de data no backend com a biblioteca `date-fns` impedem agendamentos sem antecedência de 30min, bloqueiam para mais de 30 dias e validam a janela de cancelamento.
- **Segurança:** Rotas do `/api/admin` protegidas com JWT gerado no login.
- **Mock de WhatsApp:** Os disparos de mensagens foram colocados como logs no console (`console.log`) em `appointmentsController.js`, prontos para receber o fetch real de uma API de WhatsApp depois.
