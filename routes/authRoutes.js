// /routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { login, logout, getUsuarios, createUsuario, deleteUsuario } = require("../controllers/authController");
const { loginLimiter } = require("../middlewares/security");
const { verificarToken, verificarSuperAdmin } = require("../middlewares/auth");

// Aplicamos el protector de fuerza bruta solo a la ruta de login
router.post("/login", loginLimiter, login);

// Ruta para cerrar sesión
router.post("/logout", logout);

// --- RUTAS DE GESTIÓN DE USUARIOS ---
// Solo el rol 'admin' (SuperAdmin) puede acceder a estas rutas
router.get("/usuarios", verificarToken, verificarSuperAdmin, getUsuarios);
router.post("/usuarios", verificarToken, verificarSuperAdmin, createUsuario);
router.delete("/usuarios/:id", verificarToken, verificarSuperAdmin, deleteUsuario);

module.exports = router;