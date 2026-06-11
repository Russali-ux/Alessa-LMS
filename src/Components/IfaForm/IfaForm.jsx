import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Accordion } from '../ui/Accordion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { AlertConfirm } from '../ui/AlertConfirm';
import cie10Data from '../../Data/cie10_data.json';
import atcData from '../../Data/atc_data.json';

// Componente de Autocompletado para CIE-10
const Cie10Autocomplete = ({ value, onChangeCode, onChangeName }) => {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = query.trim() ? cie10Data.filter(i => 
    i.CIE10.toLowerCase().includes(query.toLowerCase()) || 
    i.DESCRIPCION.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 30) : [];

  return (
    <div className="relative">
      <Input 
        placeholder="Buscar por código o enfermedad..." 
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && query.trim() && filtered.length > 0 && (
        <div className="absolute z-50 w-[150%] md:w-[200%] mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-auto">
          {filtered.map((item, idx) => {
            const isInactive = item.ESTADO !== "ACTIVO";
            return (
              <div 
                key={idx}
                className={`p-2 text-xs border-b border-gray-100 last:border-0 flex items-center justify-between ${
                  isInactive 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-blue-50 cursor-pointer text-gray-800'
                }`}
                onClick={() => {
                  if (isInactive) return;
                  onChangeCode(item.CIE10);
                  onChangeName(item.DESCRIPCION);
                  setQuery(item.CIE10);
                  setIsOpen(false);
                }}
              >
                <div className="flex-1 pr-2">
                  <span className="font-bold text-blue-600 mr-2">{item.CIE10}</span>
                  {item.DESCRIPCION}
                </div>
                {isInactive && <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded shrink-0">INACTIVO</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Componente de Autocompletado para ATC (IFA)
const AtcAutocomplete = ({ value, onChangeName, onSelect }) => {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const findParentGroup = (code) => {
    if (!code || code.length < 5) return null;
    const parentCode = code.substring(0, 5); // ATC 4 (subgrupo químico/terapéutico/farmacológico) tiene 5 caracteres
    return atcData.find(item => item.atc_code === parentCode) || null;
  };

  const filtered = query.trim().length >= 2 ? atcData.filter(i => 
    (i.atc_name && i.atc_name.toLowerCase().includes(query.toLowerCase())) || 
    (i.TRAD && i.TRAD.toLowerCase().includes(query.toLowerCase())) ||
    (i.atc_code && i.atc_code.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 50) : [];

  return (
    <div className="relative">
      <Input 
        placeholder="Escribe el nombre del principio activo (ej. paracetamol, fluoruro...)" 
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChangeName(e.target.value); // Sincroniza el input libre si no selecciona nada
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full pr-10"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            onChangeName("");
            setIsOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          title="Limpiar IFA"
        >
          <X size={16} />
        </button>
      )}

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const parentGroup = findParentGroup(item.atc_code);
              return (
                <div 
                  key={`${item.atc_code}-${idx}`}
                  className="w-full text-left p-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => {
                    onChangeName(item.TRAD || item.atc_name);
                    setQuery(item.TRAD || item.atc_name);
                    onSelect(item, parentGroup);
                    setIsOpen(false);
                  }}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">
                      {item.TRAD || item.atc_name}
                    </p>
                    {item.TRAD && item.atc_name && (
                      <p className="text-[11px] text-gray-500 italic">{item.atc_name}</p>
                    )}
                    {parentGroup && (
                      <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                        Grupo: {parentGroup.TRAD || parentGroup.atc_name} <span className="font-mono ml-1 text-[10px]">({parentGroup.atc_code})</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 font-bold shrink-0">
                      {item.atc_code}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
             <div className="p-4 text-center text-gray-500 text-sm italic">
               No se encontraron principios activos para "{query}"
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const FREQUENCY_OPTIONS = [
  { value: "Mensual", label: "Mensual" },
  { value: "Trimestral", label: "Trimestral" },
  { value: "Semestral", label: "Semestral" },
  { value: "Anual", label: "Anual" },
  { value: "Una sola vez", label: "Una sola vez" }
];

const CATEGORY_OPTIONS = [
  "Baseline Efficacy",
  "Monitoring Safety",
  "Targeted risk"
];

// Función utilitaria para calcular la próxima fecha
const calculateNextDate = (baseline, freq) => {
  if (!baseline || !freq || freq === "Una sola vez") return baseline || "";
  const date = new Date(baseline);
  if (isNaN(date.getTime())) return "";

  if (freq === "Mensual") date.setDate(date.getDate() + 30);
  else if (freq === "Trimestral") date.setDate(date.getDate() + 90);
  else if (freq === "Semestral") date.setDate(date.getDate() + 180);
  else if (freq === "Anual") date.setDate(date.getDate() + 365);
  
  return date.toISOString().split('T')[0];
};

export default function IfaForm({ isOpen, onClose, initialData, onSave }) {
  // Estado base del formulario
  const [formData, setFormData] = useState({
    ifa_name: "",
    atc4_code: "",
    atc4_name: "",
    atc5_code: "",
    atc5_name: "",
    status: "Activo",
    monitoring_level: "A",
    indications: [],
    baseline_date: "",
    next_execution_date: ""
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [targetedRiskTexts, setTargetedRiskTexts] = useState({});

  // Cargar datos si estamos editando
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({
          ifa_name: "",
          atc4_code: "",
          atc4_name: "",
          atc5_code: "",
          atc5_name: "",
          status: "Activo",
          monitoring_level: "A",
          indications: [],
          baseline_date: "",
          next_execution_date: ""
        });
      }
      setIsDirty(false);
    }
  }, [isOpen, initialData]);

  // Bloquear el scroll de fondo
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  // ----- GESTIÓN DE INDICACIONES -----
  const addIndication = () => {
    setFormData(prev => ({
      ...prev,
      indications: [
        ...prev.indications,
        {
          id: Date.now(),
          free_text: "",
          meddra_term: "",
          meddra_code: "",
          cie10_name: "",
          cie10_code: "",
          strategies: []
        }
      ]
    }));
    setIsDirty(true);
  };

  const updateIndication = (index, field, value) => {
    const updated = [...formData.indications];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  const removeIndication = (index) => {
    const updated = formData.indications.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  // ----- GESTIÓN DE ESTRATEGIAS -----
  const addStrategy = (indIndex) => {
    const updated = [...formData.indications];
    updated[indIndex].strategies.push({
      id: Date.now(),
      pico_search: "",
      categories: [],
      inherits_frequency: true,
      frequency_override: "Mensual",
      override_reason: "",
      human_filter: true,
      lookback_months: 12
    });
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  const updateStrategy = (indIndex, stratIndex, field, value) => {
    const updated = [...formData.indications];
    updated[indIndex].strategies[stratIndex][field] = value;
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  const removeStrategy = (indIndex, stratIndex) => {
    const updated = [...formData.indications];
    updated[indIndex].strategies = updated[indIndex].strategies.filter((_, i) => i !== stratIndex);
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  // ----- MANEJO DE TAGS DE ESTRATEGIA (MULTI-SELECT) -----
  const toggleStrategyCategory = (indIndex, stratIndex, category) => {
    const updated = [...formData.indications];
    const strat = updated[indIndex].strategies[stratIndex];
    
    // Si la categoría base ya existe, o si es targeted risk modificado
    const existsIndex = strat.categories.findIndex(c => c === category || c.startsWith(category + ":"));
    
    if (existsIndex !== -1) {
      strat.categories.splice(existsIndex, 1);
    } else {
      strat.categories.push(category);
    }
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  const handleTargetedRiskText = (indIndex, stratIndex, text) => {
    const key = `${indIndex}-${stratIndex}`;
    setTargetedRiskTexts(prev => ({ ...prev, [key]: text }));
  };

  const addTargetedRisk = (indIndex, stratIndex) => {
    const key = `${indIndex}-${stratIndex}`;
    const text = targetedRiskTexts[key];
    if (!text) return;

    const updated = [...formData.indications];
    const strat = updated[indIndex].strategies[stratIndex];
    
    strat.categories.push(`Targeted risk: ${text}`);
    
    setFormData(prev => ({ ...prev, indications: updated }));
    setTargetedRiskTexts(prev => ({ ...prev, [key]: "" }));
    setIsDirty(true);
  };

  const removeCategoryTag = (indIndex, stratIndex, catIndex) => {
    const updated = [...formData.indications];
    updated[indIndex].strategies[stratIndex].categories.splice(catIndex, 1);
    setFormData(prev => ({ ...prev, indications: updated }));
    setIsDirty(true);
  };

  // ----- AUTO-CÁLCULO DE FECHA -----
  const [globalFreq, setGlobalFreq] = useState("Mensual");

  useEffect(() => {
    if (formData.baseline_date) {
      const next = calculateNextDate(formData.baseline_date, globalFreq);
      setFormData(prev => ({ ...prev, next_execution_date: next }));
    }
  }, [formData.baseline_date, globalFreq]);

  // ----- SELECCIÓN DE ATC -----
  const handleSelectAtc = (item, parentGroup) => {
    if (item.atc_code.length >= 7) {
      // Es un ATC nivel 5 (principio activo)
      setFormData(prev => ({
        ...prev,
        ifa_name: item.TRAD || item.atc_name,
        atc5_code: item.atc_code,
        atc5_name: item.atc_name,
        atc4_code: parentGroup ? parentGroup.atc_code : "",
        atc4_name: parentGroup ? parentGroup.atc_name : ""
      }));
    } else if (item.atc_code.length === 5) {
      // Es un ATC nivel 4 directo
      setFormData(prev => ({
        ...prev,
        ifa_name: item.TRAD || item.atc_name,
        atc5_code: "",
        atc5_name: "",
        atc4_code: item.atc_code,
        atc4_name: item.atc_name
      }));
    } else {
      // Otro nivel ATC
      setFormData(prev => ({
        ...prev,
        ifa_name: item.TRAD || item.atc_name,
        atc5_code: item.atc_code,
        atc5_name: item.atc_name,
        atc4_code: "",
        atc4_name: ""
      }));
    }
    setIsDirty(true);
  };

  // ----- GUARDADO -----
  const handleSave = () => {
    // Armar el payload
    const payload = {
      ifa: {
        id: formData.id,
        ifa_name: formData.ifa_name,
        atc_code: formData.atc4_code || formData.atc5_code, // fallback
        atc4_name: formData.atc4_name,
        atc5_name: formData.atc5_name,
        monitoring_level: formData.monitoring_level,
        status: formData.status
      },
      indications: formData.indications.map(ind => ({
        free_text: ind.free_text,
        meddra_code: ind.meddra_code,
        meddra_term: ind.meddra_term,
        cie10_code: ind.cie10_code,
        cie10_name: ind.cie10_name
      })),
      strategies: formData.indications.flatMap(ind => 
        ind.strategies.map(s => ({
          strategy_name: s.pico_search,
          categories: s.categories,
          inherits_frequency: s.inherits_frequency !== false,
          frequency_override: s.frequency_override || null,
          override_reason: s.override_reason || null,
          human_filter: s.human_filter !== undefined ? s.human_filter : true,
          lookback_months: s.lookback_months || 12,
          indication_reference: ind.meddra_term || ind.free_text
        }))
      ),
      monitoring: {
        baseline_date: formData.baseline_date,
        next_execution_date: formData.next_execution_date,
        default_frequency: globalFreq
      }
    };

    onSave(payload);
    setIsDirty(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex bg-gray-50/95 backdrop-blur-md animate-in fade-in duration-300">
        
        {/* Cabecera pegajosa del formulario */}
        <div className="absolute top-0 left-0 w-full h-20 bg-white border-b border-gray-200 shadow-sm z-10 flex items-center justify-between px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{initialData ? 'Editar Registro IFA' : 'Nuevo Registro IFA'}</h2>
            <p className="text-sm text-gray-500">Completa las secciones del formulario para estructurar el monitoreo.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleClose} className="w-32">Cancelar</Button>
            <Button onClick={handleSave} className="w-40 bg-primary-600 hover:bg-primary-700 text-white shadow-md flex items-center gap-2">
              <CheckCircle2 size={18} /> Guardar
            </Button>
          </div>
        </div>

        {/* Contenedor scrolleable central */}
        <div className="w-full h-full pt-28 pb-20 px-8 overflow-y-auto custom-scrollbar flex justify-center">
          <div className="w-full max-w-5xl space-y-6">

            {/* SECCIÓN 1: INFORMACIÓN GENERAL */}
            <Accordion title="Sección 1. Información General" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nombre IFA</label>
                  <AtcAutocomplete 
                    value={formData.ifa_name} 
                    onChangeName={(val) => handleChange('ifa_name', val)} 
                    onSelect={handleSelectAtc} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ATC 4 Code</label>
                    <Input placeholder="L04AD" value={formData.atc4_code} onChange={e => handleChange('atc4_code', e.target.value)} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ATC 4 Name</label>
                    <Input placeholder="Immunosuppressants" value={formData.atc4_name} onChange={e => handleChange('atc4_name', e.target.value)} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ATC 5 Code</label>
                    <Input placeholder="L04AD02" value={formData.atc5_code} onChange={e => handleChange('atc5_code', e.target.value)} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ATC 5 Name</label>
                    <Input placeholder="Tacrolimus" value={formData.atc5_name} onChange={e => handleChange('atc5_name', e.target.value)} readOnly className="bg-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Estado</label>
                  <select 
                    className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.status} 
                    onChange={e => handleChange('status', e.target.value)}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
            </Accordion>


            {/* SECCIÓN 2: INDICACIONES */}
            <Accordion title={`Sección 2. Indicaciones (${formData.indications.length})`} defaultOpen={true}>
              <div className="space-y-6">
                {formData.indications.map((ind, indIdx) => (
                  <div key={ind.id} className="p-6 bg-gray-50 border border-gray-200 rounded-xl relative shadow-sm transition-all hover:border-primary-200">
                    <button 
                      onClick={() => removeIndication(indIdx)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1.5 shadow-sm"
                      title="Eliminar indicación"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <h4 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                      Indicación #{indIdx + 1}
                    </h4>

                    <div className="space-y-5">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Indicación (Texto libre)</label>
                        <Input placeholder="Descripción general de la indicación" value={ind.free_text} onChange={e => updateIndication(indIdx, 'free_text', e.target.value)} />
                      </div>

                      <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-bold text-gray-800 block">Indicación MedDRA</label>
                          <button 
                            onClick={() => { updateIndication(indIdx, 'meddra_code', ''); updateIndication(indIdx, 'meddra_term', ''); }}
                            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded px-2 py-1"
                            title="Limpiar campos MedDRA"
                          >
                            Limpiar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">MedDRA Code</label>
                            <Input placeholder="Ej. 10006464" value={ind.meddra_code} onChange={e => updateIndication(indIdx, 'meddra_code', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">MedDRA Name (Term)</label>
                            <Input placeholder="Ej. Kidney Transplantation" value={ind.meddra_term} onChange={e => updateIndication(indIdx, 'meddra_term', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-bold text-gray-800 block">Indicación CIE-10</label>
                          <button 
                            onClick={() => { updateIndication(indIdx, 'cie10_code', ''); updateIndication(indIdx, 'cie10_name', ''); }}
                            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded px-2 py-1"
                            title="Limpiar campos CIE-10"
                          >
                            Limpiar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">CIE-10 Code / Búsqueda</label>
                            <Cie10Autocomplete 
                              value={ind.cie10_code} 
                              onChangeCode={(code) => updateIndication(indIdx, 'cie10_code', code)}
                              onChangeName={(name) => updateIndication(indIdx, 'cie10_name', name)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">CIE-10 Name</label>
                            <Input placeholder="Ej. Kidney Transplant Status" value={ind.cie10_name} onChange={e => updateIndication(indIdx, 'cie10_name', e.target.value)} readOnly className="bg-gray-50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addIndication} className="w-full py-6 border-dashed border-2 text-primary-600 hover:bg-primary-50 hover:text-primary-700">
                  <Plus size={20} className="mr-2" /> Agregar Nueva Indicación
                </Button>
              </div>
            </Accordion>


            {/* SECCIÓN 3: ESTRATEGIAS DE BÚSQUEDA */}
            <Accordion title={`Sección 3. Estrategias de Búsqueda`} defaultOpen={true}>
              {formData.indications.length === 0 ? (
                <p className="text-gray-500 italic p-4 text-center bg-gray-50 rounded-lg">Agrega al menos una indicación en la Sección 2 para configurar sus estrategias.</p>
              ) : (
                <div className="space-y-8">
                  {formData.indications.map((ind, indIdx) => (
                    <div key={ind.id} className="border-l-4 border-l-violet-400 pl-6 py-2">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Estrategias para: <span className="text-violet-600">{ind.meddra_term || ind.free_text || `Indicación #${indIdx + 1}`}</span>
                      </h3>
                      
                      <div className="space-y-4 mt-4">
                        {ind.strategies.map((strat, stratIdx) => (
                          <div key={strat.id} className="p-5 bg-white border border-gray-200 rounded-xl relative shadow-sm">
                            <button 
                              onClick={() => removeStrategy(indIdx, stratIdx)}
                              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>

                            <div className="space-y-4 pr-6">
                              <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">PICO search</label>
                                <Textarea 
                                  placeholder="Ingresa la cadena de búsqueda PICO..." 
                                  value={strat.pico_search} 
                                  onChange={e => updateStrategy(indIdx, stratIdx, 'pico_search', e.target.value)}
                                  className="min-h-[80px]"
                                />
                              </div>

                              <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">Categorías de Estrategia</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {CATEGORY_OPTIONS.map(cat => {
                                    // Comprobar si existe la categoría o si es base de targeted risk
                                    const isSelected = cat === "Targeted risk" 
                                      ? strat.categories.some(c => c.startsWith("Targeted risk"))
                                      : strat.categories.includes(cat);
                                    
                                    return (
                                      <button
                                        key={cat}
                                        onClick={() => toggleStrategyCategory(indIdx, stratIdx, cat)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                          isSelected 
                                          ? 'bg-violet-100 text-violet-700 border-violet-200' 
                                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                {/* Mostrar tags seleccionados (útil para ver los de Targeted Risk con texto libre) */}
                                {strat.categories.length > 0 && (
                                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    {strat.categories.map((cat, catIdx) => (
                                      <span key={catIdx} className="inline-flex items-center px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700">
                                        {cat}
                                        <X 
                                          size={14} 
                                          className="ml-1.5 cursor-pointer text-gray-400 hover:text-red-500" 
                                          onClick={() => removeCategoryTag(indIdx, stratIdx, catIdx)}
                                        />
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Input extra para Targeted Risk */}
                                {strat.categories.some(c => c.startsWith("Targeted risk")) && (
                                  <div className="mt-3 flex gap-2">
                                    <Input 
                                      placeholder="Especificar Targeted risk (ej. Nephrotoxicity)" 
                                      value={targetedRiskTexts[`${indIdx}-${stratIdx}`] || ""}
                                      onChange={e => handleTargetedRiskText(indIdx, stratIdx, e.target.value)}
                                      className="h-9 text-sm"
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="secondary" 
                                      onClick={() => addTargetedRisk(indIdx, stratIdx)}
                                    >
                                      Agregar Tag
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4 mt-2">
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <input 
                                      type="checkbox" 
                                      id={`inherit-${indIdx}-${stratIdx}`}
                                      checked={strat.inherits_frequency !== false}
                                      onChange={e => updateStrategy(indIdx, stratIdx, 'inherits_frequency', e.target.checked)}
                                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                    />
                                    <label htmlFor={`inherit-${indIdx}-${stratIdx}`} className="text-sm font-bold text-gray-800">
                                      Heredar frecuencia del IFA
                                    </label>
                                  </div>
                                  
                                  {strat.inherits_frequency !== false ? (
                                    <div className="text-sm text-gray-600 bg-white border border-indigo-100 px-3 py-2 rounded-md shadow-sm inline-block">
                                      Frecuencia efectiva: <span className="font-bold text-indigo-700">{globalFreq}</span>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                      <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1.5 block">Frecuencia Específica</label>
                                        <select 
                                          className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                          value={strat.frequency_override || "Mensual"} 
                                          onChange={e => updateStrategy(indIdx, stratIdx, 'frequency_override', e.target.value)}
                                        >
                                          {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1.5 block">Motivo de Excepción</label>
                                        <Input 
                                          placeholder="Ej. Señal emergente detectada" 
                                          value={strat.override_reason || ""} 
                                          onChange={e => updateStrategy(indIdx, stratIdx, 'override_reason', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Filtro Humanos</label>
                                    <select 
                                      className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                      value={strat.human_filter !== false ? "true" : "false"} 
                                      onChange={e => updateStrategy(indIdx, stratIdx, 'human_filter', e.target.value === "true")}
                                    >
                                      <option value="true">Sí (Solo humanos)</option>
                                      <option value="false">No (Todos)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Lookback (Meses)</label>
                                    <Input 
                                      type="number"
                                      min="1"
                                      className="h-10"
                                      value={strat.lookback_months || 12} 
                                      onChange={e => updateStrategy(indIdx, stratIdx, 'lookback_months', parseInt(e.target.value, 10) || 1)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button variant="ghost" onClick={() => addStrategy(indIdx)} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                          <Plus size={18} className="mr-1.5" /> Agregar Estrategia a esta Indicación
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Accordion>


            {/* SECCIÓN 4: CONFIGURACIÓN DE MONITOREO */}
            <Accordion title="Sección 4. Configuración de Monitoreo" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Frecuencia Base (Cálculo)</label>
                  <select 
                    className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={globalFreq} 
                    onChange={e => setGlobalFreq(e.target.value)}
                  >
                    {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Fecha Baseline</label>
                  <Input 
                    type="date" 
                    value={formData.baseline_date} 
                    onChange={e => handleChange('baseline_date', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Próxima Ejecución (Auto)</label>
                  <div className="w-full h-10 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm flex items-center text-gray-600 font-medium">
                    {formData.next_execution_date || "Esperando fecha baseline..."}
                  </div>
                </div>
              </div>
            </Accordion>

          </div>
        </div>
      </div>

      <AlertConfirm 
        isOpen={showConfirmClose}
        title="Cambios sin guardar"
        message="Tienes información ingresada que no ha sido guardada. Si cierras ahora, perderás todos los cambios."
        confirmText="Sí, salir sin guardar"
        cancelText="Volver al formulario"
        onConfirm={confirmClose}
        onCancel={() => setShowConfirmClose(false)}
      />
    </>
  );
}
