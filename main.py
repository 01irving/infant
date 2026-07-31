"""
Infant - Servidor API de Requerimientos Nutricionales Pediátricos
Evaluación Antropométrica - Capítulo 1.2
Basado en: Pediatric Nutrition in Practice (Koletzko et al., 2015)

Para ejecutar:
  pip install fastapi uvicorn
  python main.py

Endpoints:
  GET  /api               — Health check
  POST /api/calculate     — Calcular requerimientos nutricionales
  GET  /api/records       — Listar registros guardados
  POST /api/records       — Guardar un nuevo registro
  DELETE /api/records/{id} — Eliminar un registro
"""

import math
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================
#  CONFIGURACIÓN
# ============================================================

DB_PATH = Path(__file__).parent / "db" / "custom.db"

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Infant API",
    description="Calculadora de Requerimientos Nutricionales Pediátricos + Evaluación Antropométrica",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
#  BASE DE DATOS — SQLite (compatible con esquema Prisma)
# ============================================================


def init_db():
    """Crea la tabla PatientRecord si no existe (esquema compatible con Prisma)."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS PatientRecord (
                id                       INTEGER PRIMARY KEY AUTOINCREMENT,
                peso                     REAL NOT NULL,
                edadMeses                INTEGER NOT NULL,
                sexo                     TEXT NOT NULL,
                edadGestacional          INTEGER,
                talla                    REAL,
                nivelActividad           TEXT DEFAULT 'moderado',
                tasaMetabolicaBasal      REAL NOT NULL,
                gastoEnergeticoTotal     REAL NOT NULL,
                requerimientoEnergetico  REAL NOT NULL,
                costoEnergiaCrecimiento  REAL NOT NULL,
                requerimientoEnergeticoPorKg REAL NOT NULL,
                requerimientoLiquidos    REAL NOT NULL,
                requerimientoLiquidosPorKg  REAL NOT NULL,
                requerimientoProteinasEAR  REAL NOT NULL,
                requerimientoProteinasRDA   REAL NOT NULL,
                requerimientoProteinasRango TEXT NOT NULL,
                proteinasTotales         REAL NOT NULL,
                requerimientoSodio       REAL NOT NULL,
                requerimientoSodioRango   TEXT NOT NULL,
                requerimientoPotasio      REAL NOT NULL,
                requerimientoPotasioRango  TEXT NOT NULL,
                superficieCorporal       REAL NOT NULL,
                metodoBMR                TEXT NOT NULL,
                metodoTEE                TEXT NOT NULL,
                factorPAL                REAL NOT NULL,
                esPrematuro              INTEGER DEFAULT 0,
                perimetroCefalico        REAL,
                circunferenciaBrazo      INTEGER,
                pliegueCutaneoTriceps    REAL,
                bmi                      REAL,
                bmiClasificacion         TEXT,
                pesoParaTalla            REAL,
                pesoParaTallaClasificacion TEXT,
                tallaParaEdad            REAL,
                tallaParaEdadClasificacion TEXT,
                perimetroCefalicoEsperado REAL,
                perimetroCefalicoEstado   TEXT,
                muacClasificacion        TEXT,
                pliegueCutaneoEstado     TEXT,
                evaluacionNutricional     TEXT,
                colorEvaluacion          TEXT,
                createdAt                TEXT NOT NULL
            )
        """)
        conn.commit()


@contextmanager
def get_db():
    """Context manager para conexiones SQLite."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    """Convierte una fila SQLite a diccionario, parseando tipos correctamente."""
    d = dict(row)
    # Parsear booleanos (SQLite guarda como 0/1)
    if "esPrematuro" in d and d["esPrematuro"] is not None:
        d["esPrematuro"] = bool(d["esPrematuro"])
    # Parsear createdAt a ISO string si viene como texto
    if "createdAt" in d and d["createdAt"] is not None:
        d["createdAt"] = d["createdAt"]
    return d


# ============================================================
#  FUNCIONES DE CÁLCULO — Capítulo 1.2
#  (Extraídas de download/infant_app.py)
# ============================================================

PAL_VALUES = {
    "sedentario": 1.2, "ligero": 1.5, "moderado": 1.7,
    "activo": 1.9, "muy_activo": 2.0,
}


def costo_crecimiento(edad_meses: int) -> float:
    """Costo energético del crecimiento en kcal/día según edad."""
    if edad_meses <= 3:
        return 175
    if edad_meses <= 6:
        return 60
    if edad_meses <= 12:
        return 20
    if edad_meses <= 36:
        return 3
    return 0


def calcular_bmr(peso: float, edad_meses: int, sexo: str) -> tuple[float, str]:
    """Ecuaciones de Schofield por rango de edad y sexo.
    Retorna (BMR en kcal/día, descripción del método)."""
    if edad_meses < 36:
        if sexo == "masculino":
            return 59.5 * peso - 30.4, "Schofield (<3a, M): 59.5*peso - 30.4"
        return 58.3 * peso - 31.1, "Schofield (<3a, F): 58.3*peso - 31.1"
    elif edad_meses < 120:
        if sexo == "masculino":
            return 22.7 * peso + 504.3, "Schofield (3-10a, M): 22.7*peso + 504.3"
        return 20.3 * peso + 485.9, "Schofield (3-10a, F): 20.3*peso + 485.9"
    else:
        if sexo == "masculino":
            return 17.7 * peso + 658.2, "Schofield (10-18a, M): 17.7*peso + 658.2"
        return 13.4 * peso + 692.6, "Schofield (10-18a, F): 13.4*peso + 692.6"


def calcular_tee(peso: float, edad_meses: int, sexo: str) -> tuple[float, str]:
    """TEE - Método DLW (Doubly Labeled Water).
    Retorna (TEE en kcal/día, descripción del método)."""
    if edad_meses <= 24:
        return -99.4 + 88.6 * peso, "TEE infantes (DLW): -99.4 + 88.6*peso"
    w2 = peso * peso
    if sexo == "masculino":
        return 310.2 + 63.3 * peso - 0.263 * w2, "TEE niños (DLW+HR): 310.2 + 63.3*p - 0.263*p^2"
    return 263.4 + 65.3 * peso - 0.454 * w2, "TEE niñas (DLW+HR): 263.4 + 65.3*p - 0.454*p^2"


def calcular_liquidos(peso: float) -> float:
    """Requerimiento de líquidos por método Holliday-Segar (mL/día)."""
    if peso <= 10:
        return peso * 100
    if peso <= 20:
        return 1000 + (peso - 10) * 50
    return 1500 + (peso - 20) * 20


def calcular_proteinas(edad_meses: int, sexo: str, es_prematuro: bool) -> tuple[float, float, str]:
    """EAR, RDA y rango de proteínas en g/kg/día."""
    if es_prematuro:
        return 3.0, 4.0, "3.0 - 4.0 g/kg/día (Prematuro - OMS/FAO/UNU)"
    if edad_meses <= 6:
        return 1.52, 1.52, "1.52 g/kg/día (AI - leche materna)"
    if edad_meses <= 12:
        return 1.0, 1.2, "1.0 - 1.2 g/kg/día (EAR-RDA)"
    if edad_meses <= 36:
        return 0.87, 1.05, "0.87 - 1.05 g/kg/día (EAR-RDA)"
    if edad_meses <= 156:
        return 0.76, 0.95, "0.76 - 0.95 g/kg/día (EAR-RDA)"
    if sexo == "masculino":
        return 0.73, 0.85, "0.73 - 0.85 g/kg/día (EAR-RDA)"
    return 0.71, 0.85, "0.71 - 0.85 g/kg/día (EAR-RDA)"


def calcular_sodio(edad_gestacional: int | None, edad_meses: int) -> tuple[float, str]:
    """Requerimiento de sodio (mEq/kg/día) y rango."""
    if edad_gestacional is not None and edad_gestacional < 37 and edad_meses <= 1:
        return 3.0, "2.0 - 5.0 mEq/kg/día (Prematuro)"
    return 1.5, "1.0 - 2.0 mEq/kg/día"


def calcular_potasio(edad_gestacional: int | None, edad_meses: int) -> tuple[float, str]:
    """Requerimiento de potasio (mEq/kg/día) y rango."""
    if edad_gestacional is not None and edad_gestacional < 37 and edad_meses <= 1:
        return 1.5, "1.0 - 2.0 mEq/kg/día (Prematuro)"
    return 1.5, "1.0 - 2.0 mEq/kg/día"


def calcular_superficie_corporal(
    peso: float, talla_cm: float | None = None, edad_meses: int | None = None
) -> float:
    """Superficie corporal por fórmula de Mosteller (m²)."""
    if talla_cm is None:
        if edad_meses is not None:
            if edad_meses <= 6:
                talla_cm = 50 + edad_meses * 2.5
            elif edad_meses <= 12:
                talla_cm = 65 + (edad_meses - 6) * 1.2
            else:
                talla_cm = 75 + (edad_meses / 12) * 6
        else:
            talla_cm = 55
    return math.sqrt((peso * talla_cm) / 3600)


# --- Cap. 1.2: Crecimiento Normal y Evaluación Antropométrica ---


def velocidad_peso_esperada(edad_meses: int) -> str:
    if edad_meses <= 3:
        return "200 g/semana (0-3 meses)"
    if edad_meses <= 6:
        return "130 g/semana (3-6 meses)"
    if edad_meses <= 9:
        return "85 g/semana (6-9 meses)"
    if edad_meses <= 12:
        return "75 g/semana (9-12 meses)"
    if edad_meses <= 24:
        return "~25 g/semana (duplica al 4m, triplica al 12m)"
    return "Variable por individuo; usar curvas OMS"


def velocidad_talla_esperada(edad_meses: int) -> str:
    if edad_meses <= 12:
        return "25 cm en el primer año (~2 cm/mes)"
    if edad_meses <= 24:
        return "12 cm en el segundo año (~1 cm/mes)"
    if edad_meses <= 132:
        return "5-7 cm/año (crecimiento estable)"
    return "Variable con pubertad; pico ~8-12 cm/año"


def perimetro_cefalico_esperado(edad_meses: int, sexo: str) -> float:
    adulto = 56.5 if sexo == "masculino" else 54.5
    if edad_meses <= 12:
        return 34.5 + edad_meses * 1.0
    if edad_meses <= 24:
        return 46.5 + ((edad_meses - 12) / 12) * 2
    hc2 = 48.5
    if edad_meses <= 216:
        p = min(1, (edad_meses - 24) / (216 - 24))
        return hc2 + (adulto - hc2) * p
    return adulto


def clasificar_perimetro_cefalico(actual: float, esperado: float) -> tuple[str, str]:
    d = ((actual - esperado) / esperado) * 100
    if d < -10:
        return "Bajo (<-2 DE) - Evaluar microcefalia", "red"
    if d < -5:
        return "Ligeramente bajo (-1 a -2 DE)", "yellow"
    if d <= 5:
        return "Normal (±2 DE)", "green"
    if d <= 10:
        return "Ligeramente alto (+1 a +2 DE)", "yellow"
    return "Alto (>+2 DE) - Evaluar macrocefalia", "yellow"


def calcular_bmi(peso: float, talla_cm: float) -> float:
    talla_m = talla_cm / 100
    return round(peso / (talla_m ** 2), 2)


def clasificar_bmi(bmi: float, edad_meses: int) -> tuple[str, str]:
    if edad_meses < 24:
        return f"{bmi} - Usar curvas OMS para <2 años", "yellow"
    if bmi < 18.5:
        return f"{bmi} - Bajo peso", "orange"
    if bmi < 25:
        return f"{bmi} - Normal", "green"
    if bmi < 30:
        return f"{bmi} - Sobrepeso", "yellow"
    return f"{bmi} - Obesidad", "red"


def peso_esperado_para_talla(talla_cm: float, sexo: str) -> float:
    m = sexo == "masculino"
    if talla_cm <= 50:
        return 3.2 if m else 3.1
    if talla_cm <= 60:
        return 5.7 if m else 5.5
    if talla_cm <= 70:
        return 7.8 if m else 7.5
    if talla_cm <= 80:
        return 10.2 if m else 9.8
    if talla_cm <= 90:
        return 12.5 if m else 12.0
    if talla_cm <= 100:
        return 15.5 if m else 15.0
    if talla_cm <= 110:
        return 18.5 if m else 18.0
    if talla_cm <= 120:
        return 22.0 if m else 21.5
    if talla_cm <= 130:
        return 26.5 if m else 26.0
    if talla_cm <= 140:
        return 32.5 if m else 32.0
    if talla_cm <= 150:
        return 40.0 if m else 40.5
    if talla_cm <= 160:
        return 48.5 if m else 49.5
    if talla_cm <= 170:
        return 58.0 if m else 58.0
    if talla_cm <= 180:
        return 67.0 if m else 65.0
    return 72.0 if m else 68.0


def clasificar_peso_talla(pct: float) -> tuple[str, str]:
    if pct > 120:
        return f"{pct}% - Obesidad", "red"
    if pct > 110:
        return f"{pct}% - Sobrepeso", "yellow"
    if pct >= 90:
        return f"{pct}% - Normal", "green"
    if pct >= 80:
        return f"{pct}% - Desnutrición leve", "orange"
    if pct >= 70:
        return f"{pct}% - Desnutrición moderada", "orange"
    return f"{pct}% - Desnutrición severa", "red"


def talla_esperada_para_edad(edad_meses: int, sexo: str) -> float:
    m = sexo == "masculino"
    if edad_meses <= 3:
        return (50 + edad_meses * 3.8) if m else (49.1 + edad_meses * 3.7)
    if edad_meses <= 6:
        return (61.4 + (edad_meses - 3) * 2.7) if m else (60.2 + (edad_meses - 3) * 2.5)
    if edad_meses <= 12:
        return (69.5 + (edad_meses - 6) * 2.1) if m else (67.7 + (edad_meses - 6) * 2.0)
    if edad_meses <= 24:
        return (82.1 + (edad_meses - 12) * 1.0) if m else (79.7 + (edad_meses - 12) * 1.0)
    if edad_meses <= 60:
        return (94.1 + (edad_meses - 24) * 0.6) if m else (91.7 + (edad_meses - 24) * 0.6)
    if edad_meses <= 120:
        return (115.7 + (edad_meses - 60) * 0.55) if m else (114.3 + (edad_meses - 60) * 0.6)
    if edad_meses <= 156:
        return (148.7 + (edad_meses - 120) * 0.65) if m else (149.9 + (edad_meses - 120) * 0.35)
    return 172.1 if m else 162.5


def clasificar_talla_edad(pct: float) -> tuple[str, str]:
    if pct >= 95:
        return f"{pct}% - Normal", "green"
    if pct >= 90:
        return f"{pct}% - Riesgo de talla baja", "yellow"
    if pct >= 85:
        return f"{pct}% - Talla baja (desnutrición crónica leve)", "orange"
    return f"{pct}% - Retardo severo (stunting)", "red"


def clasificar_muac(muac_mm: int, edad_meses: int) -> tuple[str, str]:
    if edad_meses < 6 or edad_meses > 60:
        return f"{muac_mm} mm - Ref: 115-185 mm (6-60 meses)", "yellow"
    if muac_mm < 115:
        return f"{muac_mm} mm - Desnutrición aguda severa (riesgo muerte)", "red"
    if muac_mm < 125:
        return f"{muac_mm} mm - Desnutrición aguda moderada", "orange"
    if muac_mm < 135:
        return f"{muac_mm} mm - Riesgo de desnutrición", "yellow"
    if muac_mm <= 185:
        return f"{muac_mm} mm - Normal", "green"
    return f"{muac_mm} mm - Por encima del rango esperado", "yellow"


def evaluar_pliegue(pliegue_mm: float, edad_meses: int) -> tuple[str, str]:
    if edad_meses <= 6:
        if pliegue_mm < 6:
            return f"{pliegue_mm} mm - Bajo (reservas reducidas)", "orange"
        if pliegue_mm <= 12:
            return f"{pliegue_mm} mm - Normal para lactante", "green"
        return f"{pliegue_mm} mm - Alto", "yellow"
    if edad_meses <= 60:
        if pliegue_mm < 7:
            return f"{pliegue_mm} mm - Bajo (wasting probable)", "orange"
        if pliegue_mm <= 12:
            return f"{pliegue_mm} mm - Normal", "green"
        if pliegue_mm <= 18:
            return f"{pliegue_mm} mm - Elevado", "yellow"
        return f"{pliegue_mm} mm - Alto (sobrepeso probable)", "yellow"
    if pliegue_mm < 8:
        return f"{pliegue_mm} mm - Bajo", "orange"
    if pliegue_mm <= 15:
        return f"{pliegue_mm} mm - Normal", "green"
    if pliegue_mm <= 22:
        return f"{pliegue_mm} mm - Elevado", "yellow"
    return f"{pliegue_mm} mm - Alto (obesidad probable)", "red"


def evaluacion_global(
    pt_cl: str, te_cl: str, bmi_cl: str, muac_cl: str
) -> tuple[str, str]:
    """Evaluación nutricional global combinada."""
    severo = sum(
        1 for s in [pt_cl, te_cl, bmi_cl, muac_cl] if "sever" in s.lower()
    )
    moderado = sum(
        1 for s in [pt_cl, te_cl, bmi_cl, muac_cl] if "moderad" in s.lower()
    )
    leve = sum(
        1 for s in [pt_cl, te_cl, bmi_cl, muac_cl]
        if "leve" in s.lower() or "riesgo" in s.lower()
    )
    if severo > 0:
        return "Desnutrición severa - Intervención urgente requerida", "red"
    if moderado > 0:
        return "Desnutrición moderada - Requiere intervención nutricional", "orange"
    if leve > 0:
        return "Riesgo nutricional - Monitoreo y seguimiento recomendado", "yellow"
    if "Sobrepeso" in bmi_cl or "Obesidad" in bmi_cl:
        return "Exceso de peso - Evaluación dietética recomendada", "yellow"
    return "Estado nutricional normal - Continuar monitoreo regular", "green"


# ============================================================
#  FUNCIÓN PRINCIPAL DE CÁLCULO
# ============================================================


def calcular_todo(
    peso: float,
    edad_meses: int,
    sexo: str,
    edad_gestacional: int | None = None,
    talla: float | None = None,
    nivel_actividad: str = "moderado",
    perimetro_cefalico: float | None = None,
    circunferencia_brazo: int | None = None,
    pliegue_cutaneo: float | None = None,
) -> dict:
    """Ejecuta todos los cálculos nutricionales y antropométricos.
    Retorna un diccionario con todos los resultados."""

    pal = PAL_VALUES.get(nivel_actividad, 1.7)
    es_prematuro = (
        edad_gestacional is not None
        and edad_gestacional < 37
        and edad_meses <= 1
    )

    # --- Cálculos base ---
    bmr, metodo_bmr = calcular_bmr(peso, edad_meses, sexo)
    tee, metodo_tee = calcular_tee(peso, edad_meses, sexo)
    crecimiento = costo_crecimiento(edad_meses)
    req_energetico = bmr * pal + crecimiento
    liquidos = calcular_liquidos(peso)
    p_ear, p_rda, p_rango = calcular_proteinas(edad_meses, sexo, es_prematuro)
    sodio_val, sodio_rango = calcular_sodio(edad_gestacional, edad_meses)
    potasio_val, potasio_rango = calcular_potasio(edad_gestacional, edad_meses)
    sc = calcular_superficie_corporal(peso, talla, edad_meses)

    r = {
        # Requerimientos nutricionales
        "tasaMetabolicaBasal": round(bmr, 1),
        "gastoEnergeticoTotal": round(tee, 1),
        "requerimientoEnergetico": round(req_energetico, 1),
        "requerimientoEnergeticoPorKg": round(req_energetico / peso, 1),
        "costoEnergiaCrecimiento": round(crecimiento, 1),
        "requerimientoLiquidos": round(liquidos, 1),
        "requerimientoLiquidosPorKg": round(liquidos / peso, 1),
        "requerimientoProteinasEAR": p_ear,
        "requerimientoProteinasRDA": p_rda,
        "requerimientoProteinasRango": p_rango,
        "proteinasTotales": round(p_rda * peso, 1),
        "requerimientoSodio": sodio_val,
        "requerimientoSodioRango": sodio_rango,
        "requerimientoPotasio": potasio_val,
        "requerimientoPotasioRango": potasio_rango,
        "superficieCorporal": round(sc, 3),
        "metodoBMR": metodo_bmr,
        "metodoTEE": metodo_tee,
        "factorPAL": pal,
        "esPrematuro": es_prematuro,
        # Crecimiento normal
        "velocidadPesoEsperada": velocidad_peso_esperada(edad_meses),
        "velocidadTallaEsperada": velocidad_talla_esperada(edad_meses),
    }

    # --- Antropometría condicional ---
    if talla:
        bmi = calcular_bmi(peso, talla)
        bmi_cl, bmi_color = clasificar_bmi(bmi, edad_meses)
        pt_pct = round((peso / peso_esperado_para_talla(talla, sexo)) * 100)
        pt_cl, pt_color = clasificar_peso_talla(pt_pct)
        te_pct = round((talla / talla_esperada_para_edad(edad_meses, sexo)) * 100)
        te_cl, te_color = clasificar_talla_edad(te_pct)

        r["bmi"] = bmi
        r["bmiClasificacion"] = bmi_cl
        r["pesoParaTalla"] = pt_pct
        r["pesoParaTallaClasificacion"] = pt_cl
        r["tallaParaEdad"] = te_pct
        r["tallaParaEdadClasificacion"] = te_cl

    if edad_meses <= 24 and perimetro_cefalico:
        pc_esp = perimetro_cefalico_esperado(edad_meses, sexo)
        pc_cl, pc_color = clasificar_perimetro_cefalico(perimetro_cefalico, pc_esp)
        r["perimetroCefalicoEsperado"] = round(pc_esp, 1)
        r["perimetroCefalicoEstado"] = pc_cl

    if circunferencia_brazo is not None:
        muac_cl, muac_color = clasificar_muac(circunferencia_brazo, edad_meses)
        r["muacClasificacion"] = muac_cl

    if pliegue_cutaneo is not None:
        pct_cl, pct_color = evaluar_pliegue(pliegue_cutaneo, edad_meses)
        r["pliegueCutaneoEstado"] = pct_cl

    # --- Evaluación nutricional global ---
    all_clases = [
        r.get("pesoParaTallaClasificacion", ""),
        r.get("tallaParaEdadClasificacion", ""),
        r.get("bmiClasificacion", ""),
        r.get("muacClasificacion", ""),
    ]
    if all(c for c in all_clases):
        ev, ev_color = evaluacion_global(*all_clases)
        r["evaluacionNutricional"] = ev
        r["colorEvaluacion"] = ev_color

    return r


# ============================================================
#  MODELOS PYDANTIC
# ============================================================


class CalculateRequest(BaseModel):
    """Schema para la solicitud de cálculo."""
    peso: float = Field(..., gt=0, le=120, description="Peso en kg")
    edadMeses: int = Field(..., ge=0, le=216, description="Edad en meses (0-216)")
    sexo: str = Field(..., pattern="^(masculino|femenino)$")
    edadGestacional: int | None = Field(None, ge=22, le=44)
    talla: float | None = Field(None, ge=20, le=200)
    nivelActividad: str = Field("moderado", pattern="^(sedentario|ligero|moderado|activo|muy_activo)$")
    perimetroCefalico: float | None = Field(None, ge=20, le=65)
    circunferenciaBrazo: int | None = Field(None, ge=50, le=250)
    pliegueCutaneoTriceps: float | None = Field(None, ge=2, le=40)


class SaveRecordRequest(BaseModel):
    """Schema para guardar un registro de paciente con resultados."""
    peso: float
    edadMeses: int
    sexo: str
    edadGestacional: int | None = None
    talla: float | None = None
    nivelActividad: str = "moderado"
    tasaMetabolicaBasal: float
    gastoEnergeticoTotal: float
    requerimientoEnergetico: float
    costoEnergiaCrecimiento: float
    requerimientoEnergeticoPorKg: float
    requerimientoLiquidos: float
    requerimientoLiquidosPorKg: float
    requerimientoProteinasEAR: float
    requerimientoProteinasRDA: float
    requerimientoProteinasRango: str
    proteinasTotales: float
    requerimientoSodio: float
    requerimientoSodioRango: str
    requerimientoPotasio: float
    requerimientoPotasioRango: str
    superficieCorporal: float
    metodoBMR: str
    metodoTEE: str
    factorPAL: float
    esPrematuro: bool = False
    perimetroCefalico: float | None = None
    circunferenciaBrazo: int | None = None
    pliegueCutaneoTriceps: float | None = None
    bmi: float | None = None
    bmiClasificacion: str | None = None
    pesoParaTalla: float | None = None
    pesoParaTallaClasificacion: str | None = None
    tallaParaEdad: float | None = None
    tallaParaEdadClasificacion: str | None = None
    perimetroCefalicoEsperado: float | None = None
    perimetroCefalicoEstado: str | None = None
    muacClasificacion: str | None = None
    pliegueCutaneoEstado: str | None = None
    evaluacionNutricional: str | None = None
    colorEvaluacion: str | None = None


# ============================================================
#  ENDPOINTS
# ============================================================


@app.get("/api")
async def health_check():
    """Health check del servicio."""
    return {"message": "Hello, world!"}


@app.post("/api/calculate")
async def calculate(req: CalculateRequest):
    """Calcula todos los requerimientos nutricionales y evaluación antropométrica.

    Recibe los datos del paciente y retorna los resultados completos
    de requerimientos energéticos, proteicos, de líquidos, electrolitos,
    superficie corporal y evaluación antropométrica cuando aplique.
    """
    resultados = calcular_todo(
        peso=req.peso,
        edad_meses=req.edadMeses,
        sexo=req.sexo,
        edad_gestacional=req.edadGestacional,
        talla=req.talla,
        nivel_actividad=req.nivelActividad,
        perimetro_cefalico=req.perimetroCefalico,
        circunferencia_brazo=req.circunferenciaBrazo,
        pliegue_cutaneo=req.pliegueCutaneoTriceps,
    )
    return resultados


@app.get("/api/records")
async def list_records():
    """Lista todos los registros de pacientes guardados, ordenados por fecha descendente."""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM PatientRecord ORDER BY id DESC"
        )
        rows = cursor.fetchall()
    return [row_to_dict(row) for row in rows]


@app.post("/api/records")
async def save_record(req: SaveRecordRequest):
    """Guarda un nuevo registro de paciente con los resultados del cálculo.

    También es posible usar POST /api/calculate-and-save para calcular y
    guardar en un solo paso.
    """
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO PatientRecord (
                peso, edadMeses, sexo, edadGestacional, talla, nivelActividad,
                tasaMetabolicaBasal, gastoEnergeticoTotal, requerimientoEnergetico,
                costoEnergiaCrecimiento, requerimientoEnergeticoPorKg,
                requerimientoLiquidos, requerimientoLiquidosPorKg,
                requerimientoProteinasEAR, requerimientoProteinasRDA, requerimientoProteinasRango,
                proteinasTotales, requerimientoSodio, requerimientoSodioRango,
                requerimientoPotasio, requerimientoPotasioRango, superficieCorporal,
                metodoBMR, metodoTEE, factorPAL, esPrematuro,
                perimetroCefalico, circunferenciaBrazo, pliegueCutaneoTriceps,
                bmi, bmiClasificacion, pesoParaTalla, pesoParaTallaClasificacion,
                tallaParaEdad, tallaParaEdadClasificacion,
                perimetroCefalicoEsperado, perimetroCefalicoEstado,
                muacClasificacion, pliegueCutaneoEstado,
                evaluacionNutricional, colorEvaluacion, createdAt
            ) VALUES (
                :peso, :edadMeses, :sexo, :edadGestacional, :talla, :nivelActividad,
                :tasaMetabolicaBasal, :gastoEnergeticoTotal, :requerimientoEnergetico,
                :costoEnergiaCrecimiento, :requerimientoEnergeticoPorKg,
                :requerimientoLiquidos, :requerimientoLiquidosPorKg,
                :requerimientoProteinasEAR, :requerimientoProteinasRDA, :requerimientoProteinasRango,
                :proteinasTotales, :requerimientoSodio, :requerimientoSodioRango,
                :requerimientoPotasio, :requerimientoPotasioRango, :superficieCorporal,
                :metodoBMR, :metodoTEE, :factorPAL, :esPrematuro,
                :perimetroCefalico, :circunferenciaBrazo, :pliegueCutaneoTriceps,
                :bmi, :bmiClasificacion, :pesoParaTalla, :pesoParaTallaClasificacion,
                :tallaParaEdad, :tallaParaEdadClasificacion,
                :perimetroCefalicoEsperado, :perimetroCefalicoEstado,
                :muacClasificacion, :pliegueCutaneoEstado,
                :evaluacionNutricional, :colorEvaluacion, :createdAt
            )
        """, {
            **req.model_dump(),
            "esPrematuro": int(req.esPrematuro),
            "createdAt": now,
        })
        conn.commit()
        record_id = cursor.lastrowid
    return {"id": record_id, "message": "Registro guardado exitosamente"}


@app.post("/api/calculate-and-save")
async def calculate_and_save(req: CalculateRequest):
    """Calcula los requerimientos nutricionales y guarda el registro en un solo paso.

    Combina la lógica de /api/calculate y /api/records para evitar
    tener que hacer dos llamadas separadas.
    """
    resultados = calcular_todo(
        peso=req.peso,
        edad_meses=req.edadMeses,
        sexo=req.sexo,
        edad_gestacional=req.edadGestacional,
        talla=req.talla,
        nivel_actividad=req.nivelActividad,
        perimetro_cefalico=req.perimetroCefalico,
        circunferencia_brazo=req.circunferenciaBrazo,
        pliegue_cutaneo=req.pliegueCutaneoTriceps,
    )

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "peso": req.peso,
        "edadMeses": req.edadMeses,
        "sexo": req.sexo,
        "edadGestacional": req.edadGestacional,
        "talla": req.talla,
        "nivelActividad": req.nivelActividad,
        "perimetroCefalico": req.perimetroCefalico,
        "circunferenciaBrazo": req.circunferenciaBrazo,
        "pliegueCutaneoTriceps": req.pliegueCutaneoTriceps,
        # Resultados de cálculos nutricionales (siempre presentes)
        "tasaMetabolicaBasal": resultados["tasaMetabolicaBasal"],
        "gastoEnergeticoTotal": resultados["gastoEnergeticoTotal"],
        "requerimientoEnergetico": resultados["requerimientoEnergetico"],
        "costoEnergiaCrecimiento": resultados["costoEnergiaCrecimiento"],
        "requerimientoEnergeticoPorKg": resultados["requerimientoEnergeticoPorKg"],
        "requerimientoLiquidos": resultados["requerimientoLiquidos"],
        "requerimientoLiquidosPorKg": resultados["requerimientoLiquidosPorKg"],
        "requerimientoProteinasEAR": resultados["requerimientoProteinasEAR"],
        "requerimientoProteinasRDA": resultados["requerimientoProteinasRDA"],
        "requerimientoProteinasRango": resultados["requerimientoProteinasRango"],
        "proteinasTotales": resultados["proteinasTotales"],
        "requerimientoSodio": resultados["requerimientoSodio"],
        "requerimientoSodioRango": resultados["requerimientoSodioRango"],
        "requerimientoPotasio": resultados["requerimientoPotasio"],
        "requerimientoPotasioRango": resultados["requerimientoPotasioRango"],
        "superficieCorporal": resultados["superficieCorporal"],
        "metodoBMR": resultados["metodoBMR"],
        "metodoTEE": resultados["metodoTEE"],
        "factorPAL": resultados["factorPAL"],
        "esPrematuro": int(resultados["esPrematuro"]),
        # Antropometría opcional (puede ser None)
        "bmi": resultados.get("bmi"),
        "bmiClasificacion": resultados.get("bmiClasificacion"),
        "pesoParaTalla": resultados.get("pesoParaTalla"),
        "pesoParaTallaClasificacion": resultados.get("pesoParaTallaClasificacion"),
        "tallaParaEdad": resultados.get("tallaParaEdad"),
        "tallaParaEdadClasificacion": resultados.get("tallaParaEdadClasificacion"),
        "perimetroCefalicoEsperado": resultados.get("perimetroCefalicoEsperado"),
        "perimetroCefalicoEstado": resultados.get("perimetroCefalicoEstado"),
        "muacClasificacion": resultados.get("muacClasificacion"),
        "pliegueCutaneoEstado": resultados.get("pliegueCutaneoEstado"),
        "evaluacionNutricional": resultados.get("evaluacionNutricional"),
        "colorEvaluacion": resultados.get("colorEvaluacion"),
        "createdAt": now,
    }

    with get_db() as conn:
        cols = list(row.keys())
        vals = list(row.values())
        placeholders = ", ".join(f":{c}" for c in cols)
        columns = ", ".join(cols)
        cursor = conn.execute(
            f"INSERT INTO PatientRecord ({columns}) VALUES ({placeholders})",
            row,
        )
        conn.commit()
        record_id = cursor.lastrowid

    return {
        "id": record_id,
        "message": "Registro calculado y guardado exitosamente",
        "resultados": resultados,
    }


@app.delete("/api/records/{record_id}")
async def delete_record(record_id: int):
    """Elimina un registro de paciente por su ID."""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id FROM PatientRecord WHERE id = ?", (record_id,)
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        conn.execute(
            "DELETE FROM PatientRecord WHERE id = ?", (record_id,)
        )
        conn.commit()
    return {"message": f"Registro {record_id} eliminado"}


# ============================================================
#  ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    print("Infant API v2.1.0")
    print("Calculadora de Requerimientos Nutricionales Pediátricos")
    print("Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
