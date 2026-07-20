// =============================================================
// models/HistorialExpediente.js
// Define la forma de una etapa del historial del expediente
// =============================================================

/**
 * Clase que representa una etapa registrada en el historial
 * de un expediente de divorcio municipal.
 */
class HistorialExpediente {
  /**
   * @param {string}      estado
   * @param {string}      descripcion
   * @param {Date|string} fecha
   */
  constructor(estado, descripcion, fecha) {
    this.estado = estado;
    this.descripcion = descripcion;
    this.fecha = fecha;
  }

  /**
   * Formatea la fecha en formato legible para el ciudadano.
   * Ejemplo: "15 de junio de 2025, 10:32 a. m."
   */
  get fechaFormateada() {
    const d = new Date(this.fecha);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toJSON() {
    return {
      estado: this.estado,
      descripcion: this.descripcion,
      fecha: this.fecha,
      fechaFormateada: this.fechaFormateada,
    };
  }
}

module.exports = HistorialExpediente;