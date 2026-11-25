// /routes/portalRoutes.js ..
const express = require("express");
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { solicitarInforme } = require("../controllers/portalController");

// Límite anti-spam de correos: 5 peticiones cada 10 minutos
const emailLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos en milisegundos
    max: 5, // Máximo 5 intentos por IP
    message: { error: "Has superado el límite de intentos permitidos. Por favor, vuelve a intentarlo en 10 minutos." }
});

router.post("/solicitar-informe", emailLimiter, solicitarInforme);

module.exports = router;