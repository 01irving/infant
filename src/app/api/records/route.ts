import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const records = await db.patientRecord.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error("Error al obtener registros:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resultados, input } = body;

    if (!resultados || !input) {
      return NextResponse.json(
        { success: false, errores: ["Datos incompletos"] },
        { status: 400 }
      );
    }

    const record = await db.patientRecord.create({
      data: {
        peso: parseFloat(input.peso),
        edadMeses: parseInt(input.edadMeses, 10),
        sexo: input.sexo,
        edadGestacional: input.edadGestacional
          ? parseInt(input.edadGestacional, 10)
          : null,
        talla: input.talla ? parseFloat(input.talla) : null,
        nivelActividad: input.nivelActividad || "moderado",
        tasaMetabolicaBasal: resultados.tasaMetabolicaBasal,
        gastoEnergeticoTotal: resultados.gastoEnergeticoTotal,
        requerimientoEnergetico: resultados.requerimientoEnergetico,
        costoEnergiaCrecimiento: resultados.costoEnergiaCrecimiento,
        requerimientoEnergeticoPorKg: resultados.requerimientoEnergeticoPorKg,
        requerimientoLiquidos: resultados.requerimientoLiquidos,
        requerimientoLiquidosPorKg: resultados.requerimientoLiquidosPorKg,
        requerimientoProteinasEAR: resultados.requerimientoProteinasEAR,
        requerimientoProteinasRDA: resultados.requerimientoProteinasRDA,
        requerimientoProteinasRango: resultados.requerimientoProteinasRango,
        proteinasTotales: resultados.proteinasTotales,
        requerimientoSodio: resultados.requerimientoSodio,
        requerimientoSodioRango: resultados.requerimientoSodioRango,
        requerimientoPotasio: resultados.requerimientoPotasio,
        requerimientoPotasioRango: resultados.requerimientoPotasioRango,
        superficieCorporal: resultados.superficieCorporal,
        metodoBMR: resultados.metodoBMR,
        metodoTEE: resultados.metodoTEE,
        factorPAL: resultados.factorPAL,
        esPrematuro: resultados.esPrematuro,
        // Ch. 1.2 anthropometric fields
        perimetroCefalico: input.perimetroCefalico
          ? parseFloat(input.perimetroCefalico)
          : null,
        circunferenciaBrazo: input.circunferenciaBrazo
          ? parseInt(input.circunferenciaBrazo, 10)
          : null,
        pliegueCutaneoTriceps: input.pliegueCutaneoTriceps
          ? parseFloat(input.pliegueCutaneoTriceps)
          : null,
        bmi: resultados.bmi ?? null,
        bmiClasificacion: resultados.bmiClasificacion ?? null,
        pesoParaTalla: resultados.pesoParaTalla ?? null,
        pesoParaTallaClasificacion: resultados.pesoParaTallaClasificacion ?? null,
        tallaParaEdad: resultados.tallaParaEdad ?? null,
        tallaParaEdadClasificacion: resultados.tallaParaEdadClasificacion ?? null,
        perimetroCefalicoEsperado: resultados.perimetroCefalicoEsperado ?? null,
        perimetroCefalicoEstado: resultados.perimetroCefalicoEstado ?? null,
        muacClasificacion: resultados.muacClasificacion ?? null,
        pliegueCutaneoEstado: resultados.pliegueCutaneoEstado ?? null,
        evaluacionNutricional: resultados.evaluacionNutricional ?? null,
        colorEvaluacion: resultados.colorEvaluacion ?? null,
      },
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (error) {
    console.error("Error al guardar registro:", error);
    return NextResponse.json(
      { success: false, errores: ["Error interno del servidor"] },
      { status: 500 }
    );
  }
}
