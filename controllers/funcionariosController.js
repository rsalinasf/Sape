// /controllers/funcionariosController.js ..
const fs = require("fs");
const xlsx = require("xlsx");
const { dbFuncionarios, dbHorarios } = require("../config/database");
const logger = require("../middlewares/logger");

// --- OBTENER TODOS LOS FUNCIONARIOS ---
const getFuncionarios = (req, res) => {
    dbFuncionarios.all("SELECT * FROM funcionarios", (err, funcs) => {
        if (err) {
            logger.error(`Error al obtener funcionarios: ${err.message}`);
            return res.status(500).json({ error: "Error de base de datos" });
        }
        
        dbHorarios.all("SELECT * FROM horarios", (err, hors) => {
            const mapHorarios = {};
            if (hors) hors.forEach(h => mapHorarios[h.rut] = h.horario);
            
            const resultado = (funcs || []).map(f => ({ 
                ...f, 
                id: f.rut, 
                horario: mapHorarios[f.rut] || JSON.stringify({}) 
            }));
            
            res.json(resultado);
        });
    });
};

// --- CREAR O ACTUALIZAR (UPSERT) MANUAL ---
const createFuncionario = (req, res) => {
    const { rut, nombre, cargo, fechaNacimiento, horasContratadas, lactancia, periodo, estadoCivil, direccion, comuna, telefono, correo, emergenciaNombre, emergenciaParentesco, emergenciaTelefono } = req.body;
    
    // 1. Creamos una constante con el RUT limpio y en mayúsculas
    const rutNormalizado = rut.trim().toUpperCase();
    
    // 2. Usamos "rutNormalizado" en el array de valores de la BD
    dbFuncionarios.run(`INSERT OR REPLACE INTO funcionarios VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 
        [rutNormalizado, nombre, cargo, fechaNacimiento, horasContratadas, lactancia, periodo, estadoCivil || "", direccion || "", comuna || "", telefono || "", correo || "", emergenciaNombre || "", emergenciaParentesco || "", emergenciaTelefono || ""], 
        (err) => { 
            if(err) {
                // 3. Actualizamos los logs para que muestren la K mayúscula
                logger.error(`Error al crear funcionario ${rutNormalizado}: ${err.message}`);
                return res.status(500).json({ error: "No se pudo registrar el funcionario." }); 
            }
            logger.info(`Funcionario creado/actualizado manualmente: ${rutNormalizado} por el usuario ${req.user.usuario}`);
            res.json({ ok: true }); 
        }
    );
};

// --- ACTUALIZAR (EDITAR DESDE MODAL) ---
const updateFuncionario = (req, res) => {
    const rut = req.params.rut;
    const { nombre, cargo, fechaNacimiento, horasContratadas, lactancia, periodo, estadoCivil, direccion, comuna, telefono, correo, emergenciaNombre, emergenciaParentesco, emergenciaTelefono } = req.body;
    
    // Normalizamos el parámetro de la URL
    const rutNormalizado = rut.trim().toUpperCase();

    const query = `UPDATE funcionarios SET nombre=?, cargo=?, fechaNacimiento=?, horasContratadas=?, lactancia=?, periodo=?, estadoCivil=?, direccion=?, comuna=?, telefono=?, correo=?, emergenciaNombre=?, emergenciaParentesco=?, emergenciaTelefono=? WHERE rut=?`;
    
    // Pasamos rutNormalizado al final del arreglo
    dbFuncionarios.run(query, [nombre, cargo, fechaNacimiento, horasContratadas, lactancia, periodo, estadoCivil || "", direccion || "", comuna || "", telefono || "", correo || "", emergenciaNombre || "", emergenciaParentesco || "", emergenciaTelefono || "", rutNormalizado], 
        (err) => { 
            if(err) {
                logger.error(`Error al actualizar funcionario ${rutNormalizado}: ${err.message}`);
                return res.status(500).json({ error: "Error al actualizar los datos." }); 
            }
            logger.info(`Funcionario editado: ${rutNormalizado} por el usuario ${req.user.usuario}`);
            res.json({ ok: true }); 
        }
    );
};

// --- ELIMINAR FUNCIONARIO ---
const deleteFuncionario = (req, res) => {
    const rut = req.params.rut;
    dbFuncionarios.run("DELETE FROM funcionarios WHERE rut=?", [rut], (err) => {
        if(err) return res.status(500).json({ error: "Error al eliminar." });
        logger.info(`Funcionario eliminado: ${rut} por el usuario ${req.user.usuario}`);
        res.json({ ok: true });
    });
};

// --- ACTUALIZAR HORARIOS ---
const updateHorario = (req, res) => {
    const rut = req.params.rut;
    const horarioJSON = JSON.stringify(req.body.horario);
    
    dbHorarios.run(`INSERT OR REPLACE INTO horarios (rut, horario) VALUES (?, ?)`, [rut, horarioJSON], (err) => {
        if(err) {
            logger.error(`Error al actualizar horario de ${rut}: ${err.message}`);
            return res.status(500).json({ error: "Error al guardar horario." }); 
        }
        logger.info(`Horario actualizado para ${rut} por ${req.user.usuario}`);
        res.json({ ok: true });
    });
};

// --- HELPER PARA EXCEL: NORMALIZAR FECHAS ---
function normalizarFecha(fechaVal) {
    if (!fechaVal) return null; 
    if (typeof fechaVal === 'number' || !isNaN(Number(fechaVal))) {
        const diasExcel = Number(fechaVal);
        const fechaUnix = new Date(Math.round((diasExcel - 25569) * 86400 * 1000));
        fechaUnix.setMinutes(fechaUnix.getMinutes() + fechaUnix.getTimezoneOffset());
        return fechaUnix.toISOString().split('T')[0];
    }
    let fechaStr = String(fechaVal).trim();
    const partes = fechaStr.split(/[-/]/); 
    if (partes.length === 3) {
        let dia = partes[0].padStart(2, '0'); let mes = partes[1].padStart(2, '0'); let anio = parseInt(partes[2], 10);
        if (partes[2].length === 2) anio = anio > 26 ? 1900 + anio : 2000 + anio;
        return `${anio}-${mes}-${dia}`;
    }
    return null; 
}

// --- IMPORTACIÓN EXCEL MASIVA ---
const importExcel = (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo." });
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: true });
        const stmt = dbFuncionarios.prepare(`INSERT OR REPLACE INTO funcionarios VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        let importados = 0;

        dbFuncionarios.serialize(() => {
            dbFuncionarios.run("BEGIN TRANSACTION");
            data.forEach(row => {
                const nombre = row.nombre || row.Nombre || row.NOMBRE;
                const rutOriginal = row.rut || row.Rut || row.RUT; // Capturamos tal como viene
                // Si existe el rut en el excel, lo volvemos string, quitamos espacios y a mayúsculas
                const rut = rutOriginal ? String(rutOriginal).trim().toUpperCase() : null;
                const cargo = row.cargo || row.Cargo || row.CARGO || "No especificado";
                const fechaBruta = row.fechaNacimiento || row.FechaNacimiento || row['Fecha de nacimientos'] || row.fecha_nacimiento;
                const fechaNacimiento = normalizarFecha(fechaBruta);
                const horas = row.horasContratadas || 44;
                const lactancia = row.lactancia === "SI" || row.lactancia === 1 ? 1 : 0;
                const periodo = row.periodo || "2025";
                const estadoCivil = row.estadoCivil || row['Estado civil'] || row.EstadoCivil || "";
                const direccion = row.direccion || row.Direccion || row.DIRECCION || "";
                const comuna = row.comuna || row.Comuna || row.COMUNA || "";
                const telefono = row.telefono || row['numero de telefono personal'] || row.Telefono || "";
                const correo = row.correo || row['Correo personal'] || row.Correo || "";
                const emergenciaNombre = row.emergenciaNombre || row['Nombre contacto de emergencia'] || row['Nombre Emergencia'] || "";
                const emergenciaParentesco = row.emergenciaParentesco || row.Parentesco || row.PARENTESCO || "";
                const emergenciaTelefono = row.emergenciaTelefono || row['Numero de contacto de emergencia'] || row['Telefono Emergencia'] || "";

                if (nombre && rut) {
                    stmt.run([rut, nombre, cargo, fechaNacimiento, horas, lactancia, periodo, estadoCivil, direccion, comuna, telefono, correo, emergenciaNombre, emergenciaParentesco, emergenciaTelefono]);
                    importados++;
                }
            });
            
            dbFuncionarios.run("COMMIT", () => {
                stmt.finalize(); 
                fs.unlinkSync(req.file.path); // Borramos el Excel temporal
                logger.info(`Importación masiva completada por ${req.user.usuario}. Registros: ${importados}`);
                res.json({ ok: true, mensaje: `Se importaron/actualizaron ${importados} funcionarios con éxito.` });
            });
        });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path); 
        logger.error(`Error al procesar Excel: ${error.message}`);
        res.status(500).json({ error: "Error al procesar el archivo Excel." });
    }
};

module.exports = {
    getFuncionarios,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario,
    updateHorario,
    importExcel
};