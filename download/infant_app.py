"""
Infant - Calculadora de Requerimientos Nutricionales Pediátricos
Evaluación Antropométrica - Capítulo 1.2
Basado en: Pediatric Nutrition in Practice (Koletzko et al., 2015)

Para ejecutar:
  pip install streamlit
  streamlit run infant_app.py

O en Google Colab:
  !pip install streamlit
  !streamlit run infant_app.py &>/dev/null &
  # Luego abrir el enlace localtunnel que aparece
"""

import streamlit as st
import math

# ============================================================
#  CONFIGURACIÓN DE PÁGINA
# ============================================================
st.set_page_config(
    page_title="Infant - Calculadora Pediátrica",
    page_icon="👶",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============================================================
#  CSS PERSONALIZADO
# ============================================================
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%);
        padding: 1.5rem 2rem;
        border-radius: 12px;
        color: white;
        margin-bottom: 1.5rem;
    }
    .main-header h1 { margin: 0; font-size: 1.8rem; }
    .main-header p { margin: 0.3rem 0 0; opacity: 0.9; font-size: 0.9rem; }
    .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.2rem;
        margin-bottom: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .card-green { border-left: 4px solid #10b981; background: #f0fdf4; }
    .card-yellow { border-left: 4px solid #f59e0b; background: #fffbeb; }
    .card-orange { border-left: 4px solid #f97316; background: #fff7ed; }
    .card-red { border-left: 4px solid #ef4444; background: #fef2f2; }
    .card-violet { border-left: 4px solid #8b5cf6; background: #f5f3ff; }
    .card-teal { border-left: 4px solid #14b8a6; background: #f0fdfa; }
    .metric-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid #f3f4f6;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-icon {
        width: 36px; height: 36px;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem; flex-shrink: 0;
    }
    .metric-label { font-size: 0.75rem; color: #6b7280; margin: 0; }
    .metric-value { font-size: 0.9rem; font-weight: 600; margin: 0.15rem 0; }
    .metric-detail { font-size: 0.7rem; color: #9ca3af; margin: 0; }
    .badge {
        display: inline-block;
        padding: 0.15rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
    }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-orange { background: #ffedd5; color: #9a3412; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .section-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.3rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .section-desc {
        font-size: 0.75rem;
        color: #6b7280;
        margin: 0 0 0.8rem;
    }
    table.history-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
    }
    table.history-table th {
        background: #f9fafb;
        padding: 0.5rem;
        text-align: left;
        border-bottom: 2px solid #e5e7eb;
        font-weight: 600;
        color: #374151;
    }
    table.history-table td {
        padding: 0.5rem;
        border-bottom: 1px solid #f3f4f6;
        color: #4b5563;
    }
    .footer {
        text-align: center;
        font-size: 0.7rem;
        color: #9ca3af;
        padding: 1rem;
        border-top: 1px solid #f3f4f6;
        margin-top: 2rem;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================
#  FUNCIONES DE CÁLCULO - Capítulo 1.2
# ============================================================

def costo_crecimiento(edad_meses):
    if edad_meses <= 3: return 175
    if edad_meses <= 6: return 60
    if edad_meses <= 12: return 20
    if edad_meses <= 36: return 3
    return 0

def calcular_bmr(peso, edad_meses, sexo):
    """Ecuaciones de Schofield por rango de edad y sexo"""
    if edad_meses < 36:
        if sexo == "masculino":
            return 59.5 * peso - 30.4, "Schofield (<3 años, M): 59.5×peso - 30.4"
        return 58.3 * peso - 31.1, "Schofield (<3 años, F): 58.3×peso - 31.1"
    elif edad_meses < 120:
        if sexo == "masculino":
            return 22.7 * peso + 504.3, "Schofield (3-10 años, M): 22.7×peso + 504.3"
        return 20.3 * peso + 485.9, "Schofield (3-10 años, F): 20.3×peso + 485.9"
    else:
        if sexo == "masculino":
            return 17.7 * peso + 658.2, "Schofield (10-18 años, M): 17.7×peso + 658.2"
        return 13.4 * peso + 692.6, "Schofield (10-18 años, F): 13.4×peso + 692.6"

def calcular_tee(peso, edad_meses, sexo):
    """TEE - Método DLW (Doubly Labeled Water)"""
    if edad_meses <= 24:
        return -99.4 + 88.6 * peso, "TEE infantes (DLW): -99.4 + 88.6×peso"
    w2 = peso * peso
    if sexo == "masculino":
        return 310.2 + 63.3 * peso - 0.263 * w2, "TEE niños (DLW+HR): 310.2 + 63.3×p - 0.263×p²"
    return 263.4 + 65.3 * peso - 0.454 * w2, "TEE niñas (DLW+HR): 263.4 + 65.3×p - 0.454×p²"

PAL_VALUES = {
    "sedentario": 1.2, "ligero": 1.5, "moderado": 1.7,
    "activo": 1.9, "muy_activo": 2.0
}

def calcular_liquidos(peso):
    """Holliday-Segar por peso"""
    if peso <= 10: return peso * 100
    if peso <= 20: return 1000 + (peso - 10) * 50
    return 1500 + (peso - 20) * 20

def calcular_proteinas(edad_meses, sexo, es_prematuro):
    """EAR/RDA por rangos de edad"""
    if es_prematuro:
        return 3.0, 4.0, "3.0 - 4.0 g/kg/día (Prematuro - OMS/FAO/UNU)"
    if edad_meses <= 6: return 1.52, 1.52, "1.52 g/kg/día (AI - leche materna)"
    if edad_meses <= 12: return 1.0, 1.2, "1.0 - 1.2 g/kg/día (EAR-RDA)"
    if edad_meses <= 36: return 0.87, 1.05, "0.87 - 1.05 g/kg/día (EAR-RDA)"
    if edad_meses <= 156: return 0.76, 0.95, "0.76 - 0.95 g/kg/día (EAR-RDA)"
    if sexo == "masculino": return 0.73, 0.85, "0.73 - 0.85 g/kg/día (EAR-RDA)"
    return 0.71, 0.85, "0.71 - 0.85 g/kg/día (EAR-RDA)"

def calcular_sodio(edad_gestacional, edad_meses):
    if edad_gestacional is not None and edad_gestacional < 37 and edad_meses <= 1:
        return 3.0, "2.0 - 5.0 mEq/kg/día (Prematuro)"
    return 1.5, "1.0 - 2.0 mEq/kg/día"

def calcular_potasio(edad_gestacional, edad_meses):
    if edad_gestacional is not None and edad_gestacional < 37 and edad_meses <= 1:
        return 1.5, "1.0 - 2.0 mEq/kg/día (Prematuro)"
    return 1.5, "1.0 - 2.0 mEq/kg/día"

def calcular_superficie_corporal(peso, talla_cm=None, edad_meses=None):
    """Fórmula de Mosteller"""
    if talla_cm is None:
        if edad_meses is not None:
            if edad_meses <= 6: talla_cm = 50 + edad_meses * 2.5
            elif edad_meses <= 12: talla_cm = 65 + (edad_meses - 6) * 1.2
            else: talla_cm = 75 + (edad_meses / 12) * 6
        else:
            talla_cm = 55
    return math.sqrt((peso * talla_cm) / 3600)

# --- Cap. 1.2: Crecimiento Normal ---

def velocidad_peso_esperada(edad_meses):
    if edad_meses <= 3: return "200 g/semana (0-3 meses)"
    if edad_meses <= 6: return "130 g/semana (3-6 meses)"
    if edad_meses <= 9: return "85 g/semana (6-9 meses)"
    if edad_meses <= 12: return "75 g/semana (9-12 meses)"
    if edad_meses <= 24: return "~25 g/semana (duplica al 4m, triplica al 12m)"
    return "Variable por individuo; usar curvas OMS"

def velocidad_talla_esperada(edad_meses):
    if edad_meses <= 12: return "25 cm en el primer año (~2 cm/mes)"
    if edad_meses <= 24: return "12 cm en el segundo año (~1 cm/mes)"
    if edad_meses <= 132: return "5-7 cm/año (crecimiento estable)"
    return "Variable con pubertad; pico ~8-12 cm/año"

def perimetro_cefalico_esperado(edad_meses, sexo):
    adulto = 56.5 if sexo == "masculino" else 54.5
    if edad_meses <= 12: return 34.5 + edad_meses * 1.0
    if edad_meses <= 24: return 46.5 + ((edad_meses - 12) / 12) * 2
    hc2 = 48.5
    if edad_meses <= 216:
        p = min(1, (edad_meses - 24) / (216 - 24))
        return hc2 + (adulto - hc2) * p
    return adulto

def clasificar_perimetro_cefalico(actual, esperado):
    d = ((actual - esperado) / esperado) * 100
    if d < -10: return "Bajo (<-2 DE) - Evaluar microcefalia", "red"
    if d < -5: return "Ligeramente bajo (-1 a -2 DE)", "yellow"
    if d <= 5: return "Normal (±2 DE)", "green"
    if d <= 10: return "Ligeramente alto (+1 a +2 DE)", "yellow"
    return "Alto (>+2 DE) - Evaluar macrocefalia", "yellow"

def calcular_bmi(peso, talla_cm):
    talla_m = talla_cm / 100
    return round(peso / (talla_m ** 2), 2)

def clasificar_bmi(bmi, edad_meses):
    if edad_meses < 24:
        return f"{bmi} - Usar curvas OMS para <2 años", "yellow"
    if bmi < 18.5: return f"{bmi} - Bajo peso", "orange"
    if bmi < 25: return f"{bmi} - Normal", "green"
    if bmi < 30: return f"{bmi} - Sobrepeso", "yellow"
    return f"{bmi} - Obesidad", "red"

def peso_esperado_para_talla(talla_cm, sexo):
    m = sexo == "masculino"
    if talla_cm <= 50: return 3.2 if m else 3.1
    if talla_cm <= 60: return 5.7 if m else 5.5
    if talla_cm <= 70: return 7.8 if m else 7.5
    if talla_cm <= 80: return 10.2 if m else 9.8
    if talla_cm <= 90: return 12.5 if m else 12.0
    if talla_cm <= 100: return 15.5 if m else 15.0
    if talla_cm <= 110: return 18.5 if m else 18.0
    if talla_cm <= 120: return 22.0 if m else 21.5
    if talla_cm <= 130: return 26.5 if m else 26.0
    if talla_cm <= 140: return 32.5 if m else 32.0
    if talla_cm <= 150: return 40.0 if m else 40.5
    if talla_cm <= 160: return 48.5 if m else 49.5
    if talla_cm <= 170: return 58.0 if m else 58.0
    if talla_cm <= 180: return 67.0 if m else 65.0
    return 72.0 if m else 68.0

def clasificar_peso_talla(pct):
    if pct > 120: return f"{pct}% - Obesidad", "red"
    if pct > 110: return f"{pct}% - Sobrepeso", "yellow"
    if pct >= 90: return f"{pct}% - Normal", "green"
    if pct >= 80: return f"{pct}% - Desnutrición leve", "orange"
    if pct >= 70: return f"{pct}% - Desnutrición moderada", "orange"
    return f"{pct}% - Desnutrición severa", "red"

def talla_esperada_para_edad(edad_meses, sexo):
    m = sexo == "masculino"
    if edad_meses <= 3: return (50 + edad_meses * 3.8) if m else (49.1 + edad_meses * 3.7)
    if edad_meses <= 6: return (61.4 + (edad_meses - 3) * 2.7) if m else (60.2 + (edad_meses - 3) * 2.5)
    if edad_meses <= 12: return (69.5 + (edad_meses - 6) * 2.1) if m else (67.7 + (edad_meses - 6) * 2.0)
    if edad_meses <= 24: return (82.1 + (edad_meses - 12) * 1.0) if m else (79.7 + (edad_meses - 12) * 1.0)
    if edad_meses <= 60: return (94.1 + (edad_meses - 24) * 0.6) if m else (91.7 + (edad_meses - 24) * 0.6)
    if edad_meses <= 120: return (115.7 + (edad_meses - 60) * 0.55) if m else (114.3 + (edad_meses - 60) * 0.6)
    if edad_meses <= 156: return (148.7 + (edad_meses - 120) * 0.65) if m else (149.9 + (edad_meses - 120) * 0.35)
    return 172.1 if m else 162.5

def clasificar_talla_edad(pct):
    if pct >= 95: return f"{pct}% - Normal", "green"
    if pct >= 90: return f"{pct}% - Riesgo de talla baja", "yellow"
    if pct >= 85: return f"{pct}% - Talla baja (desnutrición crónica leve)", "orange"
    return f"{pct}% - Retardo severo (stunting)", "red"

def clasificar_muac(muac_mm, edad_meses):
    if edad_meses < 6 or edad_meses > 60:
        return f"{muac_mm} mm - Ref: 115-185 mm (6-60 meses)", "yellow"
    if muac_mm < 115: return f"{muac_mm} mm - Desnutrición aguda severa (riesgo muerte)", "red"
    if muac_mm < 125: return f"{muac_mm} mm - Desnutrición aguda moderada", "orange"
    if muac_mm < 135: return f"{muac_mm} mm - Riesgo de desnutrición", "yellow"
    if muac_mm <= 185: return f"{muac_mm} mm - Normal", "green"
    return f"{muac_mm} mm - Por encima del rango esperado", "yellow"

def evaluar_pliegue(pliegue_mm, edad_meses):
    if edad_meses <= 6:
        if pliegue_mm < 6: return f"{pliegue_mm} mm - Bajo (reservas reducidas)", "orange"
        if pliegue_mm <= 12: return f"{pliegue_mm} mm - Normal para lactante", "green"
        return f"{pliegue_mm} mm - Alto", "yellow"
    if edad_meses <= 60:
        if pliegue_mm < 7: return f"{pliegue_mm} mm - Bajo (wasting probable)", "orange"
        if pliegue_mm <= 12: return f"{pliegue_mm} mm - Normal", "green"
        if pliegue_mm <= 18: return f"{pliegue_mm} mm - Elevado", "yellow"
        return f"{pliegue_mm} mm - Alto (sobrepeso probable)", "yellow"
    if pliegue_mm < 8: return f"{pliegue_mm} mm - Bajo", "orange"
    if pliegue_mm <= 15: return f"{pliegue_mm} mm - Normal", "green"
    if pliegue_mm <= 22: return f"{pliegue_mm} mm - Elevado", "yellow"
    return f"{pliegue_mm} mm - Alto (obesidad probable)", "red"

def evaluacion_global(pt_class, te_class, bmi_class, muac_class):
    severo = sum(1 for s in [pt_class, te_class, bmi_class, muac_class] if "sever" in s.lower())
    moderado = sum(1 for s in [pt_class, te_class, bmi_class, muac_class] if "moderad" in s.lower())
    leve = sum(1 for s in [pt_class, te_class, bmi_class, muac_class] if "leve" in s.lower() or "riesgo" in s.lower())
    if severo > 0:
        return "Desnutrición severa - Intervención urgente requerida", "red"
    if moderado > 0:
        return "Desnutrición moderada - Requiere intervención nutricional", "orange"
    if leve > 0:
        return "Riesgo nutricional - Monitoreo y seguimiento recomendado", "yellow"
    if "Sobrepeso" in bmi_class or "Obesidad" in bmi_class:
        return "Exceso de peso - Evaluación dietética recomendada", "yellow"
    return "Estado nutricional normal - Continuar monitoreo regular", "green"

# ============================================================
#  FUNCIÓN PRINCIPAL DE CÁLCULO
# ============================================================

def calcular_todo(peso, edad_meses, sexo, edad_gestacional=None, talla=None,
                   nivel_actividad="moderado", perimetro_cefalico=None,
                   circunferencia_brazo=None, pliegue_cutaneo=None):
    pal = PAL_VALUES.get(nivel_actividad, 1.7)
    es_prematuro = edad_gestacional is not None and edad_gestacional < 37 and edad_meses <= 1

    bmr, metodo_bmr = calcular_bmr(peso, edad_meses, sexo)
    tee, metodo_tee = calcular_tee(peso, edad_meses, sexo)
    req_energetico = bmr * pal + costo_crecimiento(edad_meses)
    crecimiento = costo_crecimiento(edad_meses)
    liquidos = calcular_liquidos(peso)
    p_ear, p_rda, p_rango = calcular_proteinas(edad_meses, sexo, es_prematuro)
    sodio_val, sodio_rango = calcular_sodio(edad_gestacional, edad_meses)
    potasio_val, potasio_rango = calcular_potasio(edad_gestacional, edad_meses)
    sc = calcular_superficie_corporal(peso, talla, edad_meses)

    r = {
        "bmr": round(bmr, 1), "metodo_bmr": metodo_bmr,
        "tee": round(tee, 1), "metodo_tee": metodo_tee,
        "req_energetico": round(req_energetico, 1),
        "req_energetico_kg": round(req_energetico / peso, 1),
        "crecimiento": round(crecimiento, 1),
        "liquidos": round(liquidos, 1),
        "liquidos_kg": round(liquidos / peso, 1),
        "p_ear": p_ear, "p_rda": p_rda, "p_rango": p_rango,
        "p_total": round(p_rda * peso, 1),
        "sodio_val": sodio_val, "sodio_rango": sodio_rango,
        "potasio_val": potasio_val, "potasio_rango": potasio_rango,
        "sc": round(sc, 3), "pal": pal, "es_prematuro": es_prematuro,
    }

    # Cap. 1.2 - Antropometría
    r["vel_peso"] = velocidad_peso_esperada(edad_meses)
    r["vel_talla"] = velocidad_talla_esperada(edad_meses)

    if talla:
        bmi = calcular_bmi(peso, talla)
        bmi_cl, bmi_color = clasificar_bmi(bmi, edad_meses)
        pt_pct = round((peso / peso_esperado_para_talla(talla, sexo)) * 100)
        pt_cl, pt_color = clasificar_peso_talla(pt_pct)
        te_pct = round((talla / talla_esperada_para_edad(edad_meses, sexo)) * 100)
        te_cl, te_color = clasificar_talla_edad(te_pct)

        r["bmi"] = bmi
        r["bmi_cl"] = bmi_cl
        r["bmi_color"] = bmi_color
        r["pt_pct"] = pt_pct
        r["pt_cl"] = pt_cl
        r["pt_color"] = pt_color
        r["te_pct"] = te_pct
        r["te_cl"] = te_cl
        r["te_color"] = te_color

    if edad_meses <= 24 and perimetro_cefalico:
        pc_esp = perimetro_cefalico_esperado(edad_meses, sexo)
        pc_cl, pc_color = clasificar_perimetro_cefalico(perimetro_cefalico, pc_esp)
        r["pc_esp"] = round(pc_esp, 1)
        r["pc_cl"] = pc_cl
        r["pc_color"] = pc_color

    if circunferencia_brazo:
        muac_cl, muac_color = clasificar_muac(circunferencia_brazo, edad_meses)
        r["muac_cl"] = muac_cl
        r["muac_color"] = muac_color

    if pliegue_cutaneo:
        pct_cl, pct_color = evaluar_pliegue(pliegue_cutaneo, edad_meses)
        r["pct_cl"] = pct_cl
        r["pct_color"] = pct_color

    # Evaluación global
    all_clases = [r.get("pt_cl", ""), r.get("te_cl", ""), r.get("bmi_cl", ""), r.get("muac_cl", "")]
    if all(c for c in all_clases):
        ev, ev_color = evaluacion_global(*all_clases)
        r["eval"] = ev
        r["eval_color"] = ev_color

    return r

# ============================================================
#  HELPERS UI
# ============================================================

def format_edad(meses):
    if meses < 1: return "< 1 mes"
    if meses == 1: return "1 mes"
    if meses < 12: return f"{meses} meses"
    a, m = divmod(meses, 12)
    return f"{a} años, {m} meses" if m else f"{a} años"

def badge_html(text, color="green"):
    return f'<span class="badge badge-{color}">{text}</span>'

def metric(icon, icon_bg, label, value, detail):
    return f"""
    <div class="metric-row">
        <div class="metric-icon" style="background:{icon_bg}">{icon}</div>
        <div>
            <p class="metric-label">{label}</p>
            <p class="metric-value">{value}</p>
            <p class="metric-detail">{detail}</p>
        </div>
    </div>"""

def card_html(title, icon, desc, content, card_class="card", card_type=""):
    return f"""
    <div class="{card_class} {card_type}">
        <p class="section-title">{icon} {title}</p>
        <p class="section-desc">{desc}</p>
        {content}
    </div>"""

# ============================================================
#  SESSION STATE
# ============================================================
if "historial" not in st.session_state:
    st.session_state.historial = []

# ============================================================
#  HEADER
# ============================================================
st.markdown("""
<div class="main-header">
    <h1>👶 Infant</h1>
    <p>Calculadora de Requerimientos Nutricionales Pediátricos + Evaluación Antropométrica</p>
    <p style="font-size:0.75rem;opacity:0.7">Cap. 1.2 — Pediatric Nutrition in Practice (Koletzko et al., 2015)</p>
</div>
""", unsafe_allow_html=True)

# Tabs
tab1, tab2 = st.tabs(["🧮 Calculadora", "📋 Historial"])

# ============================================================
#  TAB 1: CALCULADORA
# ============================================================
with tab1:
    col1, col2 = st.columns(2)

    with col1:
        # --- DATOS BÁSICOS ---
        st.markdown(card_html("Datos Básicos", "🧪", "Edad 0 a 18 años. Campos con * son obligatorios.", "", card_type="card"), unsafe_allow_html=True)

        peso = st.number_input("Peso (kg) *", min_value=0.1, max_value=120.0, step=0.01, value=None, placeholder="Ej: 8.5")
        edad_meses = st.number_input("Edad (meses) *", min_value=0, max_value=216, step=1, value=None, placeholder="0-216")
        sexo = st.selectbox("Sexo *", ["masculino", "femenino"], format_func=lambda x: "Masculino" if x == "masculino" else "Femenino")
        talla = st.number_input("Talla (cm)", min_value=20.0, max_value=200.0, step=0.1, value=None, placeholder="Opcional - Ej: 67")

        if edad_meses is not None and edad_meses <= 24:
            pc = st.number_input("Perímetro Cefálico (cm)", min_value=20.0, max_value=65.0, step=0.1, value=None, placeholder="Opcional - Ej: 43", key="pc_input")
        else:
            pc = None

        if edad_meses is not None and edad_meses <= 12:
            eg = st.number_input("Edad Gestacional (semanas)", min_value=22, max_value=44, step=1, value=None, placeholder="22-44 sem", key="eg_input")
        else:
            eg = None

        # --- MEDIDAS ANTROPOMÉTRICAS ---
        st.markdown(card_html("Medidas Antropométricas", "📏", "Cap. 1.2 — Opcionales para clasificación nutricional.", "", card_type="card-violet"), unsafe_allow_html=True)

        muac = st.number_input("Circunferencia del Brazo - MUAC (mm)", min_value=50, max_value=250, step=1, value=None, placeholder="Opcional - Ej: 140")
        pliegue = st.number_input("Pliegue Cutáneo Tricipital (mm)", min_value=2.0, max_value=40.0, step=0.5, value=None, placeholder="Opcional - Ej: 10")

        nivel = st.selectbox("Nivel de Actividad Física", ["sedentario", "ligero", "moderado", "activo", "muy_activo"],
                           format_func=lambda x: f"{x.capitalize()} (PAL ~{PAL_VALUES[x]})")

        calcular = st.button("🧮 Calcular Requerimientos", type="primary", use_container_width=True)

    with col2:
        if not calcular:
            st.markdown("""
            <div class="card" style="text-align:center;padding:3rem 1rem;">
                <p style="font-size:2rem;margin-bottom:0.5rem;">👶</p>
                <p style="font-size:1rem;font-weight:500;color:#6b7280;">Sin resultados aún</p>
                <p style="font-size:0.8rem;color:#9ca3af;">Complete los datos y presione Calcular</p>
            </div>
            """, unsafe_allow_html=True)

        if calcular:
            # Validación
            errores = []
            if peso is None or peso <= 0: errores.append("El peso debe ser mayor a 0 kg")
            if edad_meses is None or edad_meses < 0: errores.append("La edad debe ser >= 0 meses")
            if eg is not None and (eg < 22 or eg > 44): errores.append("Edad gestacional entre 22-44 sem")

            if errores:
                for e in errores:
                    st.error(e)
            else:
                r = calcular_todo(
                    peso=peso, edad_meses=edad_meses, sexo=sexo,
                    edad_gestacional=eg, talla=talla, nivel_actividad=nivel,
                    perimetro_cefalico=pc, circunferencia_brazo=muac,
                    pliegue_cutaneo=pliegue
                )

                # --- BANNER EVALUACIÓN NUTRICIONAL ---
                if "eval" in r:
                    eval_badge = badge_html("Estado nutricional", r["eval_color"])
                    eval_card_type = f"card-{r['eval_color']}"
                    st.markdown(f"""
                    <div class="card {eval_card_type}">
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            {"✅" if r["eval_color"]=="green" else "⚠️" if r["eval_color"]=="yellow" else "🔴" if r["eval_color"]=="red" else "🟠"}
                            <div>
                                <p style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Evaluación Nutricional (Cap. 1.2)</p>
                                <p style="font-size:0.9rem;font-weight:700;margin:0.2rem 0 0;">{r['eval']}</p>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                # --- TARJETA EVALUACIÓN ANTROPOMÉTRICA ---
                antro_content = metric("📈", "#ccfbf1", "Velocidad de Peso Esperada", r["vel_peso"], "Reglas prácticas de crecimiento normal")
                antro_content += metric("📏", "#e0f2fe", "Velocidad de Talla Esperada", r["vel_talla"], "+25cm 1er año; +12cm 2do; 80% adulto a 2 años")

                if "bmi" in r:
                    antro_content += f'<hr style="border:0;border-top:1px solid #f3f4f6;margin:0.3rem 0;">'
                    antro_content += metric("⚖️", "#ffe4e6", "IMC (BMI)", r["bmi_cl"], "Peso (kg) / Talla (m)²")
                if "pt_cl" in r:
                    antro_content += metric("⚡", "#fef3c7", "Peso para Talla", r["pt_cl"], "Ref. OMS 50° centil. Wasting si <80%")
                if "te_cl" in r:
                    antro_content += metric("📏", "#dbeafe", "Talla para Edad", r["te_cl"], "Stunting si <90% (desnutrición crónica)")
                if "pc_cl" in r:
                    antro_content += f'<hr style="border:0;border-top:1px solid #f3f4f6;margin:0.3rem 0;">'
                    antro_content += metric("👶", "#fce7f3", "Perímetro Cefálico", r["pc_cl"], f"Esperado: ~{r['pc_esp']} cm")
                if "muac_cl" in r:
                    antro_content += metric("🛡️", "#ffedd5", "Circunferencia Brazo (MUAC)", r["muac_cl"], "Normal: 115-185 mm (6-60 meses)")
                if "pct_cl" in r:
                    antro_content += metric("❤️", "#fae8ff", "Pliegue Cutáneo Tricipital", r["pct_cl"], "Estimación de reservas de grasa")

                st.markdown(card_html("Evaluación Antropométrica", "🔍", "Crecimiento normal y clasificación por edad — Cap. 1.2", antro_content, card_type="card-violet"), unsafe_allow_html=True)

                # --- TARJETA REQUERIMIENTOS NUTRICIONALES ---
                badges = ""
                if r["es_prematuro"]:
                    badges += badge_html("⚠️ Prematuro", "yellow") + " "
                badges += badge_html(f"PAL: {r['pal']}", "blue")

                nut_content = metric("🔥", "#ffe4e6", "Tasa Metabólica Basal (BMR)", f"{r['bmr']} kcal/día", r["metodo_bmr"])
                nut_content += metric("📊", "#dbeafe", "Gasto Energético Total (TEE)", f"{r['tee']} kcal/día", r["metodo_tee"])
                nut_content += f'<hr style="border:0;border-top:1px solid #f3f4f6;margin:0.3rem 0;">'
                nut_content += metric("⚡", "#fef3c7", "Requerimiento Energético Total", f"{r['req_energetico']} kcal/día", f"{r['req_energetico_kg']} kcal/kg/día — BMR × PAL {r['pal']}")
                if r["crecimiento"] > 0:
                    nut_content += metric("📈", "#dcfce7", "Costo Energético de Crecimiento", f"{r['crecimiento']} kcal/día", "Energía en nuevo tejido")
                nut_content += f'<hr style="border:0;border-top:1px solid #f3f4f6;margin:0.3rem 0;">'
                nut_content += metric("💧", "#cffafe", "Requerimiento de Líquidos", f"{r['liquidos']} mL/día", f"{r['liquidos_kg']} mL/kg/día (Holliday-Segar)")
                nut_content += f'<hr style="border:0;border-top:1px solid #f3f4f6;margin:0.3rem 0;">'
                nut_content += metric("🛡️", "#d1fae5", "Requerimiento de Proteínas", r["p_rango"], f"Total: {r['p_total']} g/día — RDA: {r['p_rda']} g/kg")
                nut_content += metric("🧂", "#ffedd5", "Requerimiento de Sodio", r["sodio_rango"], f"{r['sodio_val'] * peso:.1f} mEq totales estimados")
                nut_content += metric("🧪", "#ede9fe", "Requerimiento de Potasio", r["potasio_rango"], f"{r['potasio_val'] * peso:.1f} mEq totales estimados")
                nut_content += f'<hr style="border:0;border-top:1px solid #f3f4f6;margin:0.3rem 0;">'
                nut_content += metric("📐", "#e0e7ff", "Superficie Corporal (Mosteller)", f"{r['sc']} m²", "√(peso × talla / 3600)")

                st.markdown(card_html("Requerimientos Nutricionales", "❤️", "Koletzko et al. — Pediatric Nutrition in Practice (2015)", nut_content, card_type="card-teal"), unsafe_allow_html=True)

                # Guardar en historial
                if st.button("💾 Guardar en Historial", use_container_width=True):
                    registro = {
                        "peso": peso, "edad_meses": edad_meses, "sexo": sexo,
                        "talla": talla, "bmi": r.get("bmi"), "eval": r.get("eval", ""),
                        "eval_color": r.get("eval_color", ""),
                        "req_energetico": r["req_energetico"],
                        "liquidos": r["liquidos"], "p_rda": r["p_rda"],
                    }
                    st.session_state.historial.append(registro)
                    st.success("Registro guardado en historial ✅")

# ============================================================
#  TAB 2: HISTORIAL
# ============================================================
with tab2:
    if not st.session_state.historial:
        st.markdown("""
        <div class="card" style="text-align:center;padding:3rem 1rem;">
            <p style="font-size:2rem;margin-bottom:0.5rem;">📋</p>
            <p style="font-size:1rem;font-weight:500;color:#6b7280;">No hay registros</p>
            <p style="font-size:0.8rem;color:#9ca3af;">Los cálculos guardados aparecerán aquí</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        html_rows = ""
        for i, reg in enumerate(st.session_state.historial, 1):
            eval_badge = badge_html(reg.get("eval", "N/A")[:30], reg.get("eval_color", "green"))
            html_rows += f"""
            <tr>
                <td>{i}</td>
                <td>{"M" if reg["sexo"] == "masculino" else "F"}</td>
                <td>{reg['peso']} kg</td>
                <td>{format_edad(reg['edad_meses'])}</td>
                <td>{reg.get('bmi', '—')}</td>
                <td>{eval_badge}</td>
                <td>{reg['req_energetico']} kcal</td>
                <td>{reg['liquidos']} mL</td>
            </tr>"""

        st.markdown(f"""
        <div class="card">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>#</th><th>Sexo</th><th>Peso</th><th>Edad</th>
                        <th>IMC</th><th>Evaluación</th><th>Calorías</th><th>Líquidos</th>
                    </tr>
                </thead>
                <tbody>{html_rows}</tbody>
            </table>
        </div>
        """, unsafe_allow_html=True)

        if st.button("🗑️ Limpiar Historial"):
            st.session_state.historial = []
            st.rerun()

# ============================================================
#  FOOTER
# ============================================================
st.markdown("""
<div class="footer">
    Infant v2.1 — Calculadora de Requerimientos Nutricionales Pediátricos + Evaluación Antropométrica<br>
    Fuente: Pediatric Nutrition in Practice (Koletzko et al., 2015) — Cap. 1.2 Nutritional Assessment
</div>
""", unsafe_allow_html=True)
