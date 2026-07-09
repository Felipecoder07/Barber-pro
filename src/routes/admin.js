const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Auth
router.post('/login', adminController.login);

// Rotas protegidas
router.use(authMiddleware);

// Serviços
router.get('/services', adminController.getServices);
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// Agendamentos
router.get('/appointments', adminController.getAppointments);
router.put('/appointments/:id/status', adminController.updateAppointmentStatus);

// Bloqueios
router.get('/blocks', adminController.getBlocks);
router.post('/blocks', adminController.createBlock);
router.delete('/blocks/:id', adminController.deleteBlock);

// Configurações (Horários)
router.get('/settings/hours', adminController.getHours);
router.put('/settings/hours', adminController.updateHours);

module.exports = router;
