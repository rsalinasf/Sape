// /routes/permisosRoutes.js ..
const express = require("express");
const router = express.Router();
const { verificarToken, verificarEdicion } = require("../middlewares/auth");
const { createPermiso, getPermisos, deletePermiso } = require("../controllers/permisosController");

router.get("/", verificarToken, getPermisos);
router.post("/", verificarToken, verificarEdicion, createPermiso);
router.delete("/:id", verificarToken, verificarEdicion, deletePermiso);

module.exports = router;