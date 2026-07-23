"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Baby,
  Calculator,
  Trash2,
  Save,
  History,
  FlaskConical,
  Heart,
  Droplets,
  ShieldPlus,
  Zap,
  Ruler,
  Activity,
  Flame,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanSearch,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FormData {
  peso: string;
  edadMeses: string;
  sexo: string;
  edadGestacional: string;
  talla: string;
  nivelActividad: string;
  perimetroCefalico: string;
  circunferenciaBrazo: string;
  pliegueCutaneoTriceps: string;
}

interface CalculationResults {
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
  /* Ch. 1.2 */
  bmi?: number;
  bmiClasificacion?: string;
  pesoParaTalla?: number;
  pesoParaTallaClasificacion?: string;
  tallaParaEdad?: number;
  tallaParaEdadClasificacion?: string;
  velocidadPesoEsperada?: string;
  velocidadTallaEsperada?: string;
  perimetroCefalicoEsperado?: number;
  perimetroCefalicoEstado?: string;
  muacClasificacion?: string;
  pliegueCutaneoEstado?: string;
  evaluacionNutricional?: string;
  colorEvaluacion?: string;
}

interface SavedRecord {
  id: number;
  peso: number;
  edadMeses: number;
  sexo: string;
  edadGestacional: number | null;
  talla: number | null;
  nivelActividad: string;
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
  /* Ch. 1.2 */
  bmi: number | null;
  bmiClasificacion: string | null;
  pesoParaTalla: number | null;
  pesoParaTallaClasificacion: string | null;
  tallaParaEdad: number | null;
  tallaParaEdadClasificacion: string | null;
  perimetroCefalicoEstado: string | null;
  muacClasificacion: string | null;
  evaluacionNutricional: string | null;
  colorEvaluacion: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatEdad(meses: number): string {
  if (meses < 1) return "< 1 mes";
  if (meses === 1) return "1 mes";
  if (meses < 12) return `${meses} meses`;
  const a = Math.floor(meses / 12),
    m = meses % 12;
  return m > 0 ? `${a} a\u00f1os, ${m} meses` : `${a} a\u00f1os`;
}

function formatFecha(fecha: string): string {
  try {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return fecha;
  }
}

function statusBadgeClass(color?: string): string {
  switch (color) {
    case "green": return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200";
    case "yellow": return "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200";
    case "orange": return "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200";
    case "red": return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
    default: return "bg-gray-100 text-gray-700 hover:bg-gray-100";
  }
}

function statusIcon(color?: string): React.ReactNode {
  switch (color) {
    case "green": return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case "yellow": return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case "orange": return <AlertCircle className="w-4 h-4 text-orange-600" />;
    case "red": return <XCircle className="w-4 h-4 text-red-600" />;
    default: return <CircleDot className="w-4 h-4 text-gray-500" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ResultItem({
  icon,
  label,
  value,
  detail,
  colorClass,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  colorClass: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 py-2.5 ${
        highlight
          ? "rounded-lg bg-amber-50/60 px-3 -mx-1 border border-amber-200/40"
          : ""
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center shrink-0 mt-0.5`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p
          className={`text-sm font-semibold ${
            highlight ? "text-amber-800" : "text-foreground"
          }`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{detail}</p>
      </div>
    </motion.div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground/70 max-w-xs mb-4">
        {description}
      </p>
      {action}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    peso: "",
    edadMeses: "",
    sexo: "",
    edadGestacional: "",
    talla: "",
    nivelActividad: "moderado",
    perimetroCefalico: "",
    circunferenciaBrazo: "",
    pliegueCutaneoTriceps: "",
  });
  const [resultados, setResultados] = useState<CalculationResults | null>(null);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("calculator");
  const [lastInput, setLastInput] = useState<Record<string, string> | null>(
    null
  );

  /* ---- Fetch records ---- */
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/records");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /* ---- Form change ---- */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errores.length > 0) setErrores([]);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errores.length > 0) setErrores([]);
  };

  /* ---- Validate ---- */
  const validateForm = (): boolean => {
    const e: string[] = [];
    const p = parseFloat(formData.peso);
    if (!formData.peso || isNaN(p) || p <= 0)
      e.push("El peso debe ser mayor a 0 kg");
    else if (p > 120) e.push("El peso m\u00e1ximo es 120 kg");
    const m = parseInt(formData.edadMeses);
    if (!formData.edadMeses || isNaN(m) || m < 0)
      e.push("La edad debe ser mayor o igual a 0 meses");
    else if (m > 216) e.push("La edad m\u00e1xima es 216 meses (18 a\u00f1os)");
    if (!formData.sexo) e.push("Debe seleccionar el sexo");
    if (formData.talla) {
      const t = parseFloat(formData.talla);
      if (isNaN(t) || t < 20 || t > 200) e.push("La talla debe estar entre 20 y 200 cm");
    }
    if (formData.perimetroCefalico) {
      const pc = parseFloat(formData.perimetroCefalico);
      if (isNaN(pc) || pc < 20 || pc > 65) e.push("El per\u00edmetro cef\u00e1lico debe estar entre 20 y 65 cm");
    }
    if (formData.circunferenciaBrazo) {
      const cb = parseInt(formData.circunferenciaBrazo);
      if (isNaN(cb) || cb < 50 || cb > 250) e.push("La circunferencia del brazo debe estar entre 50 y 250 mm");
    }
    if (formData.pliegueCutaneoTriceps) {
      const pt = parseFloat(formData.pliegueCutaneoTriceps);
      if (isNaN(pt) || pt < 2 || pt > 40) e.push("El pliegue cut\u00e1neo debe estar entre 2 y 40 mm");
    }
    setErrores(e);
    return e.length === 0;
  };

  /* ---- Calculate ---- */
  const handleCalculate = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setResultados(null);
    try {
      const payload: Record<string, string> = {
        peso: formData.peso,
        edadMeses: formData.edadMeses,
        sexo: formData.sexo,
        nivelActividad: formData.nivelActividad,
      };
      if (formData.edadGestacional)
        payload.edadGestacional = formData.edadGestacional;
      if (formData.talla) payload.talla = formData.talla;
      if (formData.perimetroCefalico) payload.perimetroCefalico = formData.perimetroCefalico;
      if (formData.circunferenciaBrazo) payload.circunferenciaBrazo = formData.circunferenciaBrazo;
      if (formData.pliegueCutaneoTriceps) payload.pliegueCutaneoTriceps = formData.pliegueCutaneoTriceps;

      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResultados(data.data.resultados);
        setLastInput(payload);
        toast({
          title: "C\u00e1lculo completado",
          description: "Requerimientos calculados correctamente.",
        });
      } else {
        setErrores(data.errores || ["Error en el c\u00e1lculo"]);
      }
    } catch {
      setErrores(["Error de conexi\u00f3n con el servidor"]);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!resultados || !lastInput) return;
    setSaving(true);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultados, input: lastInput }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Registro guardado",
          description: "Se guard\u00f3 en el historial correctamente.",
        });
        await fetchRecords();
        setActiveTab("history");
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo guardar el registro.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        toast({ title: "Registro eliminado" });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro.",
        variant: "destructive",
      });
    }
  };

  /* ---- Derived ---- */
  const edadMeses = parseInt(formData.edadMeses) || 0;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50/40 via-background to-cyan-50/40">
      {/* ---- Header ---- */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
              <Baby className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Infant</h1>
              <p className="text-xs text-muted-foreground">
                Calculadora de Requerimientos Pedi\u00e1tricos
              </p>
            </div>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-auto"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="calculator" className="gap-2">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Calculadora</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">
                  Historial ({records.length})
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* ---- Main ---- */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {/* ============ CALCULATOR TAB ============ */}
          {activeTab === "calculator" && (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Requerimientos Nutricionales y Evaluaci\u00f3n Antropom\u00e9trica
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
                  Incluye medidas b\u00e1sicas, clasificaci\u00f3n nutricional y reglas de
                  crecimiento normal. Cap. 1.2 &mdash; Koletzko et al. (2015).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ---- Patient Form ---- */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  {/* --- Basic Data Card --- */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-teal-600" />
                        Datos B\u00e1sicos
                      </CardTitle>
                      <CardDescription>
                        Edad 0 a 18 a\u00f1os. Complete los campos requeridos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Peso */}
                      <div className="space-y-2">
                        <Label htmlFor="peso">Peso (kg) *</Label>
                        <Input
                          id="peso"
                          name="peso"
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="120"
                          placeholder="Ej: 3.5"
                          value={formData.peso}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Edad */}
                      <div className="space-y-2">
                        <Label htmlFor="edadMeses">Edad (meses) *</Label>
                        <Input
                          id="edadMeses"
                          name="edadMeses"
                          type="number"
                          step="1"
                          min="0"
                          max="216"
                          placeholder="0-216"
                          value={formData.edadMeses}
                          onChange={handleInputChange}
                        />
                        {formData.edadMeses &&
                          parseInt(formData.edadMeses) >= 0 && (
                            <p className="text-xs text-muted-foreground">
                              {formatEdad(parseInt(formData.edadMeses))}
                            </p>
                          )}
                      </div>

                      {/* Sexo */}
                      <div className="space-y-2">
                        <Label>Sexo *</Label>
                        <Select
                          value={formData.sexo}
                          onValueChange={(v) => handleSelectChange("sexo", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="femenino">Femenino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Talla */}
                      <div className="space-y-2">
                        <Label htmlFor="talla">Talla (cm)</Label>
                        <Input
                          id="talla"
                          name="talla"
                          type="number"
                          step="0.1"
                          min="20"
                          max="200"
                          placeholder="Opcional - Ej: 52"
                          value={formData.talla}
                          onChange={handleInputChange}
                        />
                        {formData.talla && (
                          <p className="text-xs text-muted-foreground">
                            {parseFloat(formData.talla) < 85
                              ? "Longitud supino (infant\u00f3metro)"
                              : "Talla de pie (estadi\u00f3metro)"}
                          </p>
                        )}
                      </div>

                      {/* Edad Gestacional (solo si <= 12 meses) */}
                      {edadMeses <= 12 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2"
                        >
                          <Label htmlFor="edadGestacional">
                            Edad Gestacional (semanas)
                          </Label>
                          <Input
                            id="edadGestacional"
                            name="edadGestacional"
                            type="number"
                            step="1"
                            min="22"
                            max="44"
                            placeholder="22-44 sem"
                            value={formData.edadGestacional}
                            onChange={handleInputChange}
                          />
                          {formData.edadGestacional && (
                            <p className="text-xs text-muted-foreground">
                              {parseInt(formData.edadGestacional) < 37
                                ? "Prematuro (<37 sem) - Se aplicar\u00e1 edad corregida"
                                : "A t\u00e9rmino"}
                            </p>
                          )}
                        </motion.div>
                      )}

                      {/* Nivel de Actividad */}
                      <div className="space-y-2">
                        <Label>Nivel de Actividad F\u00edsica</Label>
                        <Select
                          value={formData.nivelActividad}
                          onValueChange={(v) =>
                            handleSelectChange("nivelActividad", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sedentario">
                              Sedentario (PAL ~1.2)
                            </SelectItem>
                            <SelectItem value="ligero">
                              Ligero (PAL ~1.5)
                            </SelectItem>
                            <SelectItem value="moderado">
                              Moderado (PAL ~1.7)
                            </SelectItem>
                            <SelectItem value="activo">
                              Activo (PAL ~1.9)
                            </SelectItem>
                            <SelectItem value="muy_activo">
                              Muy Activo (PAL ~2.0)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* --- Anthropometry Card (Ch. 1.2) --- */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ScanSearch className="w-5 h-5 text-violet-600" />
                        Medidas Antropom\u00e9tricas
                      </CardTitle>
                      <CardDescription>
                        Cap. 1.2 - Evaluaci\u00f3n antropom\u00e9trica. Opcionales para clasificaci\u00f3n nutricional.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Perímetro cefálico (solo < 24 meses) */}
                      {edadMeses <= 24 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2"
                        >
                          <Label htmlFor="perimetroCefalico">
                            Per\u00edmetro Cef\u00e1lico (cm)
                          </Label>
                          <Input
                            id="perimetroCefalico"
                            name="perimetroCefalico"
                            type="number"
                            step="0.1"
                            min="20"
                            max="65"
                            placeholder="Opcional - Ej: 35.5"
                            value={formData.perimetroCefalico}
                            onChange={handleInputChange}
                          />
                          <p className="text-xs text-muted-foreground">
                            Medir con cinta no el\u00e1stica: frente + prominencia occipital.
                            Normal: ~+1 cm/mes (1er a\u00f1o), +2 cm total (2do a\u00f1o)
                          </p>
                        </motion.div>
                      )}

                      {/* Circunferencia del brazo (MUAC) */}
                      <div className="space-y-2">
                        <Label htmlFor="circunferenciaBrazo">
                          Circunferencia del Brazo - MUAC (mm)
                        </Label>
                        <Input
                          id="circunferenciaBrazo"
                          name="circunferenciaBrazo"
                          type="number"
                          step="1"
                          min="50"
                          max="250"
                          placeholder="Opcional - Ej: 140"
                          value={formData.circunferenciaBrazo}
                          onChange={handleInputChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          Punto medio entre acromi\u00f3n y ol\u00e9cranon.
                          {edadMeses >= 6 && edadMeses <= 60 && (
                            <span className="text-red-600 font-medium"> {"<"}115 mm = desnutrici\u00f3n severa</span>
                          )}
                        </p>
                      </div>

                      {/* Pliegue cutáneo tricipital */}
                      <div className="space-y-2">
                        <Label htmlFor="pliegueCutaneoTriceps">
                          Pliegue Cut\u00e1neo Tricipital (mm)
                        </Label>
                        <Input
                          id="pliegueCutaneoTriceps"
                          name="pliegueCutaneoTriceps"
                          type="number"
                          step="0.5"
                          min="2"
                          max="40"
                          placeholder="Opcional - Ej: 10"
                          value={formData.pliegueCutaneoTriceps}
                          onChange={handleInputChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          Con caliper en punto MUAC, brazo relajado. Lee a 0.5 mm tras 3 s.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Errores */}
                  <AnimatePresence>
                    {errores.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-1"
                      >
                        {errores.map((err, i) => (
                          <p
                            key={i}
                            className="text-sm text-destructive flex items-center gap-2"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />{" "}
                            {err}
                          </p>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Botón Calcular */}
                  <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md h-12 text-base"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Calculando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Calcular Requerimientos
                      </span>
                    )}
                  </Button>
                </motion.div>

                {/* ---- Results ---- */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  {resultados ? (
                    <>
                      {/* Nutritional Assessment Banner (Ch. 1.2) */}
                      {resultados.evaluacionNutricional && (
                        <Card
                          className={`border-2 ${
                            resultados.colorEvaluacion === "green"
                              ? "border-emerald-300 bg-emerald-50/40"
                              : resultados.colorEvaluacion === "yellow"
                              ? "border-amber-300 bg-amber-50/40"
                              : resultados.colorEvaluacion === "orange"
                              ? "border-orange-300 bg-orange-50/40"
                              : "border-red-300 bg-red-50/40"
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {statusIcon(resultados.colorEvaluacion)}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Evaluaci\u00f3n Nutricional (Cap. 1.2)
                                </p>
                                <p className="text-sm font-bold mt-0.5">
                                  {resultados.evaluacionNutricional}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Anthropometric Evaluation Card (Ch. 1.2) */}
                      <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50/40 to-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ScanSearch className="w-5 h-5 text-violet-600" />
                            Evaluaci\u00f3n Antropom\u00e9trica
                          </CardTitle>
                          <CardDescription>
                            Crecimiento normal y clasificaci\u00f3n por edad &mdash; Cap. 1.2
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          {/* Expected growth velocity */}
                          <ResultItem
                            icon={<TrendingUp className="w-4 h-4 text-teal-500" />}
                            label="Velocidad de Peso Esperada"
                            value={resultados.velocidadPesoEsperada || "N/A"}
                            detail="Reglas pr\u00e1cticas de crecimiento normal (Cap. 1.2)"
                            colorClass="bg-teal-100"
                          />
                          <ResultItem
                            icon={<Ruler className="w-4 h-4 text-sky-500" />}
                            label="Velocidad de Talla Esperada"
                            value={resultados.velocidadTallaEsperada || "N/A"}
                            detail="+25 cm 1er a\u00f1o; +12 cm 2do; 80% adulto a los 2 a\u00f1os"
                            colorClass="bg-sky-100"
                          />
                          <Separator />
                          {/* BMI */}
                          {resultados.bmi && (
                            <ResultItem
                              icon={<Activity className="w-4 h-4 text-rose-500" />}
                              label="IMC (BMI)"
                              value={resultados.bmiClasificacion || `${resultados.bmi}`}
                              detail="Peso (kg) / Talla (m)\u00b2"
                              colorClass="bg-rose-100"
                            />
                          )}
                          {/* Weight-for-height */}
                          {resultados.pesoParaTallaClasificacion && (
                            <ResultItem
                              icon={<Zap className="w-4 h-4 text-amber-500" />}
                              label="Peso para Talla"
                              value={resultados.pesoParaTallaClasificacion}
                              detail="Referencia OMS 50\u00b0 centil. Wasting si <80%"
                              colorClass="bg-amber-100"
                            />
                          )}
                          {/* Height-for-age */}
                          {resultados.tallaParaEdadClasificacion && (
                            <ResultItem
                              icon={<Ruler className="w-4 h-4 text-blue-500" />}
                              label="Talla para Edad"
                              value={resultados.tallaParaEdadClasificacion}
                              detail="Stunting si <90% (desnutrici\u00f3n cr\u00f3nica)"
                              colorClass="bg-blue-100"
                            />
                          )}
                          {/* Head circumference */}
                          {resultados.perimetroCefalicoEstado && (
                            <>
                              <Separator />
                              <ResultItem
                                icon={<Baby className="w-4 h-4 text-pink-500" />}
                                label="Per\u00edmetro Cef\u00e1lico"
                                value={resultados.perimetroCefalicoEstado}
                                detail={`Esperado: ~${resultados.perimetroCefalicoEsperado?.toFixed(1)} cm para esta edad`}
                                colorClass="bg-pink-100"
                              />
                            </>
                          )}
                          {/* MUAC */}
                          {resultados.muacClasificacion && (
                            <ResultItem
                              icon={<ShieldPlus className="w-4 h-4 text-orange-500" />}
                              label="Circunferencia del Brazo (MUAC)"
                              value={resultados.muacClasificacion}
                              detail="Rango normal: 115-185 mm (6-60 meses)"
                              colorClass="bg-orange-100"
                            />
                          )}
                          {/* Skinfold */}
                          {resultados.pliegueCutaneoEstado && (
                            <ResultItem
                              icon={<Heart className="w-4 h-4 text-fuchsia-500" />}
                              label="Pliegue Cut\u00e1neo Tricipital"
                              value={resultados.pliegueCutaneoEstado}
                              detail="Estimaci\u00f3n de reservas de grasa"
                              colorClass="bg-fuchsia-100"
                            />
                          )}
                        </CardContent>
                      </Card>

                      {/* Nutritional Requirements Card */}
                      <Card className="border-teal-200/50 bg-gradient-to-br from-teal-50/50 to-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Heart className="w-5 h-5 text-teal-600" />
                            Requerimientos Nutricionales
                          </CardTitle>
                          <CardDescription>
                            Koletzko et al. - Pediatric Nutrition in Practice (2015)
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          {/* Energeticos */}
                          <ResultItem
                            icon={<Flame className="w-4 h-4 text-rose-500" />}
                            label="Tasa Metab\u00f3lica Basal (BMR)"
                            value={`${resultados.tasaMetabolicaBasal} kcal/d\u00eda`}
                            detail={resultados.metodoBMR}
                            colorClass="bg-rose-100"
                          />
                          <ResultItem
                            icon={<Activity className="w-4 h-4 text-blue-500" />}
                            label="Gasto Energ\u00e9tico Total (TEE)"
                            value={`${resultados.gastoEnergeticoTotal} kcal/d\u00eda`}
                            detail={resultados.metodoTEE}
                            colorClass="bg-blue-100"
                          />
                          <ResultItem
                            icon={<Zap className="w-4 h-4 text-amber-500" />}
                            label="Requerimiento Energ\u00e9tico Total"
                            value={`${resultados.requerimientoEnergetico} kcal/d\u00eda`}
                            detail={`${resultados.requerimientoEnergeticoPorKg} kcal/kg/d\u00eda \u2014 BMR \u00d7 PAL ${resultados.factorPAL}`}
                            colorClass="bg-amber-100"
                            highlight
                          />
                          {resultados.costoEnergiaCrecimiento > 0 && (
                            <ResultItem
                              icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                              label="Costo Energ\u00e9tico de Crecimiento"
                              value={`${resultados.costoEnergiaCrecimiento} kcal/d\u00eda`}
                              detail="Energ\u00eda depositada en nuevo tejido"
                              colorClass="bg-green-100"
                            />
                          )}
                          <Separator />
                          {/* Liquidos */}
                          <ResultItem
                            icon={<Droplets className="w-4 h-4 text-cyan-500" />}
                            label="Requerimiento de L\u00edquidos"
                            value={`${resultados.requerimientoLiquidos} mL/d\u00eda`}
                            detail={`${resultados.requerimientoLiquidosPorKg} mL/kg/d\u00eda (Holliday-Segar)`}
                            colorClass="bg-cyan-100"
                          />
                          <Separator />
                          {/* Proteinas */}
                          <ResultItem
                            icon={<ShieldPlus className="w-4 h-4 text-emerald-500" />}
                            label="Requerimiento de Prote\u00ednas"
                            value={resultados.requerimientoProteinasRango}
                            detail={`Total: ${resultados.proteinasTotales} g/d\u00eda \u2014 RDA: ${resultados.requerimientoProteinasRDA} g/kg`}
                            colorClass="bg-emerald-100"
                          />
                          {/* Sodio */}
                          <ResultItem
                            icon={<ShieldPlus className="w-4 h-4 text-orange-500" />}
                            label="Requerimiento de Sodio"
                            value={resultados.requerimientoSodioRango}
                            detail={`${(resultados.requerimientoSodio * parseFloat(formData.peso)).toFixed(1)} mEq totales estimados`}
                            colorClass="bg-orange-100"
                          />
                          {/* Potasio */}
                          <ResultItem
                            icon={<ShieldPlus className="w-4 h-4 text-violet-500" />}
                            label="Requerimiento de Potasio"
                            value={resultados.requerimientoPotasioRango}
                            detail={`${(resultados.requerimientoPotasio * parseFloat(formData.peso)).toFixed(1)} mEq totales estimados`}
                            colorClass="bg-violet-100"
                          />
                          <Separator />
                          {/* Superficie Corporal */}
                          <ResultItem
                            icon={<Ruler className="w-4 h-4 text-indigo-500" />}
                            label="Superficie Corporal (Mosteller)"
                            value={`${resultados.superficieCorporal} m\u00b2`}
                            detail="F\u00f3rmula: \u221a(peso \u00d7 talla / 3600)"
                            colorClass="bg-indigo-100"
                          />
                        </CardContent>
                      </Card>

                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        variant="outline"
                        className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 h-12 text-base"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-teal-300 border-t-teal-700 rounded-full animate-spin" />
                            Guardando...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Guardar en Historial
                          </span>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent>
                        <EmptyState
                          icon={Baby}
                          title="Sin resultados a\u00fan"
                          description="Complete los datos del paciente y presione Calcular para ver requerimientos y evaluaci\u00f3n antropom\u00e9trica."
                        />
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ============ HISTORY TAB ============ */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Historial de C\u00e1lculos
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {records.length} registro
                    {records.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchRecords}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>

              {records.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Fecha</TableHead>
                            <TableHead>Sexo</TableHead>
                            <TableHead>Peso</TableHead>
                            <TableHead>Edad</TableHead>
                            <TableHead>IMC</TableHead>
                            <TableHead>Evaluaci\u00f3n</TableHead>
                            <TableHead>Calor\u00edas</TableHead>
                            <TableHead>L\u00edquidos</TableHead>
                            <TableHead className="text-right">
                              Acci\u00f3n
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatFecha(r.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {r.sexo === "masculino" ? "M" : "F"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {r.peso} kg
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatEdad(r.edadMeses)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.bmi ? `${r.bmi}` : "\u2014"}
                              </TableCell>
                              <TableCell>
                                {r.evaluacionNutricional ? (
                                  <Badge
                                    variant="secondary"
                                    className={statusBadgeClass(r.colorEvaluacion || undefined)}
                                  >
                                    {r.evaluacionNutricional.length > 35
                                      ? r.evaluacionNutricional.substring(0, 35) + "..."
                                      : r.evaluacionNutricional}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin datos antropom.</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-amber-700">
                                {r.requerimientoEnergetico} kcal
                              </TableCell>
                              <TableCell className="text-sm font-medium text-cyan-700">
                                {r.requerimientoLiquidos} mL
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(r.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent>
                    <EmptyState
                      icon={History}
                      title="No hay registros"
                      description="Los c\u00e1lculos guardados aparecer\u00e1n aqu\u00ed."
                      action={
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("calculator")}
                        >
                          Ir a Calculadora
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ---- Footer ---- */}
      <footer className="border-t bg-background/60 backdrop-blur-sm mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              Infant v2.1 &mdash; Calculadora de Requerimientos Nutricionales
              Pedi\u00e1tricos + Evaluaci\u00f3n Antropom\u00e9trica
            </p>
            <p>
              Fuente: Pediatric Nutrition in Practice (Koletzko et al., 2015) &mdash; Cap. 1.2
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
