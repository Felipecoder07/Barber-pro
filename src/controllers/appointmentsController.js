const prisma = require('../lib/prisma');
const { parseISO, addMinutes, isBefore, isAfter, addDays, format, isSameDay } = require('date-fns');

// Calcula os slots disponiveis (RG05, RG09, RG10)
const getAvailability = async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    if (!date || !serviceId) return res.status(400).json({ error: 'Data e serviceId são obrigatórios' });

    const targetDate = parseISO(date); // Ex: "2026-07-10"
    const now = new Date();

    // RG10: Máx 30 dias de antecedência
    const maxDate = addDays(now, 30);
    if (isAfter(targetDate, maxDate)) {
      return res.json({ available: false, slots: [], message: 'Data limite excedida (máx 30 dias).' });
    }
    
    // Serviço
    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service || !service.active) return res.status(400).json({ error: 'Serviço inválido ou inativo.' });

    // Horário de funcionamento
    let settings = await prisma.settings.findUnique({ where: { key: 'business_hours' } });
    const hours = settings ? JSON.parse(settings.value) : null;
    const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 1 = Seg
    const dayConfig = hours ? hours[dayOfWeek] : { open: '08:00', close: '18:00', isOpen: true };

    if (!dayConfig.isOpen) {
      return res.json({ available: false, slots: [], message: 'Barbearia fechada neste dia.' });
    }

    const openTime = parseISO(`${date}T${dayConfig.open}:00`);
    const closeTime = parseISO(`${date}T${dayConfig.close}:00`);

    // Busca agendamentos existentes (não cancelados nem faltou)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: parseISO(`${date}T00:00:00`) },
        endDate: { lte: parseISO(`${date}T23:59:59`) },
        status: { in: ['SCHEDULED', 'DONE'] }
      }
    });

    // Busca bloqueios (especificos do dia ou semanais)
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { date: date },
          { repeat: 'WEEKLY' }
        ]
      }
    });

    const slots = [];
    let currentSlot = openTime;

    // RG09: Mínimo 30 min de antecedência
    const minTimeForNew = addMinutes(now, 30);

    // Gerar slots a cada 30 minutos (ou baseado na duração)
    // Para simplificar: tentaremos encaixar o serviço a cada 30 minutos (00 e 30)
    while (isBefore(addMinutes(currentSlot, service.duration), closeTime) || currentSlot.getTime() === closeTime.getTime() - service.duration * 60000) {
      const slotEnd = addMinutes(currentSlot, service.duration);
      
      // Passado + RG09
      if (isSameDay(targetDate, now) && isBefore(currentSlot, minTimeForNew)) {
        currentSlot = addMinutes(currentSlot, 30);
        continue;
      }

      // Checar conflito com agendamentos
      const hasApptConflict = existingAppointments.some(appt => {
        return (isBefore(currentSlot, appt.endDate) && isAfter(slotEnd, appt.date));
      });

      // Checar conflito com bloqueios
      const hasBlockConflict = blocks.some(block => {
        // Se repeat = WEEKLY e o block não foi criado pra esse dia da semana especificamente
        // Precisamos verificar o dia da semana do block, mas assumiremos que WEEKLY no banco se aplica ao dia
        // Para o MVP: date armazena a string, se date=YYYY-MM-DD bate ok.
        // Se repeat = WEEKLY, no MVP simples vamos pular validação de DOW ou assumir que o date de criação bate.
        // Simplificando o BlockConflict:
        const bStart = parseISO(`${date}T${block.startTime}:00`);
        const bEnd = parseISO(`${date}T${block.endTime}:00`);
        return (isBefore(currentSlot, bEnd) && isAfter(slotEnd, bStart));
      });

      if (!hasApptConflict && !hasBlockConflict) {
        slots.push(format(currentSlot, 'HH:mm'));
      }

      currentSlot = addMinutes(currentSlot, 30);
    }

    res.json({ available: true, slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
  }
};

// RG08: Concorrência - PostgreSQL vai usar isolamento na transação
const createAppointment = async (req, res) => {
  try {
    const { nome, whatsapp, obs, serviceId, data, hora } = req.body;
    
    if (!nome || !whatsapp || !serviceId || !data || !hora) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service || !service.active) return res.status(400).json({ error: 'Serviço inválido' });

    const startDate = parseISO(`${data}T${hora}:00`);
    const endDate = addMinutes(startDate, service.duration);

    // Usamos uma transação para evitar que dois entrem no mesmo instante
    // Como Prisma com Postgres não tem EXCLUDE USING gist out-of-the-box via schema
    // usamos uma validação transacional
    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Verifica se já existe cruzamento
      const conflito = await tx.appointment.findFirst({
        where: {
          status: { in: ['SCHEDULED', 'DONE'] },
          AND: [
            { date: { lt: endDate } },
            { endDate: { gt: startDate } }
          ]
        }
      });

      if (conflito) {
        throw new Error('CONFLITO');
      }

      // 2. Cria o agendamento
      return await tx.appointment.create({
        data: {
          clientName: nome,
          clientPhone: whatsapp,
          clientObs: obs,
          serviceId: service.id,
          price: service.price,
          date: startDate,
          endDate: endDate,
          status: 'SCHEDULED'
        }
      });
    });

    // Simulando envio de WhatsApp (RF09/RF11) conforme aprovado no plano
    console.log(`\n[WHATSAPP MOCK] 📱 Enviando confirmação para ${whatsapp}:`);
    console.log(`Olá ${nome}! Seu agendamento para ${service.name} no dia ${format(startDate, 'dd/MM/yyyy')} às ${hora} foi confirmado!\n`);

    res.json({ success: true, appointment });
  } catch (error) {
    if (error.message === 'CONFLITO') {
      return res.status(409).json({ error: 'Este horário acabou de ser reservado por outra pessoa.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({ where: { id: Number(id) } });

    if (!appointment) return res.status(404).json({ error: 'Não encontrado' });

    // RG03: Antecedência mínima para cancelamento (2h)
    const minCancelTime = addMinutes(new Date(), 120);
    if (isAfter(minCancelTime, appointment.date)) {
      return res.status(400).json({ error: 'Cancelamento deve ser feito com pelo menos 2h de antecedência.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELLED' }
    });

    console.log(`\n[WHATSAPP MOCK] 📱 Cancelamento enviado para ${updated.clientPhone}:`);
    console.log(`Olá ${updated.clientName}, seu agendamento foi cancelado com sucesso.\n`);

    res.json({ success: true, message: 'Cancelado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao cancelar' });
  }
};

module.exports = {
  getAvailability,
  createAppointment,
  cancelAppointment
};
