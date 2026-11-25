// /routes/funcionariosRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

// Importamos los middlewares de seguridad ..
const { verificarToken, verificarEdicion, verificarSuperAdmin } = require("../middlewares/auth");

// Importamos el controlador
const { 
    getFuncionarios, 
    createFuncionario, 
    updateFuncionario, 
    deleteFuncionario, 
    updateHorario, 
    importExcel 
} = require("../controllers/funcionariosController");

// Configuración de Multer para archivos temporales
const upload = multer({ dest: "uploads/" });

// --- DEFINICIÓN DE ENDPOINTS ---

// Cualquiera con sesión iniciada puede ver la lista
router.get("/", verificarToken, getFuncionarios);

// Solo admin y editor pueden crear/editar/eliminar
router.post("/", verificarToken, verificarEdicion, createFuncionario);
router.put("/:rut", verificarToken, verificarEdicion, updateFuncionario);
router.delete("/:rut", verificarToken, verificarEdicion, deleteFuncionario);

// Solo admin y editor pueden cambiar horarios
router.put("/horarios/:rut", verificarToken, verificarEdicion, updateHorario);

// Solo SuperAdmin puede subir archivos Excel
router.post("/importar", verificarToken, verificarSuperAdmin, upload.single("archivoExcel"), importExcel);

module.exports = router;