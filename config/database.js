// /config/database.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");

// 1. Definimos la ruta de la nueva carpeta (ej: 'data' en la raíz del proyecto)
const dbFolder = path.join(__dirname, '..', 'data');

// 2. Si la carpeta 'data' no existe, la creamos automáticamente
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
    console.log("📁 Carpeta 'data' creada para alojar las bases de datos.");
}

// 3. Actualizamos la función para que guarde los archivos DENTRO de esa carpeta
const dbPath = (file) => path.join(dbFolder, file);

const dbFuncionarios = new sqlite3.Database(dbPath("funcionarios.db"));
const dbPermisos = new sqlite3.Database(dbPath("permisos.db"));
const dbHorarios = new sqlite3.Database(dbPath("horarios.db"));
const dbUsuarios = new sqlite3.Database(dbPath("usuarios.db"));


// --- ACTIVACIÓN DEL MODO WAL (Mejora de Rendimiento Concurrente) ---
dbFuncionarios.run("PRAGMA journal_mode = WAL;");
dbPermisos.run("PRAGMA journal_mode = WAL;");
dbHorarios.run("PRAGMA journal_mode = WAL;");
dbUsuarios.run("PRAGMA journal_mode = WAL;");


// --- INICIALIZACIÓN DE TABLAS ---
dbFuncionarios.serialize(() => {
    dbFuncionarios.run(`CREATE TABLE IF NOT EXISTS funcionarios(
        rut TEXT PRIMARY KEY, nombre TEXT, cargo TEXT, fechaNacimiento TEXT, horasContratadas REAL,
        lactancia INTEGER, periodo TEXT, estadoCivil TEXT, direccion TEXT, comuna TEXT, telefono TEXT,
        correo TEXT, emergenciaNombre TEXT, emergenciaParentesco TEXT, emergenciaTelefono TEXT
    )`);
});

dbPermisos.serialize(() => {
    dbPermisos.run(`CREATE TABLE IF NOT EXISTS permisos(
        id TEXT PRIMARY KEY, rutFuncionario TEXT, fechaSolicitud TEXT, fechaPermiso TEXT, tipo REAL, jornada TEXT, observacion TEXT
    )`);
});

dbHorarios.serialize(() => {
    dbHorarios.run(`CREATE TABLE IF NOT EXISTS horarios(rut TEXT PRIMARY KEY, horario TEXT)`);
});

dbUsuarios.serialize(() => {
    dbUsuarios.run(`CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE, password TEXT, rol TEXT
    )`);

    // Autocrear el primer SuperAdmin si la tabla está vacía
    dbUsuarios.get("SELECT COUNT(*) as count FROM usuarios", async (err, row) => {
        if (row && row.count === 0) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash("admin123", salt); // Clave por defecto
            dbUsuarios.run("INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)", ["admin", hash, "admin"]);
            console.log("🔑 ¡Usuario SuperAdmin creado automáticamente! -> User: admin | Pass: admin123");
        }
    });
});

module.exports = {
    dbFuncionarios,
    dbPermisos,
    dbHorarios,
    dbUsuarios
};