---
Task ID: 1
Agent: Main Agent
Task: Aplicar fórmulas antropométricas del Capítulo 1.2 al formulario Infant

Work Log:
- Clonado repositorio infant desde GitHub (HTTPS)
- Extraído Capítulo 1.2 de Pediatric Nutrition in Practice (páginas 21-28)
- Añadidas funciones de evaluación antropométrica en calculations.ts:
  - Velocidad de peso esperada por edad (200g/sem 0-3m, 130g/sem 3-6m, etc.)
  - Velocidad de talla esperada (+25cm 1er año, +12cm 2do año)
  - Perímetro cefálico esperado por edad y sexo
  - Clasificación de perímetro cefálico (normal/bajo/alto)
  - Cálculo de BMI (kg/m²) con clasificación por edad
  - Peso para talla (%) con clasificación (normal/desnutrición leve-moderada-severa)
  - Talla para edad (%) con clasificación (stunting)
  - Clasificación MUAC (<115mm = severo)
  - Evaluación pliegue cutáneo tricipital
  - Evaluación nutricional global combinada
- Añadidos campos al formulario: perímetro cefálico (solo <24m), MUAC, pliegue cutáneo
- Actualizado esquema Prisma con 13 nuevos campos
- Actualizadas API routes (calculate y records)
- Verificación con ESLint (0 errores) y dev server (200 OK)

Stage Summary:
- Aplicación actualizada con medidas antropométricas del Cap. 1.2
- Banner de evaluación nutricional con colores por severidad
- Card de evaluación antropométrica con todas las métricas
- Historial muestra IMC y evaluación nutricional
- Dev server corriendo sin errores en puerto 3000
