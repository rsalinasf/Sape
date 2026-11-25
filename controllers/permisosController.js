// /controllers/permisosController.js ..
const { dbFuncionarios, dbPermisos } = require("../config/database");
const logger = require("../middlewares/logger");

// --- CREAR PERMISO (CON JERARQUÍA DE VALIDACIONES) ---
const createPermiso = (req, res) => {
    const { id, funcionarioId, fechaSolicitud, fechaPermiso, tipo, jornada, observacion, confirmado } = req.body;
    
    if (!funcionarioId || !fechaPermiso || !tipo) {
        return res.status(400).json({ error: "Faltan datos obligatorios para el permiso." });
    }

    // Validación de fin de semana
    const fechaObj = new Date(fechaPermiso + 'T12:00:00Z'); 
    const diaSemana = fechaObj.getUTCDay(); 
    
    if (diaSemana === 0 || diaSemana === 6) {
        logger.warn(`Intento de asignar permiso en fin de semana: ${fechaPermiso}`);
        return res.json({ error: "No se pueden asignar permisos los días Sábado o Domingo." });
    }

    const anio = new Date(fechaPermiso).getFullYear();
    const mesDiaPermiso = fechaPermiso.substring(4); 

    // Recolectamos toda la información de la BD anidando las consultas
    dbFuncionarios.get(`SELECT COUNT(*) as totalCumples FROM funcionarios WHERE fechaNacimiento LIKE ?`, [`%${mesDiaPermiso}`], (err, rowCumple) => {
        if (err) return res.status(500).json({ error: "Error al consultar cumpleaños." });
        const totalCumples = rowCumple ? rowCumple.totalCumples : 0;
        
        dbPermisos.get(`SELECT COUNT(*) as totalDia FROM permisos WHERE fechaPermiso = ?`, [fechaPermiso], (err, rowDia) => {
            if (err) return res.status(500).json({ error: "Error al consultar cupos diarios." });
            const ausenciasDelDia = rowDia ? rowDia.totalDia : 0;

            dbPermisos.all(`SELECT tipo, fechaPermiso FROM permisos WHERE rutFuncionario = ?`, [funcionarioId], (err, rows) => {
                if (err) return res.status(500).json({ error: "Error al consultar historial." });
                
                // --- 1. VALIDACIONES DURAS (Se bloquean inmediatamente) ---
                
                // A. ¿Ya tiene un permiso para esta fecha?
                if (rows.find(p => p.fechaPermiso === fechaPermiso)) {
                    return res.json({ error: "Este funcionario ya tiene un permiso registrado para esta fecha exacta." });
                }

                // B. ¿Se pasó de los 6 días anuales?
                const usadosAnio = rows.filter(p => new Date(p.fechaPermiso).getFullYear() === anio).reduce((a, p) => a + Number(p.tipo), 0);
                if (usadosAnio + Number(tipo) > 6) {
                    logger.warn(`Permiso denegado a ${funcionarioId}: Límite anual excedido.`);
                    return res.json({ error: `LÍMITE EXCEDIDO: Al funcionario solo le quedan ${6 - usadosAnio} días este año.` });
                }

                // --- 2. VALIDACIONES SUAVES (Generan Advertencia / Override) ---
                
                const totalAusencias = totalCumples + ausenciasDelDia;
                if (totalAusencias >= 3 && !confirmado) {
                    logger.info(`Advertencia de cupo enviada para permiso de ${funcionarioId} el ${fechaPermiso}.`);
                    return res.json({ 
                        warning: true, 
                        mensaje: `Ya hay ${totalAusencias} personas ausentes este día (incluyendo cumpleaños).\n\n¿Estás seguro de que deseas añadir uno más?` 
                    });
                }

                // --- 3. INSERCIÓN EN BD (Si superó todas las barreras) ---
                
                dbPermisos.run(`INSERT INTO permisos VALUES(?,?,?,?,?,?,?)`, 
                    [id, funcionarioId, fechaSolicitud, fechaPermiso, tipo, jornada, observacion], 
                    (err) => {
                        if (err) return res.status(500).json({ error: "Error al guardar el permiso." });
                        logger.info(`Permiso registrado para ${funcionarioId} el ${fechaPermiso} por ${req.user.usuario} (Excepción de cupo: ${confirmado ? 'SÍ' : 'NO'})`);
                        res.json({ ok: true });
                    }
                );
            });
        });
    });
};

// --- OBTENER TODOS LOS PERMISOS ---
const getPermisos = (req, res) => {
    dbPermisos.all("SELECT * FROM permisos", (err, rows) => {
        if(err) {
            logger.error(`Error al obtener permisos: ${err.message}`);
            return res.status(500).json([]);
        }
        res.json(rows.map(r => ({...r, funcionarioId: r.rutFuncionario})));
    });
};

// --- ELIMINAR PERMISO ---
const deletePermiso = (req, res) => {
    dbPermisos.run("DELETE FROM permisos WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar." });
        logger.info(`Permiso ${req.params.id} eliminado por ${req.user.usuario}`);
        res.json({ ok: true });
    });
};

module.exports = { createPermiso, getPermisos, deletePermiso };