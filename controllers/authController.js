// /controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { dbUsuarios } = require("../config/database");
const logger = require("../middlewares/logger");

const login = (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ error: "Faltan datos de ingreso." });
    }

    dbUsuarios.get("SELECT * FROM usuarios WHERE usuario = ?", [usuario], async (err, user) => {
        if (err) {
            logger.error(`Error de BD en login: ${err.message}`);
            return res.status(500).json({ error: "Error interno del servidor." });
        }
        
        if (!user) {
            logger.warn(`Intento de login fallido (usuario no existe): ${usuario}`);
            return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            logger.warn(`Intento de login fallido (clave incorrecta): ${usuario}`);
            return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        }

        // Generamos el Token
        const token = jwt.sign(
            { id: user.id, rol: user.rol, usuario: user.usuario }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        // Guardamos el token en una cookie segura ..
        res.cookie('auth_token', token, {
            httpOnly: true, // Evita ataques XSS (JavaScript no puede leerla)
            secure: false,  // PONER EN TRUE SI USAS HTTPS EN EL COLEGIO
            sameSite: 'Lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas en milisegundos
        });

        logger.info(`Usuario ${usuario} inició sesión correctamente.`);
        res.json({ ok: true, mensaje: "Inicio de sesión exitoso", rol: user.rol });
    });
};

const logout = (req, res) => {
    // Para cerrar sesión, simplemente destruimos la cookie
    res.clearCookie('auth_token');
    res.json({ ok: true, mensaje: "Sesión cerrada correctamente." });
};

// --- FUNCIONES DE GESTIÓN DE USUARIOS ---

const getUsuarios = (req, res) => {
    // Seleccionamos todo excepto la contraseña por seguridad
    dbUsuarios.all("SELECT id, usuario, rol FROM usuarios", (err, rows) => {
        if (err) {
            logger.error(`Error al obtener usuarios: ${err.message}`);
            return res.status(500).json({ error: "Error de base de datos al obtener usuarios." });
        }
        res.json(rows);
    });
};

const createUsuario = async (req, res) => {
    const { usuario, password, rol } = req.body;

    if (!usuario || !password || !rol) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    try {
        // Encriptar la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        dbUsuarios.run("INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)", 
            [usuario, hash, rol], 
            function(err) {
                if (err) {
                    // Si el usuario ya existe en la BD (por la restricción UNIQUE)
                    if (err.message.includes("UNIQUE")) {
                        return res.status(400).json({ error: "El nombre de usuario ya está en uso." });
                    }
                    logger.error(`Error de BD al crear usuario: ${err.message}`);
                    return res.status(500).json({ error: "Error al registrar el usuario." });
                }
                logger.info(`Usuario nuevo creado: ${usuario} (Rol: ${rol}) por ${req.user.usuario}`);
                res.json({ ok: true, mensaje: "Usuario creado exitosamente.", id: this.lastID });
            }
        );
    } catch (error) {
        logger.error(`Error encriptando contraseña: ${error.message}`);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

const deleteUsuario = (req, res) => {
    const { id } = req.params;

    // Validación de seguridad: Evitar que el admin en sesión se elimine a sí mismo
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: "Acción denegada: No puedes eliminar tu propio usuario." });
    }

    dbUsuarios.run("DELETE FROM usuarios WHERE id = ?", [id], (err) => {
        if (err) {
            logger.error(`Error al eliminar usuario ID ${id}: ${err.message}`);
            return res.status(500).json({ error: "Error al eliminar el usuario." });
        }
        logger.info(`Usuario ID ${id} eliminado por ${req.user.usuario}`);
        res.json({ ok: true, mensaje: "Usuario eliminado correctamente." });
    });
};

// Finalmente, asegúrate de exportar TODAS las funciones modificando tu module.exports actual:
module.exports = { login, logout, getUsuarios, createUsuario, deleteUsuario };

