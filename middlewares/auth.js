// /middlewares/auth.js
const jwt = require("jsonwebtoken");
const logger = require("./logger");

const verificarToken = (req, res, next) => {
    // Buscamos el token en las cookies seguras .. 
    const token = req.cookies.auth_token;

    if (!token) {
        logger.warn(`Intento de acceso sin credenciales desde IP: ${req.ip} a la ruta ${req.originalUrl}`);
        return res.status(403).json({ error: "Acceso denegado. Se requiere iniciar sesión." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.error(`Token inválido o expirado desde IP: ${req.ip}`);
            // Borramos la cookie corrupta o expirada
            res.clearCookie('auth_token');
            return res.status(401).json({ error: "Sesión inválida o expirada." });
        }
        req.user = user; 
        next(); 
    });
};

const verificarEdicion = (req, res, next) => {
    if (req.user && (req.user.rol === 'admin' || req.user.rol === 'editor')) {
        next();
    } else {
        logger.warn(`Usuario ${req.user.usuario} intentó acción de edición sin permisos.`);
        res.status(403).json({ error: "Privilegios insuficientes para editar." });
    }
};

const verificarSuperAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        next();
    } else {
        logger.warn(`Usuario ${req.user.usuario} intentó acción de Super Admin.`);
        res.status(403).json({ error: "Acceso denegado. Requiere privilegios de Super Administrador." });
    }
};

module.exports = { verificarToken, verificarEdicion, verificarSuperAdmin };