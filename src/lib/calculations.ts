/**
 * Medical calculation functions for pediatric nutritional requirements
 * Based on: "Pediatric Nutrition in Practice" (Koletzko et al., 2015)
 * FAO/WHO/UNU 2004, Dietary Reference Intakes (DRI)
 * Chapter 1.2 - Nutritional Assessment: Anthropometry & Growth Normality
 */

export interface PatientData {
  peso: number;
  edadMeses: number;
  sexo: "masculino" | "femenino";
  edadGestacional?: number;
  talla?: number;
  superficieCorporal?: number;
  nivelActividad?: "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo";
  /* --- New anthropometric fields (Ch. 1.2) --- */
  perimetroCefalico?: number;
  circunferenciaBrazo?: number; // MUAC in mm
  pliegueCutaneoTriceps?: number; // in mm
}

export interface CalculationResults {
  tasaMetabolicaBasal: number;
  gastoEnergeticoTotal: number;
  requerimientoEnergetico: number;
  costoEnergiaCrecimiento: number;
  requerimientoEnergeticoPorKg: number;
  requerimientoLiquidos: number;
  requerimientoLiquidosPorKg: number;
  requerimientoProteinasEAR: number;
  requerimientoProteinasRDA: number;
  requerimientoProteinasRango: string;
  proteinasTotales: number;
  requerimientoSodio: number;
  requerimientoSodioRango: string;
  requerimientoPotasio: number;
  requerimientoPotasioRango: string;
  superficieCorporal: number;
  metodoBMR: string;
  metodoTEE: string;
  factorPAL: number;
  esPrematuro: boolean;
  /* --- New anthropometric results (Ch. 1.2) --- */
  bmi?: number;
  bmiClasificacion?: string;
  pesoParaTalla?: number; // % of expected weight-for-height
  pesoParaTallaClasificacion?: string;
  tallaParaEdad?: number; // % of expected height-for-age
  tallaParaEdadClasificacion?: string;
  velocidadPesoEsperada?: string; // expected weekly weight gain
  velocidadTallaEsperada?: string; // expected yearly length/height gain
  perimetroCefalicoEsperado?: number; // expected head circumference
  perimetroCefalicoEstado?: string; // normal / bajo / alto
  muacClasificacion?: string; // MUAC classification
  pliegueCutaneoEstado?: string; // skinfold status
  evaluacionNutricional?: string; // overall nutritional assessment
  colorEvaluacion?: string; // green / yellow / orange / red
}

const PAL_VALUES: Record<string, number> = {
  sedentario: 1.2,
  ligero: 1.5,
  moderado: 1.7,
  activo: 1.9,
  muy_activo: 2.0,
};

function costoCrecimiento(edadMeses: number): number {
  if (edadMeses <= 3) return 175;
  if (edadMeses <= 6) return 60;
  if (edadMeses <= 12) return 20;
  if (edadMeses <= 36) return 3;
  return 0;
}

/* ================================================================== */
/*  BMR – Schofield by age & sex                                      */
/* ================================================================== */

export function calcularBMR(
  peso: number,
  edadMeses: number,
  sexo: string
): { bmr: number; metodo: string } {
  if (edadMeses < 36) {
    if (sexo === "masculino")
      return {
        bmr: 59.5 * peso - 30.4,
        metodo: "Schofield (<3 a\u00f1os, M): 59.5\u00d7peso - 30.4",
      };
    return {
      bmr: 58.3 * peso - 31.1,
      metodo: "Schofield (<3 a\u00f1os, F): 58.3\u00d7peso - 31.1",
    };
  } else if (edadMeses < 120) {
    if (sexo === "masculino")
      return {
        bmr: 22.7 * peso + 504.3,
        metodo: "Schofield (3-10 a\u00f1os, M): 22.7\u00d7peso + 504.3",
      };
    return {
      bmr: 20.3 * peso + 485.9,
      metodo: "Schofield (3-10 a\u00f1os, F): 20.3\u00d7peso + 485.9",
    };
  } else {
    if (sexo === "masculino")
      return {
        bmr: 17.7 * peso + 658.2,
        metodo: "Schofield (10-18 a\u00f1os, M): 17.7\u00d7peso + 658.2",
      };
    return {
      bmr: 13.4 * peso + 692.6,
      metodo: "Schofield (10-18 a\u00f1os, F): 13.4\u00d7peso + 692.6",
    };
  }
}

/* ================================================================== */
/*  TEE – DLW method                                                  */
/* ================================================================== */

export function calcularTEE(
  peso: number,
  edadMeses: number,
  sexo: string
): { tee: number; metodo: string } {
  if (edadMeses <= 24) {
    return {
      tee: -99.4 + 88.6 * peso,
      metodo: "TEE infantes (DLW): -99.4 + 88.6\u00d7peso",
    };
  }
  const w2 = peso * peso;
  if (sexo === "masculino")
    return {
      tee: 310.2 + 63.3 * peso - 0.263 * w2,
      metodo: "TEE ni\u00f1os (DLW+HR): 310.2 + 63.3\u00d7p - 0.263\u00d7p\u00b2",
    };
  return {
    tee: 263.4 + 65.3 * peso - 0.454 * w2,
    metodo: "TEE ni\u00f1as (DLW+HR): 263.4 + 65.3\u00d7p - 0.454\u00d7p\u00b2",
  };
}

/* ================================================================== */
/*  Energy Requirement – BMR × PAL + growth cost                       */
/* ================================================================== */

export function calcularRequerimientoEnergetico(
  bmr: number,
  edadMeses: number,
  nivelActividad: string
): { requerimiento: number; pal: number } {
  const pal = PAL_VALUES[nivelActividad] || PAL_VALUES.moderado;
  return {
    requerimiento: bmr * pal + costoCrecimiento(edadMeses),
    pal,
  };
}

/* ================================================================== */
/*  Fluids – Holliday-Segar by weight                                  */
/* ================================================================== */

export function calcularRequerimientoLiquidos(peso: number): number {
  if (peso <= 10) return peso * 100;
  if (peso <= 20) return 1000 + (peso - 10) * 50;
  return 1500 + (peso - 20) * 20;
}

/* ================================================================== */
/*  Proteins – EAR/RDA by age                                          */
/* ================================================================== */

export function calcularRequerimientoProteinas(
  edadMeses: number,
  sexo: string
): { ear: number; rda: number; rango: string } {
  if (edadMeses <= 6)
    return { ear: 1.52, rda: 1.52, rango: "1.52 g/kg/d\u00eda (AI - leche materna)" };
  if (edadMeses <= 12)
    return { ear: 1.0, rda: 1.2, rango: "1.0 - 1.2 g/kg/d\u00eda (EAR-RDA)" };
  if (edadMeses <= 36)
    return { ear: 0.87, rda: 1.05, rango: "0.87 - 1.05 g/kg/d\u00eda (EAR-RDA)" };
  if (edadMeses <= 156)
    return { ear: 0.76, rda: 0.95, rango: "0.76 - 0.95 g/kg/d\u00eda (EAR-RDA)" };
  if (sexo === "masculino")
    return { ear: 0.73, rda: 0.85, rango: "0.73 - 0.85 g/kg/d\u00eda (EAR-RDA)" };
  return { ear: 0.71, rda: 0.85, rango: "0.71 - 0.85 g/kg/d\u00eda (EAR-RDA)" };
}

/* ================================================================== */
/*  Sodium & Potassium                                                  */
/* ================================================================== */

export function calcularRequerimientoSodio(
  edadGestacional: number | undefined,
  edadMeses: number
): { valor: number; rango: string } {
  if (edadGestacional !== undefined && edadGestacional < 37 && edadMeses <= 1)
    return { valor: 3.0, rango: "2.0 - 5.0 mEq/kg/d\u00eda (Prematuro)" };
  return { valor: 1.5, rango: "1.0 - 2.0 mEq/kg/d\u00eda" };
}

export function calcularRequerimientoPotasio(
  edadGestacional: number | undefined,
  edadMeses: number
): { valor: number; rango: string } {
  if (edadGestacional !== undefined && edadGestacional < 37 && edadMeses <= 1)
    return { valor: 1.5, rango: "1.0 - 2.0 mEq/kg/d\u00eda (Prematuro)" };
  return { valor: 1.5, rango: "1.0 - 2.0 mEq/kg/d\u00eda" };
}

/* ================================================================== */
/*  Body Surface Area – Mosteller                                      */
/* ================================================================== */

export function calcularSuperficieCorporal(
  peso: number,
  talla?: number,
  edadMeses?: number
): number {
  let height = talla;
  if (!height && edadMeses !== undefined) {
    if (edadMeses <= 6) height = 50 + edadMeses * 2.5;
    else if (edadMeses <= 12) height = 65 + (edadMeses - 6) * 1.2;
    else height = 75 + (edadMeses / 12) * 6;
  }
  if (!height) height = 55;
  return Math.sqrt((peso * height) / 3600);
}

/* ================================================================== */
/*  CHAPTER 1.2 – Anthropometric Normality by Age                     */
/*  Source: Pediatric Nutrition in Practice, Koletzko et al. 2015      */
/* ================================================================== */

/**
 * Expected weight gain per week by age range (g/week)
 * From Ch. 1.2 "Normal Growth: Simple Rules of Thumb"
 */
export function obtenerVelocidadPesoEsperada(edadMeses: number): string {
  if (edadMeses <= 12)
    return "200 g/semana (0-3m), 130 g/semana (3-6m), 85 g/semana (6-9m), 75 g/semana (9-12m)";
  if (edadMeses <= 24)
    return "~25 g/semana (duplica peso al 4m, triplica al 12m)";
  return "Variable por individuo; usar curvas OMS";
}

/**
 * Expected length/height gain by age range
 * From Ch. 1.2: +25 cm 1er a\u00f1o, +12 cm 2do a\u00f1o, ~6 cm/a\u00f1o en ni\u00f1ez
 */
export function obtenerVelocidadTallaEsperada(edadMeses: number): string {
  if (edadMeses <= 12)
    return "25 cm en el primer a\u00f1o (~2 cm/mes)";
  if (edadMeses <= 24)
    return "12 cm en el segundo a\u00f1o (~1 cm/mes)";
  if (edadMeses <= 132) // 11 a\u00f1os
    return "5-7 cm/a\u00f1o (crecimiento estable)";
  return "Variable con pubertad; pico ~8-12 cm/a\u00f1o";
}

/**
 * Expected head circumference by age (cm)
 * From Ch. 1.2: +1 cm/mes 1er a\u00f1o, +2 cm 2do a\u00f1o, 80% adulto a los 2 a\u00f1os
 * Average newborn HC: 34-35 cm. Adult: ~56 cm (M), ~54 cm (F)
 */
export function obtenerPerimetroCefalicoEsperado(
  edadMeses: number,
  sexo: string
): number {
  const adultoHC = sexo === "masculino" ? 56.5 : 54.5;
  if (edadMeses <= 12)
    return 34.5 + edadMeses * 1.0; // +1 cm/mes
  if (edadMeses <= 24)
    return 46.5 + ((edadMeses - 12) / 12) * 2; // +2 cm total 2do a\u00f1o
  // From 2 years onward: 80% adult to adult (linear approx)
  const hc2 = 48.5;
  if (edadMeses <= 216) {
    const progreso = Math.min(1, (edadMeses - 24) / (216 - 24));
    return hc2 + (adultoHC - hc2) * progreso;
  }
  return adultoHC;
}

/**
 * Classify head circumference status
 */
export function clasificarPerimetroCefalico(
  actual: number,
  esperado: number
): string {
  const desviacion = ((actual - esperado) / esperado) * 100;
  if (desviacion < -10) return "Bajo (<-2 DE) - Evaluar microcefalia";
  if (desviacion < -5) return "Ligeramente bajo (-1 a -2 DE)";
  if (desviacion <= 5) return "Normal (\u00b12 DE)";
  if (desviacion <= 10) return "Ligeramente alto (+1 a +2 DE)";
  return "Alto (>+2 DE) - Evaluar macrocefalia";
}

/**
 * Calculate BMI (kg/m\u00b2)
 */
export function calcularBMI(peso: number, tallaCm: number): number {
  const tallaM = tallaCm / 100;
  return Math.round((peso / (tallaM * tallaM)) * 100) / 100;
}

/**
 * BMI Classification for children (simplified WHO criteria by age group)
 * From Ch. 1.2 Table 1
 */
export function clasificarBMI(bmi: number, edadMeses: number): string {
  if (edadMeses < 24)
    return `${bmi} (usar curvas OMS para <2 a\u00f1os - no aplica BMI est\u00e1ndar)`;
  if (bmi < 18.5)
    return `${bmi} - Bajo peso`;
  if (bmi < 25)
    return `${bmi} - Normal`;
  if (bmi < 30)
    return `${bmi} - Sobrepeso`;
  return `${bmi} - Obesidad`;
}

/**
 * Expected weight-for-height at 50th percentile (simplified from WHO reference)
 * Approximation based on median values from WHO growth standards
 */
export function obtenerPesoEsperadoParaTalla(
  tallaCm: number,
  sexo: string
): number {
  // Simplified median weight (50th percentile) by height ranges
  // Based on WHO Child Growth Standards
  const isMale = sexo === "masculino";
  if (tallaCm <= 50) return isMale ? 3.2 : 3.1;
  if (tallaCm <= 60) return isMale ? 5.7 : 5.5;
  if (tallaCm <= 70) return isMale ? 7.8 : 7.5;
  if (tallaCm <= 80) return isMale ? 10.2 : 9.8;
  if (tallaCm <= 90) return isMale ? 12.5 : 12.0;
  if (tallaCm <= 100) return isMale ? 15.5 : 15.0;
  if (tallaCm <= 110) return isMale ? 18.5 : 18.0;
  if (tallaCm <= 120) return isMale ? 22.0 : 21.5;
  if (tallaCm <= 130) return isMale ? 26.5 : 26.0;
  if (tallaCm <= 140) return isMale ? 32.5 : 32.0;
  if (tallaCm <= 150) return isMale ? 40.0 : 40.5;
  if (tallaCm <= 160) return isMale ? 48.5 : 49.5;
  if (tallaCm <= 170) return isMale ? 58.0 : 58.0;
  if (tallaCm <= 180) return isMale ? 67.0 : 65.0;
  return isMale ? 72.0 : 68.0;
}

/**
 * Weight-for-height classification (Ch. 1.2 Table 1)
 */
export function clasificarPesoParaTalla(
  porcentaje: number
): string {
  if (porcentaje > 120) return `${porcentaje}% - Obesidad`;
  if (porcentaje > 110) return `${porcentaje}% - Sobrepeso`;
  if (porcentaje >= 90) return `${porcentaje}% - Normal`;
  if (porcentaje >= 80) return `${porcentaje}% - Desnutrici\u00f3n leve`;
  if (porcentaje >= 70) return `${porcentaje}% - Desnutrici\u00f3n moderada`;
  return `${porcentaje}% - Desnutrici\u00f3n severa`;
}

/**
 * Expected height-for-age at 50th percentile (simplified)
 */
export function obtenerTallaEsperadaParaEdad(
  edadMeses: number,
  sexo: string
): number {
  const isMale = sexo === "masculino";
  if (edadMeses === 0) return isMale ? 49.9 : 49.1;
  if (edadMeses <= 3) return isMale ? 50 + edadMeses * 3.8 : 49.1 + edadMeses * 3.7;
  if (edadMeses <= 6) return isMale ? 61.4 + (edadMeses - 3) * 2.7 : 60.2 + (edadMeses - 3) * 2.5;
  if (edadMeses <= 12) return isMale ? 69.5 + (edadMeses - 6) * 2.1 : 67.7 + (edadMeses - 6) * 2.0;
  if (edadMeses <= 24) return isMale ? 82.1 + (edadMeses - 12) * 1.0 : 79.7 + (edadMeses - 12) * 1.0;
  if (edadMeses <= 60) return isMale ? 94.1 + (edadMeses - 24) * 0.6 : 91.7 + (edadMeses - 24) * 0.6;
  if (edadMeses <= 120) return isMale ? 115.7 + (edadMeses - 60) * 0.55 : 114.3 + (edadMeses - 60) * 0.6;
  // Puberty onwards - accelerated growth
  if (edadMeses <= 156) return isMale ? 148.7 + (edadMeses - 120) * 0.65 : 149.9 + (edadMeses - 120) * 0.35;
  return isMale ? 172.1 : 162.5;
}

/**
 * Height-for-age classification (Ch. 1.2 Table 1)
 */
export function clasificarTallaParaEdad(
  porcentaje: number
): string {
  if (porcentaje >= 95) return `${porcentaje}% - Normal`;
  if (porcentaje >= 90) return `${porcentaje}% - Riesgo de talla baja`;
  if (porcentaje >= 85) return `${porcentaje}% - Talla baja (desnutrici\u00f3n cr\u00f3nica leve)`;
  return `${porcentaje}% - Retardo de crecimiento severo (stunting)`;
}

/**
 * MUAC Classification (Ch. 1.2)
 * <115 mm = severe risk of death (6-60 months)
 */
export function clasificarMUAC(
  muacMm: number,
  edadMeses: number
): string {
  if (edadMeses < 6 || edadMeses > 60)
    return `${muacMm} mm - Rango: 115-185 mm (referencia para 6-60 meses)`;
  if (muacMm < 115)
    return `${muacMm} mm - Desnutrici\u00f3n aguda severa (riesgo de muerte elevado)`;
  if (muacMm < 125)
    return `${muacMm} mm - Desnutrici\u00f3n aguda moderada`;
  if (muacMm < 135)
    return `${muacMm} mm - Riesgo de desnutrici\u00f3n`;
  if (muacMm <= 185)
    return `${muacMm} mm - Normal`;
  return `${muacMm} mm - Por encima del rango esperado`;
}

/**
 * Triceps skinfold status (approximate)
 */
export function evaluarPliegueCutaneo(
  pliegueMm: number,
  edadMeses: number
): string {
  if (edadMeses <= 6) {
    if (pliegueMm < 6) return `${pliegueMm} mm - Bajo (reservas de grasa reducidas)`;
    if (pliegueMm <= 12) return `${pliegueMm} mm - Normal para lactante`;
    return `${pliegueMm} mm - Alto`;
  }
  if (edadMeses <= 60) {
    if (pliegueMm < 7) return `${pliegueMm} mm - Bajo (wasting probable)`;
    if (pliegueMm <= 12) return `${pliegueMm} mm - Normal`;
    if (pliegueMm <= 18) return `${pliegueMm} mm - Elevado`;
    return `${pliegueMm} mm - Alto (sobrepeso/obesidad probable)`;
  }
  if (pliegueMm < 8) return `${pliegueMm} mm - Bajo`;
  if (pliegueMm <= 15) return `${pliegueMm} mm - Normal`;
  if (pliegueMm <= 22) return `${pliegueMm} mm - Elevado`;
  return `${pliegueMm} mm - Alto (obesidad probable)`;
}

/**
 * Overall nutritional assessment combining all indicators
 */
export function evaluacionNutricionalGlobal(
  pesoParaTallaClasif: string,
  tallaParaEdadClasif: string,
  bmiClasif: string,
  muacClasif: string
): { evaluacion: string; color: string } {
  // Count severity indicators
  const severo = [
    pesoParaTallaClasif, tallaParaEdadClasif, bmiClasif, muacClasif
  ].filter(s => s.includes("sever") || s.includes("Sever")).length;

  const moderado = [
    pesoParaTallaClasif, tallaParaEdadClasif, bmiClasif, muacClasif
  ].filter(s => s.includes("moderad") || s.includes("Moderad")).length;

  const leve = [
    pesoParaTallaClasif, tallaParaEdadClasif, bmiClasif, muacClasif
  ].filter(s => s.includes("leve") || s.includes("Leve") || s.includes("Riesgo")).length;

  if (severo > 0)
    return { evaluacion: "Desnutrici\u00f3n severa - Intervenci\u00f3n urgente requerida", color: "red" };
  if (moderado > 0)
    return { evaluacion: "Desnutrici\u00f3n moderada - Requiere intervenci\u00f3n nutricional", color: "orange" };
  if (leve > 0)
    return { evaluacion: "Riesgo nutricional - Monitoreo y seguimiento recomendado", color: "yellow" };
  if (bmiClasif.includes("Sobrepeso") || bmiClasif.includes("Obesidad"))
    return { evaluacion: "Exceso de peso - Evaluaci\u00f3n diet\u00e9tica recomendada", color: "yellow" };
  return { evaluacion: "Estado nutricional normal - Continuar monitoreo regular", color: "green" };
}

/* ================================================================== */
/*  Master calculation function                                       */
/* ================================================================== */

export function calcularRequerimientos(data: PatientData): CalculationResults {
  const {
    peso,
    edadMeses,
    sexo,
    edadGestacional,
    superficieCorporal,
    talla,
    nivelActividad,
    perimetroCefalico,
    circunferenciaBrazo,
    pliegueCutaneoTriceps,
  } = data;
  const { bmr, metodo: metodoBMR } = calcularBMR(peso, edadMeses, sexo);
  const { tee, metodo: metodoTEE } = calcularTEE(peso, edadMeses, sexo);
  const { requerimiento, pal } = calcularRequerimientoEnergetico(
    bmr,
    edadMeses,
    nivelActividad || "moderado"
  );
  const crecimiento = costoCrecimiento(edadMeses);
  const liquidos = calcularRequerimientoLiquidos(peso);
  const esPrematuro =
    edadGestacional !== undefined && edadGestacional < 37 && edadMeses <= 1;
  const proteinasBase = calcularRequerimientoProteinas(edadMeses, sexo);
  const proteinas = esPrematuro
    ? {
        ear: 3.0,
        rda: 4.0,
        rango: "3.0 - 4.0 g/kg/d\u00eda (Prematuro - OMS/FAO/UNU)",
      }
    : proteinasBase;
  const sodio = calcularRequerimientoSodio(edadGestacional, edadMeses);
  const potasio = calcularRequerimientoPotasio(edadGestacional, edadMeses);
  const bsa =
    superficieCorporal ||
    calcularSuperficieCorporal(peso, talla, edadMeses);

  /* --- Ch. 1.2 Anthropometric calculations --- */
  let bmi: number | undefined;
  let bmiClasificacion: string | undefined;
  let pesoParaTalla: number | undefined;
  let pesoParaTallaClasificacion: string | undefined;
  let tallaParaEdad: number | undefined;
  let tallaParaEdadClasificacion: string | undefined;
  let perimetroCefalicoEsperado: number | undefined;
  let perimetroCefalicoEstado: string | undefined;
  let muacClasificacion: string | undefined;
  let pliegueCutaneoEstado: string | undefined;
  let evaluacionNutricional: string | undefined;
  let colorEvaluacion: string | undefined;

  // Weight-for-height & BMI (need talla)
  if (talla) {
    bmi = calcularBMI(peso, talla);
    bmiClasificacion = clasificarBMI(bmi, edadMeses);

    const pesoEsperado = obtenerPesoEsperadoParaTalla(talla, sexo);
    pesoParaTalla = Math.round((peso / pesoEsperado) * 100);
    pesoParaTallaClasificacion = clasificarPesoParaTalla(pesoParaTalla);
  }

  // Height-for-age
  const tallaEsperada = obtenerTallaEsperadaParaEdad(edadMeses, sexo);
  if (talla) {
    tallaParaEdad = Math.round((talla / tallaEsperada) * 100);
    tallaParaEdadClasificacion = clasificarTallaParaEdad(tallaParaEdad);
  }

  // Head circumference (only for <24 months)
  if (edadMeses <= 24 && perimetroCefalico) {
    perimetroCefalicoEsperado = obtenerPerimetroCefalicoEsperado(edadMeses, sexo);
    perimetroCefalicoEstado = clasificarPerimetroCefalico(
      perimetroCefalico,
      perimetroCefalicoEsperado
    );
  }

  // MUAC
  if (circunferenciaBrazo) {
    muacClasificacion = clasificarMUAC(circunferenciaBrazo, edadMeses);
  }

  // Triceps skinfold
  if (pliegueCutaneoTriceps) {
    pliegueCutaneoEstado = evaluarPliegueCutaneo(pliegueCutaneoTriceps, edadMeses);
  }

  // Overall evaluation
  if (pesoParaTallaClasificacion && tallaParaEdadClasificacion && bmiClasificacion && muacClasificacion) {
    const ev = evaluacionNutricionalGlobal(
      pesoParaTallaClasificacion,
      tallaParaEdadClasificacion,
      bmiClasificacion,
      muacClasificacion
    );
    evaluacionNutricional = ev.evaluacion;
    colorEvaluacion = ev.color;
  } else if (pesoParaTallaClasificacion && bmiClasificacion) {
    const ev = evaluacionNutricionalGlobal(
      pesoParaTallaClasificacion,
      tallaParaEdadClasificacion || "Normal",
      bmiClasificacion,
      muacClasificacion || "Normal"
    );
    evaluacionNutricional = ev.evaluacion;
    colorEvaluacion = ev.color;
  }

  return {
    tasaMetabolicaBasal: Math.round(bmr * 10) / 10,
    gastoEnergeticoTotal: Math.round(tee * 10) / 10,
    requerimientoEnergetico: Math.round(requerimiento * 10) / 10,
    costoEnergiaCrecimiento: Math.round(crecimiento * 10) / 10,
    requerimientoEnergeticoPorKg: Math.round((requerimiento / peso) * 10) / 10,
    requerimientoLiquidos: Math.round(liquidos * 10) / 10,
    requerimientoLiquidosPorKg: Math.round((liquidos / peso) * 10) / 10,
    requerimientoProteinasEAR: proteinas.ear,
    requerimientoProteinasRDA: proteinas.rda,
    requerimientoProteinasRango: proteinas.rango,
    proteinasTotales: Math.round(proteinas.rda * peso * 10) / 10,
    requerimientoSodio: sodio.valor,
    requerimientoSodioRango: sodio.rango,
    requerimientoPotasio: potasio.valor,
    requerimientoPotasioRango: potasio.rango,
    superficieCorporal: Math.round(bsa * 1000) / 1000,
    metodoBMR,
    metodoTEE,
    factorPAL: pal,
    esPrematuro,
    /* Ch. 1.2 new fields */
    bmi,
    bmiClasificacion,
    pesoParaTalla,
    pesoParaTallaClasificacion,
    tallaParaEdad,
    tallaParaEdadClasificacion,
    velocidadPesoEsperada: obtenerVelocidadPesoEsperada(edadMeses),
    velocidadTallaEsperada: obtenerVelocidadTallaEsperada(edadMeses),
    perimetroCefalicoEsperado,
    perimetroCefalicoEstado,
    muacClasificacion,
    pliegueCutaneoEstado,
    evaluacionNutricional,
    colorEvaluacion,
  };
}

/* ================================================================== */
/*  Validation                                                         */
/* ================================================================== */

export function validarDatos(
  data: Partial<PatientData>
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  if (!data.peso || data.peso <= 0)
    errores.push("El peso debe ser mayor a 0 kg");
  else if (data.peso > 120) errores.push("El peso m\u00e1ximo permitido es 120 kg");
  if (
    data.edadMeses === undefined ||
    data.edadMeses < 0
  )
    errores.push("La edad debe ser mayor o igual a 0 meses");
  else if (data.edadMeses > 216)
    errores.push("La edad m\u00e1xima es 216 meses (18 a\u00f1os)");
  if (!data.sexo) errores.push("Debe seleccionar el sexo");
  if (
    data.edadGestacional !== undefined &&
    (data.edadGestacional < 22 || data.edadGestacional > 44)
  )
    errores.push("La edad gestacional debe estar entre 22 y 44 semanas");
  if (data.talla !== undefined && (data.talla < 20 || data.talla > 200))
    errores.push("La talla debe estar entre 20 y 200 cm");
  if (data.perimetroCefalico !== undefined && (data.perimetroCefalico < 20 || data.perimetroCefalico > 65))
    errores.push("El per\u00edmetro cef\u00e1lico debe estar entre 20 y 65 cm");
  if (data.circunferenciaBrazo !== undefined && (data.circunferenciaBrazo < 50 || data.circunferenciaBrazo > 250))
    errores.push("La circunferencia del brazo debe estar entre 50 y 250 mm");
  if (data.pliegueCutaneoTriceps !== undefined && (data.pliegueCutaneoTriceps < 2 || data.pliegueCutaneoTriceps > 40))
    errores.push("El pliegue cut\u00e1neo debe estar entre 2 y 40 mm");
  return { valido: errores.length === 0, errores };
}
