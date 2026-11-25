const { dbFuncionarios, dbPermisos, dbHorarios } = require('./config/database');

console.log("⏳ Iniciando limpieza profunda de base de datos...");

// 1. Limpiar tabla de Funcionarios
// Usamos TRIM() para quitar espacios accidentales y UPPER() para forzar mayúsculas
dbFuncionarios.run("UPDATE funcionarios SET rut = UPPER(TRIM(rut));", function(err) {
    if (err) {
        console.error("❌ Error en funcionarios:", err.message);
    } else {
        // 'this.changes' nos dirá exactamente cuántas filas se actualizaron
        console.log(`✅ Funcionarios revisados y actualizados: ${this.changes} registros.`);
    }
});

// 2. Limpiar tabla de Permisos
dbPermisos.run("UPDATE permisos SET rutFuncionario = UPPER(TRIM(rutFuncionario));", function(err) {
    if (err) {
        console.error("❌ Error en permisos:", err.message);
    } else {
        console.log(`✅ Permisos revisados y actualizados: ${this.changes} registros.`);
    }
});

// 3. Limpiar tabla de Horarios
dbHorarios.run("UPDATE horarios SET rut = UPPER(TRIM(rut));", function(err) {
    if (err) {
        console.error("❌ Error en horarios:", err.message);
    } else {
        console.log(`✅ Horarios revisados y actualizados: ${this.changes} registros.`);
    }
});