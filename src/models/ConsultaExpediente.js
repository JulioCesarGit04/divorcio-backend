class Expediente {
  /**
   * @param {number}  id
   * @param {string}  numeroExpediente
   * @param {string}  estadoActual
   * @param {Array}   historial
   */
  constructor(id, numeroExpediente, estadoActual, historial = []) {
    this.id = id;
    this.numeroExpediente = numeroExpediente;
    this.estadoActual = estadoActual;
    this.historial = historial;
  }

  get estadoInfo() {
  const mapa = {
    EN_CALIFICACION: {
      etiqueta: 'En calificación',
      color: 'info',
      mensaje: 'Su solicitud está siendo evaluada por el equipo municipal.'
    },
    ADMISIBLE: {
      etiqueta: 'Admisible',
      color: 'success',
      mensaje: 'Su solicitud fue admitida. Proceda a presentarla en Mesa de Partes.'
    },
    OBSERVADA: {
      etiqueta: 'Observada',
      color: 'warning',
      mensaje: 'Su solicitud tiene observaciones pendientes de subsanación.'
    },
    RECHAZADO: {
      etiqueta: 'Rechazado',
      color: 'danger',
      mensaje: 'Su solicitud no cumple los requisitos y fue rechazada.'
    },
    RECIBIDO: {
      etiqueta: 'Expediente recibido',
      color: 'info',
      mensaje: 'Su expediente ha sido recibido correctamente.'
    },
    EVALUACION: {
      etiqueta: 'En evaluación',
      color: 'warning',
      mensaje: 'Su expediente se encuentra en proceso de evaluación.'
    },
    RES_SEPARACION: {
      etiqueta: 'Resolución de separación',
      color: 'purple',
      mensaje: 'Se emitió la resolución de separación de cuerpos.'
    },
    RES_DISOLUCION: {
      etiqueta: 'Resolución de disolución',
      color: 'success',
      mensaje: 'Se emitió la resolución de disolución del vínculo matrimonial.'
    },
    ARCHIVO: {
      etiqueta: 'Archivado',
      color: 'default',
      mensaje: 'El trámite ha finalizado y el expediente se encuentra archivado.'
    },
  };

  return (
    mapa[this.estadoActual] ?? {
      etiqueta: this.estadoActual,
      color: 'default',
      mensaje: 'Estado no definido.'
    }
  );
}

  toJSON() {
    return {
      id: this.id,
      numeroExpediente: this.numeroExpediente,
      estadoActual: this.estadoActual,
      estadoInfo: this.estadoInfo,
      historial: this.historial,
    };
  }
}

module.exports = Expediente;