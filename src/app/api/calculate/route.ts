import { NextRequest, NextResponse } from "next/server";
import { calcularRequerimientos, validarDatos, PatientData } from "@/lib/calculations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data: PatientData = {
      peso: parseFloat(body.peso),
      edadMeses: parseInt(body.edadMeses),
      sexo: body.sexo,
      edadGestacional: body.edadGestacional
        ? parseInt(body.edadGestacional)
        : undefined,
      talla: body.talla ? parseFloat(body.talla) : undefined,
      nivelActividad: body.nivelActividad || "moderado",
      perimetroCefalico: body.perimetroCefalico
        ? parseFloat(body.perimetroCefalico)
        : undefined,
      circunferenciaBrazo: body.circunferenciaBrazo
        ? parseInt(body.circunferenciaBrazo)
        : undefined,
      pliegueCutaneoTriceps: body.pliegueCutaneoTriceps
        ? parseFloat(body.pliegueCutaneoTriceps)
        : undefined,
    };

    const validacion = validarDatos(data);
    if (!validacion.valido) {
      return NextResponse.json(
        { success: false, errores: validacion.errores },
        { status: 400 }
      );
    }

    const resultados = calcularRequerimientos(data);
    return NextResponse.json({
      success: true,
      data: { input: data, resultados },
    });
  } catch (error) {
    console.error("Error al calcular:", error);
    return NextResponse.json(
      { success: false, errores: ["Error interno del servidor"] },
      { status: 500 }
    );
  }
}
