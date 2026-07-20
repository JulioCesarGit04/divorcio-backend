/**
 * Servicio completo para gestión de plazos de subsanación de documentos
 * Ley N° 27444, Art. 36.4: Plazo legal de 2 días hábiles
 */

function sumarDiasHabiles(fechaInicio, dias) {
  const resultado = new Date(fechaInicio);
  let sumados = 0;
  
  while (sumados < dias) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      sumados++;
    }
  }
  
  return resultado;
}

function calcularFechaLimiteSubsanacion(fechaObservacion) {
  if (!fechaObservacion) return null;
  
  const fechaInicio = new Date(fechaObservacion);
  const fechaLimite = sumarDiasHabiles(fechaInicio, 2);
  fechaLimite.setHours(23, 59, 59, 999);
  
  return fechaLimite;
}

function validarDocumentoObservado(fechaObservacion, horaServidor) {
  if (!fechaObservacion) {
    return {
      valido: false,
      razon: 'Sin fecha de observación registrada',
      fechaLimite: null,
      diasRestantes: null,
      mensajeUsuario: 'Este documento no tiene fecha de observación. Contacta a soporte.'
    };
  }

  const fechaLimite = calcularFechaLimiteSubsanacion(fechaObservacion);
  const ahora = new Date(horaServidor);
  const dentroDelPlazo = ahora.getTime() <= fechaLimite.getTime();
  
  let diasRestantes = null;
  if (dentroDelPlazo) {
    const diferenciaMilis = fechaLimite.getTime() - ahora.getTime();
    diasRestantes = Math.ceil(diferenciaMilis / (1000 * 60 * 60 * 24));
  }

  const fechaLimiteStr = fechaLimite.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return {
    valido: dentroDelPlazo,
    razon: dentroDelPlazo 
      ? `Plazo disponible hasta ${fechaLimiteStr}`
      : `Plazo vencido el ${fechaLimiteStr}`,
    fechaLimite,
    diasRestantes,
    mensajeUsuario: dentroDelPlazo
      ? `Tienes hasta el ${fechaLimiteStr} para subsanar este documento`
      : `El plazo venció el ${fechaLimiteStr}. Ya no puedes subsanar este documento`
  };
}

function validarDocumentosObservados(documentos, horaServidor) {
  if (!documentos || documentos.length === 0) {
    return {
      todosValidos: false,
      documentosValidos: [],
      documentosVencidos: [],
      resumen: 'No hay documentos para validar'
    };
  }

  const resultados = documentos.map(doc => ({
    ...doc,
    validacion: validarDocumentoObservado(doc.evaluado_en, horaServidor)
  }));

  const documentosValidos = resultados.filter(r => r.validacion.valido);
  const documentosVencidos = resultados.filter(r => !r.validacion.valido);
  const todosValidos = documentosVencidos.length === 0;

  return {
    todosValidos,
    documentosValidos,
    documentosVencidos,
    resumen: todosValidos 
      ? `Todos los documentos (${documentos.length}) están dentro del plazo`
      : `${documentosVencidos.length} documento(s) vencido(s) de ${documentos.length} totales`
  };
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function calcularTiempoRestante(fechaLimite, horaServidor) {
  if (!fechaLimite || !horaServidor) return null;
  
  const diff = new Date(fechaLimite).getTime() - new Date(horaServidor).getTime();
  if (diff <= 0) return { vencido: true };
  
  const totalSegundos = Math.floor(diff / 1000);
  const dias = Math.floor(totalSegundos / (24 * 60 * 60));
  const horas = Math.floor((totalSegundos % (24 * 60 * 60)) / (60 * 60));
  const minutos = Math.floor((totalSegundos % (60 * 60)) / 60);
  const segundos = totalSegundos % 60;
  
  return {
    vencido: false,
    dias,
    horas,
    minutos,
    segundos,
    formato: `${dias}d ${horas}h ${minutos}m ${segundos}s`
  };
}

module.exports = {
  sumarDiasHabiles,
  calcularFechaLimiteSubsanacion,
  validarDocumentoObservado,
  validarDocumentosObservados,
  formatearFecha,
  calcularTiempoRestante
};