// server.js (MODULARIZADO)
require('dotenv').config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const { helmetConfig, generalLimiter } = require("./middlewares/security");
const logger = require("./middlewares/logger");

// Importamos las rutas de las carpetas correspondientes..
const authRoutes = require("./routes/authRoutes");
const funcionariosRoutes = require("./routes/funcionariosRoutes");
const permisosRoutes = require("./routes/permisosRoutes");
const portalRoutes = require("./routes/portalRoutes");

const app = express();

// Middlewares Globales
app.use(helmetConfig);
app.use(generalLimiter);
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public", { index: false }));

// --- CONEXIÓN DE RUTAS ---
app.use("/api/auth", authRoutes);
app.use("/api/funcionarios", funcionariosRoutes); // Aquí vive la ruta de horarios
app.use("/api/permisos", permisosRoutes);
app.use("/api", portalRoutes);

// Vistas
app.get("/", (req, res) => res.redirect("/login"));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/administracion", (req, res) => res.sendFile(path.join(__dirname, "public", "administracion.html")));
app.get("/permisos", (req, res) => res.sendFile(path.join(__dirname, "public", "permisos.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Servidor iniciado en el puerto ${PORT}`);
    console.log(`🚀 Sistema listo en http://localhost:${PORT}`);
});