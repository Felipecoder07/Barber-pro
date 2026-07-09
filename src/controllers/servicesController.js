const prisma = require('../lib/prisma');

const getActiveServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { id: 'asc' } // Ordem de cadastro (ou outro campo no futuro)
    });
    res.json(services);
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};

module.exports = {
  getActiveServices
};
