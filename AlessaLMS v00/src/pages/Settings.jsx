import { useState, useCallback, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  UploadCloud,
  FileSpreadsheet, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  FileDown,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Package,
  UserSquare
} from "lucide-react";
import { Button } from "../Components/ui/button";
import atcData from "../Data/atc_data.json";
import cie10Data from "../Data/cie10_data.json";
// Ocultos para desarrollos futuros:
// import eurdData from "../data/eurd_data.json";
// import { clientesConfig } from "../config/clientesConfig";
// import UsersConfig from "./Config/UsersConfig";
// import ClientsConfig from "./Config/ClientsConfig";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("catalogos"); // "catalogos", "usuarios", "clientes"

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" }); // "success", "error"

  // Active Upload Type ("ATC", "PRODUCTOS" o "EURD")
  const [activeUploadType, setActiveUploadType] = useState(null);

  // ESTADOS ATC
  const [showLiveTable, setShowLiveTable] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [tablePage, setTablePage] = useState(1);

  // ESTADOS CIE-10
  const [showLiveTableCie10, setShowLiveTableCie10] = useState(false);
  const [tableSearchQueryCie10, setTableSearchQueryCie10] = useState("");
  const [tablePageCie10, setTablePageCie10] = useState(1);

  // ESTADOS PRODUCTOS
  // const [selectedCliente, setSelectedCliente] = useState(clientesConfig[0].id);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [productosData, setProductosData] = useState([]);
  const [showLiveTableProductos, setShowLiveTableProductos] = useState(false);
  const [tableSearchQueryProductos, setTableSearchQueryProductos] = useState("");
  const [tablePageProductos, setTablePageProductos] = useState(1);

  // ESTADOS EURD
  const [showLiveTableEURD, setShowLiveTableEURD] = useState(false);
  const [tableSearchQueryEURD, setTableSearchQueryEURD] = useState("");
  const [tablePageEURD, setTablePageEURD] = useState(1);

  const itemsPerPage = 8;

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const hasAdminAccess = user?.roles?.some(r => r === 'SUPER_ADMIN' || r === 'ORG_ADMIN');

  // Carga dinámica del JSON de productos (Comentado para desarrollos futuros)
  /*
  useEffect(() => {
    const loadProductos = async () => { ... }
    loadProductos();
    setShowLiveTableProductos(false);
    setParsedData([]);
  }, [selectedCliente]);
  */

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Normalizador ATC
  const normalizeATC = (jsonData) => {
    return jsonData.map(row => {
      const normalizedRow = {
        atc_code: "", atc_name: "", ddd: "NA", uom: "NA", adm_r: "NA", note: "NA", TRAD: ""
      };
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().trim();
        const value = String(row[key]).trim();
        if (["atc_code", "atccode", "codigo", "código"].includes(lowerKey)) normalizedRow.atc_code = value;
        else if (["atc_name", "atcname", "nombre", "name"].includes(lowerKey)) normalizedRow.atc_name = value;
        else if (["ddd", "dosis", "dosis diaria"].includes(lowerKey)) normalizedRow.ddd = value || "NA";
        else if (["uom", "unidad", "unit"].includes(lowerKey)) normalizedRow.uom = value || "NA";
        else if (["adm_r", "adm", "via", "vía", "route"].includes(lowerKey)) normalizedRow.adm_r = value || "NA";
        else if (["note", "nota", "comentario"].includes(lowerKey)) normalizedRow.note = value || "NA";
        else if (["trad", "traduccion", "principio"].includes(lowerKey)) normalizedRow.TRAD = value;
      });
      return normalizedRow;
    }).filter(row => row.atc_code && (row.TRAD || row.atc_name));
  };

  // Normalizador PRODUCTOS
  const normalizeProductos = (jsonData) => {
    return jsonData.map(row => {
      const normalizedRow = {
        rs: "", marca: "", dci: "", dosis: "", formafarmaceutica: "",
        fabricante: "", paisdefabricacion: "", faprobacion: "", fvencimiento: "",
        estado: "", ipsdenominacion: ""
      };
      
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().replace(/[\s_.-]/g, '');
        const value = String(row[key]).trim();
        
        if (lowerKey.includes("rs") || lowerKey.includes("registro") || lowerKey.includes("sanitario") || lowerKey === "nror" || lowerKey === "nrors") normalizedRow.rs = value;
        else if (lowerKey === "marca" || lowerKey.includes("nombrecomercial") || lowerKey.includes("producto")) normalizedRow.marca = value;
        else if (lowerKey === "dci" || lowerKey.includes("principio") || lowerKey.includes("activo") || lowerKey.includes("sustancia")) normalizedRow.dci = value;
        else if (lowerKey === "dosis" || lowerKey.includes("concentracion") || lowerKey.includes("fuerza")) normalizedRow.dosis = value;
        else if (lowerKey.includes("formafarmaceutic") || lowerKey.includes("forma") || lowerKey === "ff") normalizedRow.formafarmaceutica = value;
        else if (lowerKey.includes("fabricante") || lowerKey.includes("laboratorio") || lowerKey.includes("titular")) normalizedRow.fabricante = value;
        else if (lowerKey.includes("pais") || lowerKey.includes("origen")) normalizedRow.paisdefabricacion = value;
        else if (lowerKey.includes("aprobacion") || lowerKey.includes("emision") || lowerKey.includes("autorizacion")) normalizedRow.faprobacion = value;
        else if (lowerKey.includes("vencimiento") || lowerKey.includes("caducidad") || lowerKey.includes("expiracion")) normalizedRow.fvencimiento = value;
        else if (lowerKey === "estado" || lowerKey.includes("situacion") || lowerKey.includes("condicion")) normalizedRow.estado = value;
        else if (lowerKey.includes("ips") || lowerKey.includes("denominacion")) normalizedRow.ipsdenominacion = value;
      });
      
      // Fallback si no hay cabeceras reconocidas, intentamos mapear por el orden
      if (!normalizedRow.rs && !normalizedRow.dci && !normalizedRow.marca) {
        const vals = Object.values(row);
        if (vals.length > 0) normalizedRow.rs = String(vals[0]).trim();
        if (vals.length > 1) normalizedRow.marca = String(vals[1]).trim();
        if (vals.length > 2) normalizedRow.dci = String(vals[2]).trim();
      }

      return normalizedRow;
    }).filter(row => row.rs || row.dci || row.marca);
  };

  const processFile = (fileToProcess, type) => {
    if (!fileToProcess) return;
    const fileType = fileToProcess.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(fileType)) {
      setStatus({ type: "error", message: "Formato no soportado (.xlsx, .xls, .csv)." });
      return;
    }
    setFile(fileToProcess);
    setIsParsing(true);
    setStatus({ type: "", message: "" });
    setActiveUploadType(type);

    if (type === "ATC") setShowLiveTable(false);
    if (type === "PRODUCTOS") setShowLiveTableProductos(false);
    if (type === "EURD") setShowLiveTableEURD(false);
    if (type === "CIE10") setShowLiveTableCie10(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        
        let cleanData = [];
        if (type === "ATC") {
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          if (rawJson.length === 0) throw new Error("El archivo está vacío.");
          cleanData = normalizeATC(rawJson);
          if (cleanData.length === 0) throw new Error("Columnas ATC no válidas.");
        } else if (type === "PRODUCTOS") {
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          if (rawJson.length === 0) throw new Error("El archivo está vacío.");
          cleanData = normalizeProductos(rawJson);
          if (cleanData.length === 0) throw new Error("Columnas de Productos no válidas (falta RS o DCI).");
        } else if (type === "EURD") {
          const matchedSheetName = workbook.SheetNames.find(s => s.toLowerCase().trim() === "eu reference dates list");
          if (!matchedSheetName) throw new Error("No se encontró la hoja 'EU reference dates list' en el archivo.");
          
          const eurdSheet = workbook.Sheets[matchedSheetName];
          const rows = XLSX.utils.sheet_to_json(eurdSheet, { header: 1, defval: "" });
          
          if (rows.length < 18) throw new Error("El archivo EURDList no tiene suficientes filas de datos.");
          
          // Formateador de fecha Excel serial a DD/MM/YYYY
          const formatExcelDateLocal = (val) => {
            if (val === undefined || val === null || val === "") return "";
            if (typeof val === 'number') {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            }
            return String(val).trim();
          };

          const dataStartIdx = 18;
          for (let i = dataStartIdx; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            if (row[0] === undefined || String(row[0]).trim() === "") continue;
            if (row[1] === undefined || String(row[1]).trim() === "") continue;
            
            cleanData.push({
              id: String(row[0]).trim(),
              active_substance: String(row[1]).trim().toLowerCase(),
              active_substance_display: String(row[1]).trim(),
              eurd: formatExcelDateLocal(row[2]),
              frequency: String(row[3]).trim(),
              dlp: formatExcelDateLocal(row[4]),
              submission_date: formatExcelDateLocal(row[5])
            });
          }
          if (cleanData.length === 0) throw new Error("No se pudieron extraer registros válidos de la lista EURD.");
        } else if (type === "CIE10") {
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          if (rawJson.length === 0) throw new Error("El archivo está vacío.");
          cleanData = rawJson.map(r => {
            const rowStrKeys = Object.keys(r).reduce((acc, key) => { acc[key.toUpperCase().trim()] = r[key]; return acc; }, {});
            return {
              CIE10: String(rowStrKeys.CIE10 || rowStrKeys.CÓDIGO || rowStrKeys.CODIGO || "").trim(),
              DESCRIPCION: String(rowStrKeys.DESCRIPCION || rowStrKeys.DESCRIPCIÓN || rowStrKeys.NOMBRE || "").trim(),
              ESTADO: String(rowStrKeys.ESTADO || "ACTIVO").trim().toUpperCase(),
              "COTEJO (SEXO)": String(rowStrKeys["COTEJO (SEXO)"] || rowStrKeys.COTEJO || "AMBOS").trim()
            };
          }).filter(r => r.CIE10 && r.DESCRIPCION);
          if (cleanData.length === 0) throw new Error("Columnas CIE-10 no válidas.");
        }

        setParsedData(cleanData);
        setStatus({
          type: "success",
          message: `¡Archivo ${type} procesado! Se cargaron ${cleanData.length} registros. Presiona "Guardar".`
        });
      } catch (error) {
        setStatus({ type: "error", message: `Error: ${error.message}` });
        setFile(null);
        setParsedData([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(fileToProcess);
  };

  const handleFileInputATC = (e) => processFile(e.target.files[0], "ATC");
  const handleFileInputProductos = (e) => processFile(e.target.files[0], "PRODUCTOS");
  const handleFileInputEURD = (e) => processFile(e.target.files[0], "EURD");
  const handleFileInputCIE10 = (e) => processFile(e.target.files[0], "CIE10");

  const handleSaveToProject = async () => {
    if (parsedData.length === 0) return;
    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      let endpoint = "http://127.0.0.1:5000/api/save-atc";
      if (activeUploadType === "PRODUCTOS") {
        const cliente = clientesConfig.find(c => c.id === selectedCliente);
        endpoint = `http://127.0.0.1:5000/api/save-productos/${cliente.catalogos.productosFile}`;
      } else if (activeUploadType === "EURD") {
        endpoint = "http://127.0.0.1:5000/api/save-eurd";
      } else if (activeUploadType === "CIE10") {
        endpoint = "http://127.0.0.1:5000/api/save-cie10";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });

      const resData = await response.json();
      if (resData.success) {
        setStatus({ type: "success", message: `🎉 Dataset guardado correctamente en el proyecto.` });
        setFile(null);
        setParsedData([]);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(resData.error || "Ocurrió un error al guardar.");
      }
    } catch (error) {
      setStatus({ type: "error", message: `Error al guardar: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setStatus({ type: "", message: "" });
    setActiveUploadType(null);
  };

  const downloadSampleTemplateATC = () => {
    const worksheet = XLSX.utils.json_to_sheet([{ atc_code: "A01AA01", atc_name: "sodium fluoride", ddd: "1.1", uom: "mg", adm_r: "O", note: "0.5 mg fluoride", TRAD: "FLUORURO DE SOCIO" }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WHO ATC-DDD");
    XLSX.writeFile(workbook, "plantilla_atc.xlsx");
  };

  // Filtros ATC
  const filteredATC = useMemo(() => {
    if (!tableSearchQuery.trim()) return atcData;
    const q = tableSearchQuery.toLowerCase();
    return atcData.filter(i => (i.atc_code?.toLowerCase().includes(q) || i.TRAD?.toLowerCase().includes(q) || i.atc_name?.toLowerCase().includes(q)));
  }, [tableSearchQuery]);

  const paginatedATC = filteredATC.slice((tablePage - 1) * itemsPerPage, tablePage * itemsPerPage);

  // Filtros CIE-10
  const filteredCIE10 = useMemo(() => {
    if (!tableSearchQueryCie10.trim()) return cie10Data;
    const q = tableSearchQueryCie10.toLowerCase();
    return cie10Data.filter(i => (
      i.CIE10?.toLowerCase().includes(q) || 
      i.DESCRIPCION?.toLowerCase().includes(q)
    ));
  }, [tableSearchQueryCie10]);

  const paginatedCIE10 = filteredCIE10.slice((tablePageCie10 - 1) * itemsPerPage, tablePageCie10 * itemsPerPage);

  // Filtros EURD y PRODUCTOS comentados para futuros desarrollos
  // ...

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto px-4 py-8">
      {/* HEADER PRINCIPAL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-700 p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Database size={14} /> Sistema de Catálogos de Referencia
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Catálogos & Configuración</h1>
          <p className="text-primary-100 max-w-2xl text-sm leading-relaxed">
            Administra los conjuntos de datos del proyecto de manera ágil. Sube plantillas para el autocompletado global o específico por cliente.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-white/10 to-transparent pointer-events-none transform translate-x-12 translate-y-12"></div>
      </div>

      <div className="flex space-x-2 border-b pb-2">
        <Button variant={activeTab === "catalogos" ? "default" : "outline"} onClick={() => setActiveTab("catalogos")} className="bg-primary-600 text-white">
          <Database size={16} className="mr-2" /> Catálogos
        </Button>
        {/* Ocultos para desarrollos futuros:
        {hasAdminAccess && (
          <Button variant={activeTab === "usuarios" ? "default" : "outline"} onClick={() => setActiveTab("usuarios")}>
            <UserSquare size={16} className="mr-2" /> Usuarios
          </Button>
        )}
        <Button variant={activeTab === "clientes" ? "default" : "outline"} onClick={() => setActiveTab("clientes")}>
          <Package size={16} className="mr-2" /> Clientes
        </Button>
        */}
      </div>

      {activeTab === "catalogos" && (
        <>
          {status.message && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all duration-300 animate-fadeIn ${
          status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {status.type === "success" ? <CheckCircle2 className="mt-0.5 text-emerald-600 shrink-0" size={20} /> : <AlertCircle className="mt-0.5 text-red-600 shrink-0" size={20} />}
          <div className="space-y-1 flex-1">
            <p className="text-sm font-semibold">{status.type === "success" ? "Operación Exitosa" : "Error Detectado"}</p>
            <p className="text-xs leading-relaxed opacity-95">{status.message}</p>
          </div>
          <button onClick={() => setStatus({ type: "", message: "" })} className="text-xs font-medium hover:underline opacity-80 transition-opacity">Cerrar</button>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight text-text-main">Catálogos Disponibles</h2>
            <p className="text-xs text-text-muted">Espacio optimizado para múltiples índices clínicos y sanitarios.</p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGO 1: ATC / DDD */}
        {/* ============================================================== */}
        <div className="rounded-2xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md border-border">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm"><Database size={24} /></div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-800">Clasificación ATC / DDD (OMS)</h3>
                  {atcData && atcData.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>ACTIVO</span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>SIN DATOS</span>
                  )}
                </div>
                <p className="text-xs text-text-muted">Clasificación oficial de fármacos según órganos y dosis diarias de la OMS.</p>
                <p className="text-[11px] font-semibold text-text-muted mt-1.5">Registros: <span className="font-mono text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md">{atcData?.length || 0} filas</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <input type="file" id="cat-atc-up" accept=".xlsx,.xls,.csv" onChange={handleFileInputATC} className="hidden" />
                <label htmlFor="cat-atc-up" className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><UploadCloud size={18} /></label>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">Subir Dataset ATC</div>
              </div>
              <div className="relative group">
                <button onClick={() => { if (atcData?.length) setShowLiveTable(!showLiveTable); }} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${showLiveTable ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`} disabled={!atcData?.length}>
                  {showLiveTable ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">{showLiveTable ? "Ocultar" : "Ver"} tabla</div>
              </div>
              <div className="relative group">
                <button onClick={downloadSampleTemplateATC} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 border hover:bg-slate-600 hover:text-white transition-all"><FileDown size={18} /></button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">Descargar Plantilla</div>
              </div>
            </div>
          </div>

          {showLiveTable && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <input type="text" value={tableSearchQuery} onChange={e => {setTableSearchQuery(e.target.value); setTablePage(1);}} placeholder="Buscar ATC..." className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border mb-4 focus:ring-2 focus:ring-primary-500" />
              <table className="w-full text-left text-[11px] bg-white border">
                <thead className="bg-slate-100 border-b"><tr className="font-bold text-[9px] uppercase"><th className="p-2">ATC</th><th className="p-2">Activo</th><th className="p-2">Inglés</th><th className="p-2">DDD</th></tr></thead>
                <tbody className="divide-y">
                  {paginatedATC.map((r, i) => (<tr key={i}><td className="p-2 font-mono font-bold text-primary-600">{r.atc_code}</td><td className="p-2">{r.TRAD}</td><td className="p-2 text-slate-500">{r.atc_name}</td><td className="p-2 font-mono">{r.ddd}</td></tr>))}
                </tbody>
              </table>
              <div className="mt-2 text-right">
                <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1} className="mr-2 text-xs">Anterior</button>
                <button onClick={() => setTablePage(p => p + 1)} disabled={tablePage * itemsPerPage >= filteredATC.length} className="text-xs">Siguiente</button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGO 2: CIE-10 */}
        {/* ============================================================== */}
        <div className="rounded-2xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md border-border">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><Database size={24} /></div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-800">Clasificación Internacional de Enfermedades (CIE-10)</h3>
                  {cie10Data && cie10Data.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>ACTIVO</span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>SIN DATOS</span>
                  )}
                </div>
                <p className="text-xs text-text-muted">Catálogo para la codificación de enfermedades e indicaciones diagnósticas.</p>
                <p className="text-[11px] font-semibold text-text-muted mt-1.5">Registros: <span className="font-mono text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md">{cie10Data?.length || 0} filas</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <input type="file" id="cat-cie10-up" accept=".xlsx,.xls,.csv" onChange={handleFileInputCIE10} className="hidden" />
                <label htmlFor="cat-cie10-up" className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><UploadCloud size={18} /></label>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">Actualizar Dataset CIE-10</div>
              </div>
              <div className="relative group">
                <button onClick={() => { if (cie10Data?.length) setShowLiveTableCie10(!showLiveTableCie10); }} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${showLiveTableCie10 ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`} disabled={!cie10Data?.length}>
                  {showLiveTableCie10 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">{showLiveTableCie10 ? "Ocultar" : "Ver"} tabla</div>
              </div>
            </div>
          </div>

          {showLiveTableCie10 && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <input type="text" value={tableSearchQueryCie10} onChange={e => {setTableSearchQueryCie10(e.target.value); setTablePageCie10(1);}} placeholder="Buscar Código o Descripción..." className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border mb-4 focus:ring-2 focus:ring-primary-500" />
              <table className="w-full text-left text-[11px] bg-white border">
                <thead className="bg-slate-100 border-b"><tr className="font-bold text-[9px] uppercase"><th className="p-2 w-24">CIE-10</th><th className="p-2">Descripción</th><th className="p-2 w-24">Estado</th><th className="p-2 w-24">Cotejo</th></tr></thead>
                <tbody className="divide-y">
                  {paginatedCIE10.map((r, i) => (
                    <tr key={i} className={r.ESTADO !== 'ACTIVO' ? 'bg-gray-50/50' : ''}>
                      <td className="p-2 font-mono font-bold text-blue-600">{r.CIE10}</td>
                      <td className={`p-2 ${r.ESTADO !== 'ACTIVO' ? 'text-gray-400' : 'text-slate-800'}`}>{r.DESCRIPCION}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.ESTADO === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {r.ESTADO}
                        </span>
                      </td>
                      <td className="p-2 text-slate-500">{r['COTEJO (SEXO)']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-right">
                <button onClick={() => setTablePageCie10(p => Math.max(1, p - 1))} disabled={tablePageCie10 === 1} className="mr-2 text-xs">Anterior</button>
                <button onClick={() => setTablePageCie10(p => p + 1)} disabled={tablePageCie10 * itemsPerPage >= filteredCIE10.length} className="text-xs">Siguiente</button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGOS FUTUROS OCULTOS AQUÍ */}
        {/* ============================================================== */}
        {false && (
          <>
            {/* Aquí iba el Catálogo 2 de Productos y el Catálogo 3 de EURD */}
          </>
        )}

        {/* VISTA COMPARTIDA: PANEL DE VISTA PREVIA (Mapeo preliminar para ambos catálogos) */}
        {parsedData.length > 0 && (
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-6 animate-slideDown space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-200">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-indigo-600 animate-pulse" size={18}/> Vista Previa de Carga: {activeUploadType}</h4>
                <p className="text-[11px] text-text-muted">Se validó la estructura de <strong>{file?.name}</strong>. ({parsedData.length} filas extraídas)</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetForm} size="sm" className="h-8 text-xs bg-white text-indigo-700" disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSaveToProject} size="sm" className="h-8 text-xs bg-primary-600 hover:bg-primary-700 text-white" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar en Proyecto"}</Button>
              </div>
            </div>
            
            <div className="overflow-x-auto bg-white border border-indigo-100 rounded-lg">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 border-b font-bold uppercase text-slate-500 text-[8px]">
                  <tr>
                    {Object.keys(parsedData[0] || {}).slice(0, 7).map(k => <th key={k} className="p-2">{k}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {parsedData.slice(0, 3).map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(row).slice(0, 7).map(k => <td key={k} className="p-2 max-w-[120px] truncate">{row[k]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      </>
      )}

      {/* Oculto temporalmente:
      {activeTab === "usuarios" && hasAdminAccess && <UsersConfig />}
      {activeTab === "clientes" && <ClientsConfig />}
      */}
    </div>
  );
}

