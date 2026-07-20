
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