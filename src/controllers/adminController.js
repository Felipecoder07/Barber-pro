const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { usuario, senha } = req.body;
  // Para fins do MVP e facilidade, vamos aceitar admin / 1234
  // ou buscar no banco se houver
  
  let valid = false;
  if (usuario === 'admin' && senha === '1234') {
    valid = true;
  } else {
    // Tentar no banco
    const admin = await prisma.admin.findUnique({ where: { email: usuario } });
    if (admin) {
      const match = await bcrypt.compare(senha, admin.password);
      if (match) valid = true;
    }
  }

  if (valid) {
    const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, message: 'Login bem-sucedido' });
  }

  return res.status(401).json({ error: 'Usuário ou senha inválidos' });
};

// --- Serviços ---
const getServices = async (req, res) => {
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } });
  res.json(services);
};

const createService = async (req, res) => {
  const { name, price, duration, description, icon } = req.body;
  const service = await prisma.service.create({
    data: { name, price, duration, description, icon }
  });
  res.json(service);
};

const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, price, duration, description, icon, active } = req.body;
  const service = await prisma.service.update({
    where: { id: Number(id) },
    data: { name, price, duration, description, icon, active }
  });
  res.json(service);
};

const deleteService = async (req, res) => {
  const { id } = req.params;
  await prisma.service.delete({ where: { id: Number(id) } });
  res.json({ message: 'Serviço deletado' });
};

// --- Agendamentos ---
const getAppointments = async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    include: { service: true },
    orderBy: { date: 'asc' }
  });
  res.json(appointments);
};

const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // DONE, NOSHOW
  const appointment = await prisma.appointment.update({
    where: { id: Number(id) },
    data: { status }
  });
  res.json(appointment);
};

// --- Bloqueios ---
const getBlocks = async (req, res) => {
  const blocks = await prisma.block.findMany({ orderBy: { id: 'desc' } });
  res.json(blocks);
};

const createBlock = async (req, res) => {
  const { reason, date, startTime, endTime, repeat, icon, notes } = req.body;
  const block = await prisma.block.create({
    data: { reason, date, startTime, endTime, repeat, icon, notes }
  });
  res.json(block);
};

const deleteBlock = async (req, res) => {
  const { id } = req.params;
  await prisma.block.delete({ where: { id: Number(id) } });
  res.json({ message: 'Bloqueio deletado' });
};

// --- Horários ---
const getHours = async (req, res) => {
  let settings = await prisma.settings.findUnique({ where: { key: 'business_hours' } });
  if (!settings) {
    // Padrão inicial
    const defaultHours = {
      1: { open: '08:00', close: '18:00', isOpen: true },
      2: { open: '08:00', close: '18:00', isOpen: true },
      3: { open: '08:00', close: '18:00', isOpen: true },
      4: { open: '08:00', close: '18:00', isOpen: true },
      5: { open: '08:00', close: '18:00', isOpen: true },
      6: { open: '08:00', close: '13:00', isOpen: true },
      0: { open: '08:00', close: '18:00', isOpen: false } // Domingo
    };
    settings = await prisma.settings.create({
      data: { key: 'business_hours', value: JSON.stringify(defaultHours) }
    });
  }
  res.json(JSON.parse(settings.value));
};

const updateHours = async (req, res) => {
  const hours = req.body;
  await prisma.settings.upsert({
    where: { key: 'business_hours' },
    update: { value: JSON.stringify(hours) },
    create: { key: 'business_hours', value: JSON.stringify(hours) }
  });
  res.json({ message: 'Horários atualizados' });
};

module.exports = {
  login,
  getServices, createService, updateService, deleteService,
  getAppointments, updateAppointmentStatus,
  getBlocks, createBlock, deleteBlock,
  getHours, updateHours
};
