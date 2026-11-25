// /controllers/portalController.js ..
const nodemailer = require("nodemailer");
const { dbFuncionarios, dbPermisos } = require("../config/database");
const logger = require("../middlewares/logger");

// Configuración del transporter usando las variables de entorno (.env)
const transporter = nodemailer.createTransport({ 
    service: 'gmail', 
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

const solicitarInforme = (req, res) => {
    const { rut } = req.body;
   
    if (!rut) return res.status(400).json({ error: "Debe ingresar un RUT." });

    // Generamos ambas versiones del RUT ("K" y "k") para buscar a la fuerza
    const rutMayuscula = rut.trim().toUpperCase();
    const rutMinuscula = rut.trim().toLowerCase();

    // Buscamos si existe con mayúscula O con minúscula
    dbFuncionarios.get("SELECT * FROM funcionarios WHERE rut = ? OR rut = ?", [rutMayuscula, rutMinuscula], (err, func) => {
        if (err) {
            logger.error(`Error de BD al buscar RUT para correo: ${err.message}`);
            return res.status(500).json({ error: "Error en la base de datos." });
        }
        if (!func) {
            logger.warn(`Intento de solicitud de informe con RUT inexistente: ${rut}`);
            return res.status(404).json({ error: "No se encontró el RUT en nuestros registros." });
        }
        if (!func.correo) {
            return res.status(400).json({ error: "Este RUT no tiene un correo electrónico asociado. Contacte a RRHH." });
        }

        const anioActual = new Date().getFullYear();
       
        // Hacemos lo mismo para buscar sus permisos (por si acá también hay mezcla de mayúsculas/minúsculas)
        dbPermisos.all("SELECT * FROM permisos WHERE rutFuncionario = ? OR rutFuncionario = ? ORDER BY fechaPermiso DESC", [rutMayuscula, rutMinuscula], (err, permisosRows) => {
            if (err) return res.status(500).json({ error: "Error al obtener el historial de permisos." });

            const permisosAnio = (permisosRows || []).filter(p => p.fechaPermiso && p.fechaPermiso.startsWith(anioActual.toString()));
            const usados = permisosAnio.reduce((acc, p) => acc + (Number(p.tipo) || 0), 0);
            const saldo = 6 - usados;

            let historialHtml = permisosRows && permisosRows.length > 0 ? "<ul style='padding-left: 20px;'>" : "<p>No tienes permisos registrados.</p>";
            if (permisosRows && permisosRows.length > 0) {
                permisosRows.forEach(p => {
                    historialHtml += `<li style="margin-bottom: 10px;"><strong>${p.fechaPermiso}</strong>: ${p.tipo == 1 ? "Día Completo" : `Medio Día (${p.jornada})`}<br><i>Motivo: ${p.observacion || "Sin observación"}</i></li>`;
                });
                historialHtml += "</ul>";
            }

            const mailOptions = {
                from: `"Administración Escolar" <${process.env.EMAIL_USER}>`,
                to: func.correo,
                subject: "Detalle de Días Administrativos y Permisos",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #0f172a;">Portal del Funcionario</h2>
                        <p>Estimado/a <strong>${func.nombre}</strong>,</p>
                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                            <h3 style="margin: 0; color: #1e3a8a;">Saldo disponible (${anioActual}): ${saldo} días</h3>
                        </div>
                        <h3 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Su Historial</h3>
                        ${historialHtml}
                        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Este es un mensaje automático, por favor no responda a este correo.</p>
                    </div>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    logger.error(`Error al enviar correo a ${func.correo}: ${error.message}`);
                    return res.status(500).json({ error: "El sistema no pudo enviar el correo. Verifique la configuración." });
                }
                logger.info(`Informe enviado por correo exitosamente al RUT ${rut}`);
                res.json({ ok: true, mensaje: `Se ha enviado un correo con éxito a la dirección: ${func.correo.replace(/(.{2})(.*)(?=@)/, "$1***")}` });
            });
        });
    });
};

module.exports = { solicitarInforme };