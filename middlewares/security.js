// /middlewares/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Configuramos Helmet para permitir acceso por red local (HTTP)
const helmetConfig = helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: null // <-- ESTA LÍNEA EVITA QUE FUERCE HTTPS
        }
    },
    crossOriginOpenerPolicy: false, // <-- Evita la advertencia de origen no confiable en HTTP
    originAgentCluster: false,      // <-- Limpia otra advertencia de la consola
    hsts: false                     // <-- Desactiva Strict-Transport-Security en red local
});

// Bloquea intentos masivos de inicio de sesión
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos por IP
    message: { error: "Demasiados intentos desde esta IP. Espere 15 minutos." }
});

// Límite general para toda la API
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 300, // Máximo 300 peticiones por minuto por IP
    message: { error: "Sistema ocupado. Intente en un momento." }
});

module.exports = { helmetConfig, loginLimiter, generalLimiter };