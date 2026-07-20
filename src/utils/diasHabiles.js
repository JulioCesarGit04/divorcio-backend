// src/utils/diasHabiles.js
// ================================================================
// FERIADOS FIJOS (mes: 0-indexado, como en JS)
// ================================================================
const FERIADOS_FIJOS = [
    { mes: 0, dia: 1, nombre: 'Año Nuevo' },                             // 1/ene
    { mes: 4, dia: 1, nombre: 'Día del Trabajo' },                        // 1/may
    { mes: 5, dia: 7, nombre: 'Batalla de Arica y Día de la Bandera' },  // 7/jun
    { mes: 5, dia: 29, nombre: 'Día de San Pedro y San Pablo' },          // 29/jun
    { mes: 6, dia: 23, nombre: 'Día de la Fuerza Aérea del Perú' },       // 23/jul
    { mes: 6, dia: 28, nombre: 'Fiestas Patrias' },                       // 28/jul
    { mes: 6, dia: 29, nombre: 'Fiestas Patrias' },                       //  29/jul
    { mes: 7, dia: 6, nombre: 'Batalla de Junín' },                       // 6/ago
    { mes: 7, dia: 30, nombre: 'Santa Rosa de Lima' },                    // 30/ago
    { mes: 9, dia: 8, nombre: 'Combate de Angamos' },                     // 8/oct
    { mes: 10, dia: 1, nombre: 'Día de Todos los Santos' },               // 1/nov
    { mes: 11, dia: 8, nombre: 'Inmaculada Concepción' },                 // 8/dic
    { mes: 11, dia: 9, nombre: 'Batalla de Ayacucho' },                   // 9/dic
    { mes: 11, dia: 25, nombre: 'Navidad' }                               // 25/dic
];

// ================================================================
// DÍAS NO LABORABLES (sector público)
// ================================================================
const DIAS_NO_LABORABLES = [
    { mes: 4, dia: 2, nombre: 'Día no laborable' },   // 2/may
    { mes: 6, dia: 27, nombre: 'Día no laborable' },  // 27/jul
    { mes: 11, dia: 26, nombre: 'Día no laborable' }  // 26/dic
];

// ================================================================
// CÁLCULO DE SEMANA SANTA (Jueves y Viernes Santo)
// ================================================================
function calcularSemanaSanta(year) {
    const a = year % 19;
    const b = year % 4;
    const c = year % 7;
    const d = (19 * a + 24) % 30;
    const e = (2 * b + 4 * c + 6 * d + 5) % 7;

    let diaPascua = d + e;
    let mesPascua = 3;
    let diaPascuaFinal = diaPascua + 22;

    if (diaPascuaFinal > 31) {
        diaPascuaFinal -= 31;
        mesPascua = 4;
    }

    const pascua = new Date(year, mesPascua - 1, diaPascuaFinal);
    const juevesSanto = new Date(pascua);
    juevesSanto.setDate(pascua.getDate() - 3);
    const viernesSanto = new Date(pascua);
    viernesSanto.setDate(pascua.getDate() - 2);

    const formatLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    return {
        juevesSanto: formatLocal(juevesSanto),
        viernesSanto: formatLocal(viernesSanto)
    };
}

// ================================================================
// CACHE DE FERIADOS (por año)
// ================================================================
const cacheFeriados = {};

function getFeriados(year) {
    if (!cacheFeriados[year]) {
        const feriados = [];

        FERIADOS_FIJOS.forEach(f => {
            const fecha = new Date(year, f.mes, f.dia);
            const y = fecha.getFullYear();
            const m = String(fecha.getMonth() + 1).padStart(2, '0');
            const d = String(fecha.getDate()).padStart(2, '0');
            feriados.push(`${y}-${m}-${d}`);
        });

        DIAS_NO_LABORABLES.forEach(dNoLab => {
            const fecha = new Date(year, dNoLab.mes, dNoLab.dia);
            const y = fecha.getFullYear();
            const m = String(fecha.getMonth() + 1).padStart(2, '0');
            const d = String(fecha.getDate()).padStart(2, '0');
            feriados.push(`${y}-${m}-${d}`);
        });

        const semanaSanta = calcularSemanaSanta(year);
        feriados.push(semanaSanta.juevesSanto);
        feriados.push(semanaSanta.viernesSanto);

        cacheFeriados[year] = [...new Set(feriados)];
    }
    return cacheFeriados[year];
}

// ================================================================
// FUNCIONES PRINCIPALES
// ================================================================
function esFeriado(fecha) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const fechaStr = `${year}-${month}-${day}`;
    return getFeriados(year).includes(fechaStr);
}

function esDiaHabil(fecha) {
    const diaSemana = fecha.getDay();
    const esLaborable = diaSemana !== 0 && diaSemana !== 6;
    return esLaborable && !esFeriado(fecha);
}

function sumarDiasHabiles(fechaInicio, dias) {
    if (dias === 0) return fechaInicio;
    let fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
    let contador = 0;
    while (contador < dias) {
        fecha.setDate(fecha.getDate() + 1);
        if (esDiaHabil(fecha)) {
            contador++;
        }
    }
    return fecha;
}

function diasHabilesEntre(fechaInicio, fechaFin) {
    let contador = 0;
    let fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
    let fechaFinLocal = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
    while (fecha <= fechaFinLocal) {
        if (esDiaHabil(fecha)) contador++;
        fecha.setDate(fecha.getDate() + 1);
    }
    return contador;
}
// Agrega esta función después de diasHabilesEntre
function diasHabilesRestantes(fechaInicio, fechaFin) {
    // Cuenta los días hábiles desde el día siguiente a fechaInicio hasta fechaFin (inclusive)
    let contador = 0;
    let fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
    fecha.setDate(fecha.getDate() + 1); // Empezamos desde el día siguiente
    let fechaFinLocal = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
    while (fecha <= fechaFinLocal) {
        if (esDiaHabil(fecha)) contador++;
        fecha.setDate(fecha.getDate() + 1);
    }
    return contador;
}
module.exports = {
    sumarDiasHabiles,
    esDiaHabil,
    diasHabilesEntre,
    getFeriados,
    esFeriado,
    diasHabilesRestantes
};