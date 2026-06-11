import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../Components/ui/card';
import { Button } from '../Components/ui/button';
import { Input } from '../Components/ui/input';
import { Search, Calendar, Database, FileText, CheckSquare, Copy, CheckCircle2, FileX, Filter, Loader2, PlayCircle, X, ExternalLink } from 'lucide-react';
import PubMedService from '../services/pubmedService';
import SpringerService from '../services/springerService';
import { useSearchStore } from '../store/searchStore';

// Hook personalizado para clics fuera del dropdown
function useOutsideClick(ref, callback) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
}

export default function SearchExecutions() {
  // === ESTADOS ===
  const [ifas, setIfas] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [availableStrategies, setAvailableStrategies] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  const [activeTab, setActiveTab] = useState('PUBMED');
  const [pubmedData, setPubmedData] = useState({ count: 0, articles: [] });
  const [springerData, setSpringerData] = useState({ count: 0, articles: [] });

  // Efecto para cambiar la tabla según el tab
  useEffect(() => {
    if (activeTab === 'PUBMED') {
      setArticles(pubmedData.articles);
    } else {
      setArticles(springerData.articles);
    }
  }, [activeTab, pubmedData, springerData]);

  // Estados Globales (Zustand)
  const { 
    selectedIfa, setSelectedIfa, 
    selectedStrategy, setSelectedStrategy, 
    articles, setArticles, 
    isLoading, setIsLoading, 
    totalPubMedCount, setTotalPubMedCount, 
    toast, setToast,
    toggleTriaje, toggleTriajeAll, setInclusion 
  } = useSearchStore();

  // Estados para inputs de búsqueda (Autocomplete)
  const [ifaSearchTerm, setIfaSearchTerm] = useState("");
  const [showIfaDropdown, setShowIfaDropdown] = useState(false);
  const ifaRef = useRef(null);
  useOutsideClick(ifaRef, () => setShowIfaDropdown(false));

  const [strategySearchTerm, setStrategySearchTerm] = useState("");
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const strategyRef = useRef(null);
  useOutsideClick(strategyRef, () => setShowStrategyDropdown(false));

  // === CARGAR DATOS BASE ===
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/data');
        const dbData = await response.json();

        setIfas(Array.isArray(dbData.ifas) ? dbData.ifas : []);
        setStrategies(Array.isArray(dbData.strategies) ? dbData.strategies : []);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, []);

  // === ACTUALIZAR ESTRATEGIAS CUANDO CAMBIA EL IFA ===
  useEffect(() => {
    if (selectedIfa && strategies.length > 0) {
      const filtered = strategies.filter(s => String(s.ifa_id) === String(selectedIfa.id));
      setAvailableStrategies(filtered);
      
      // Si la estrategia actual ya no pertenece a este IFA (o si no hay una seleccionada), limpiar
      if (!selectedStrategy || String(selectedStrategy.ifa_id) !== String(selectedIfa.id)) {
        setSelectedStrategy(null);
        setStrategySearchTerm("");
        setArticles([]);
        setPubmedData({ count: 0, articles: [] });
        setSpringerData({ count: 0, articles: [] });
        setTotalPubMedCount(0);
      }
    } else if (!selectedIfa) {
      setAvailableStrategies([]);
    }
  }, [selectedIfa, strategies]);

  // === FILTRADO PARA AUTOCOMPLETAR ===
  const filteredIfas = ifas.filter(ifa => 
    (ifa.ifa_name || ifa.IFA_Name || "").toLowerCase().includes(ifaSearchTerm.toLowerCase()) ||
    (ifa.atc_code || "").toLowerCase().includes(ifaSearchTerm.toLowerCase())
  );

  const filteredStrategies = availableStrategies.filter(strat => 
    (strat.strategy_name || "").toLowerCase().includes(strategySearchTerm.toLowerCase()) ||
    (strat.strategy_category || strat.category || "").toLowerCase().includes(strategySearchTerm.toLowerCase())
  );

  // === MANEJADORES DE SELECCIÓN ===
  const handleSelectIfa = (ifa) => {
    setSelectedIfa(ifa);
    setIfaSearchTerm(ifa.ifa_name || ifa.IFA_Name);
    setShowIfaDropdown(false);
  };

  const handleSelectStrategy = (strat) => {
    setSelectedStrategy(strat);
    setStrategySearchTerm(strat.strategy_name);
    setShowStrategyDropdown(false);
  };

  const handleIfaSearchChange = (e) => {
    setIfaSearchTerm(e.target.value);
    setShowIfaDropdown(true);
    if (e.target.value === "") {
      setSelectedIfa(null);
    }
  };

  const handleStrategySearchChange = (e) => {
    setStrategySearchTerm(e.target.value);
    setShowStrategyDropdown(true);
    if (e.target.value === "") {
      setSelectedStrategy(null);
    }
  };

  // === EJECUCIÓN DE LA API ===
  const handleExecuteSearch = async () => {
    const query = selectedStrategy?.query_text || selectedStrategy?.strategy_name;
    if (!query) return;
    
    setIsLoading(true);
    setArticles([]); // Limpiar previos
    
    try {
      if (activeTab === 'PUBMED') {
        const pubmedResults = await PubMedService.executeFullSearch(query, 20);
        setPubmedData({ count: pubmedResults.count, articles: pubmedResults.articles });
        setArticles(pubmedResults.articles);
        setTotalPubMedCount(pubmedResults.count);
        
        setToast(`Búsqueda en PubMed completada. ${pubmedResults.articles.length} artículos recuperados.`);
      } else {
        const springerResults = await SpringerService.executeFullSearch(query, 20);
        setSpringerData({ count: springerResults.count, articles: springerResults.articles });
        setArticles(springerResults.articles);
        setTotalPubMedCount(springerResults.count);
        
        setToast(`Búsqueda en Springer completada. ${springerResults.articles.length} artículos recuperados.`);
      }
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      setToast(`Error al conectar con ${activeTab}. Por favor intente nuevamente.`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // === MANEJADORES DE LA TABLA ===
  // Manejados ahora internamente o mediante Zustand
  const handleTriajeChange = (index) => toggleTriaje(index);
  const handleTriajeAllChange = (checked) => toggleTriajeAll(checked);
  const handleInclusionChange = (index, value) => setInclusion(index, value);

  const copiarAlPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      alert("✅ Prompt copiado al portapapeles. ¡Pégalo en Claude/ChatGPT!");
    } catch (err) {
      alert("❌ Error al copiar");
    }
  };

  const generarPromptIndividual = (row) => {
    const ifaName = selectedIfa?.ifa_name || selectedIfa?.IFA_Name;
    const currentIndicacion = selectedStrategy?.strategy_category || selectedStrategy?.category;
    
    if (!ifaName || !currentIndicacion) {
      alert("⚠️ No se ha detectado IFA o Indicación. Verifica la Sección A.");
      return;
    }

    const cleanId = row.id ? String(row.id).replace(/\D/g, '') : 'N/A';

    const prompt = `Para el artículo con PMID: ${cleanId}, titulado "${row.title || 'N/A'}", disponible en: https://pubmed.ncbi.nlm.nih.gov/${cleanId}/

Indica si evalúa la eficacia y/o seguridad de ${ifaName} en ${currentIndicacion}.

Responder en español:

Si SÍ evalúa:
1. Tipo de estudio
2. Objetivo, población y brazos de tratamiento (colocalo en tiempo pasado)
3. Lista de resultados con sus datos numéricos por cada outcome medido (a modo de párrafo resumido)
4. Qué se puede concluir del estudio

Si NO evalúa:
- Indicar exclusión + motivo

Abstract:
${row.abstract || 'N/A'}`;

    copiarAlPortapapeles(prompt);
  };

  const loadedArticlesCount = articles.length;
  const pendingArticles = articles.filter(a => !a.inclusion).length;
  const allSelectedTriaje = articles.length > 0 && articles.every(a => a.triaje);

  // Obtener la fecha de hoy para "Última Ejecución"
  const todayDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');

  return (
    <div className="p-8 h-full flex flex-col gap-6 bg-gray-50/50 overflow-x-hidden relative">
      
      {toast && (
        <div className={`fixed top-6 right-6 z-[300] px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10 duration-300 ${toast.includes("Error") ? "bg-red-600 text-white" : "bg-gray-900 text-white"}`}>
          <CheckCircle2 size={20} className={toast.includes("Error") ? "text-red-200" : "text-green-400"} />
          <span className="font-semibold text-sm">{toast}</span>
        </div>
      )}

      {/* Título */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Ejecución de <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">Búsquedas</span>
        </h1>
      </div>

      {/* SECCIÓN 1: CABECERA Y TARJETA DE CONTEXTO */}
      <div className="flex flex-col gap-6">
        
        {/* Parámetros de Selección */}
        <div className="w-full flex flex-col gap-4">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                <Filter size={16} className="text-violet-600" /> Parámetros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              
              <div className="relative" ref={ifaRef}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Buscar IFA</label>
                <div className="relative">
                  <Input 
                    placeholder="Escribe el nombre del IFA o ATC..."
                    value={ifaSearchTerm}
                    onChange={handleIfaSearchChange}
                    onFocus={() => setShowIfaDropdown(true)}
                    className="pr-8 bg-gray-50 focus:bg-white"
                  />
                  <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {showIfaDropdown && (
                  <ul className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredIfas.length > 0 ? filteredIfas.map(ifa => (
                      <li 
                        key={ifa.id} 
                        onClick={() => handleSelectIfa(ifa)}
                        className="px-3 py-2 hover:bg-violet-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                      >
                        <span className="font-semibold text-sm text-gray-800">{ifa.ifa_name || ifa.IFA_Name}</span>
                        <span className="text-xs text-gray-500 font-mono">{ifa.atc_code}</span>
                      </li>
                    )) : <li className="px-3 py-4 text-center text-sm text-gray-500">No se encontraron IFAs</li>}
                  </ul>
                )}
              </div>

              <div className="relative" ref={strategyRef}>
                <label className={`text-xs font-semibold mb-1 block ${!selectedIfa ? 'text-gray-400' : 'text-gray-600'}`}>
                  Buscar Estrategia
                </label>
                <div className="relative">
                  <Input 
                    placeholder="Escribe la estrategia o categoría..."
                    value={strategySearchTerm}
                    onChange={handleStrategySearchChange}
                    onFocus={() => setShowStrategyDropdown(true)}
                    disabled={!selectedIfa}
                    className="pr-8 bg-gray-50 focus:bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {showStrategyDropdown && selectedIfa && (
                  <ul className="absolute z-[90] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredStrategies.length > 0 ? filteredStrategies.map(strat => (
                      <li 
                        key={strat.id} 
                        onClick={() => handleSelectStrategy(strat)}
                        className="px-3 py-2 hover:bg-violet-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                      >
                        <span className="font-semibold text-sm text-gray-800">{strat.strategy_category || strat.category}</span>
                      </li>
                    )) : <li className="px-3 py-4 text-center text-sm text-gray-500">No se encontraron estrategias</li>}
                  </ul>
                )}
              </div>

              {selectedStrategy && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">PICO Search (Query)</label>
                  <div className="relative">
                    <textarea 
                      readOnly
                      value={selectedStrategy.query_text || selectedStrategy.strategy_name}
                      className="w-full text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 min-h-[80px] max-h-[150px] custom-scrollbar focus:outline-none"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6 rounded-md hover:bg-gray-200"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedStrategy.query_text || selectedStrategy.strategy_name);
                        setToast("Query copiado al portapapeles");
                        setTimeout(() => setToast(null), 3000);
                      }}
                      title="Copiar PICO Query"
                    >
                      <Copy size={12} className="text-gray-500" />
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Resumen de Contexto Ligero + Botón Ejecutar */}
        <div className="w-full h-full">
          {selectedIfa && selectedStrategy ? (
            <Card className="h-full bg-white border border-gray-200 shadow-sm flex flex-col justify-center">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Database size={14} className="text-violet-600" />
                      <span className="text-violet-600 text-xs font-bold uppercase tracking-wider">Contexto de la Estrategia</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{selectedIfa.ifa_name || selectedIfa.IFA_Name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md text-[10px] font-bold uppercase">
                        {selectedStrategy.strategy_category || selectedStrategy.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Ejecución</span>
                        <span className="text-sm font-semibold text-gray-800">{totalPubMedCount > 0 ? todayDate : '--/--/----'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><FileText size={12}/> Descargados</span>
                        <span className="text-sm font-bold text-blue-600">{loadedArticlesCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><CheckSquare size={12}/> Pendientes</span>
                        <span className="text-sm font-bold text-amber-500">{pendingArticles}</span>
                      </div>
                    </div>
                    
                    {/* Botón de Ejecución a PubMed */}
                    <Button 
                      onClick={handleExecuteSearch} 
                      disabled={isLoading}
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2"
                    >
                      {isLoading ? (
                        <><Loader2 size={18} className="animate-spin" /> Buscando...</>
                      ) : (
                        <><PlayCircle size={18} /> Ejecutar Búsqueda</>
                      )}
                    </Button>
                  </div>

                </div>
                
                {/* Mensaje Informativo si la estrategia tiene muchos resultados */}
                {totalPubMedCount > loadedArticlesCount && (
                  <div className="mt-4 px-3 py-2 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100 flex items-center gap-2">
                    <Database size={14} /> PubMed encontró <strong>{totalPubMedCount}</strong> artículos totales para esta estrategia. Se están visualizando los primeros {loadedArticlesCount} resultados (Best Match).
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full bg-gray-50/50 border border-dashed border-gray-300 shadow-none flex items-center justify-center p-6">
              <p className="text-sm text-gray-500 font-medium">Selecciona IFA y Estrategia para ver el contexto</p>
            </Card>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: TABS Y TABLA PRINCIPAL (Siempre visible, muestra empty state si no hay datos) */}
      <div className="flex gap-2 w-full mt-4">
        <Button 
          variant={activeTab === 'PUBMED' ? 'default' : 'outline'}
          onClick={() => setActiveTab('PUBMED')}
          className={activeTab === 'PUBMED' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-gray-600 border-gray-300'}
        >
          PubMed ({pubmedData.count})
        </Button>
        <Button 
          variant={activeTab === 'SPRINGER' ? 'default' : 'outline'}
          onClick={() => setActiveTab('SPRINGER')}
          className={activeTab === 'SPRINGER' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-gray-600 border-gray-300'}
        >
          Springer ({springerData.count})
        </Button>
      </div>

      <Card className="shadow-lg border-0 ring-1 ring-gray-200 flex-1 flex flex-col overflow-hidden min-h-[400px] mt-2">
        <CardHeader className="bg-white border-b border-gray-100 py-3 px-5 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-lg text-gray-800">Tabla de Revisión</CardTitle>
            <CardDescription className="text-xs">Triaje y categorización de artículos recuperados desde PubMed.</CardDescription>
          </div>
          {selectedStrategy && loadedArticlesCount > 0 && pendingArticles === 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-green-200">
              <CheckCircle2 size={14} /> Revisión Completa
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar bg-white relative">
          
          {/* Overlay de Carga */}
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center">
              <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
              <p className="text-sm font-bold text-gray-800">Conectando con {activeTab === 'PUBMED' ? 'PubMed' : 'Springer'} API...</p>
              <p className="text-xs text-gray-500">Recuperando y analizando resultados</p>
            </div>
          )}

          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
              <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-16 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                    checked={allSelectedTriaje}
                    onChange={(e) => handleTriajeAllChange(e.target.checked)}
                    disabled={articles.length === 0}
                  />
                </th>
                <th className="px-4 py-3 w-32">ID</th>
                <th className="px-4 py-3 w-20">Año</th>
                <th className="px-4 py-3 min-w-[300px]">Título</th>
                <th className="px-4 py-3 w-32 text-center">Análisis</th>
                <th className="px-4 py-3 w-40 text-center">Inclusión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!selectedStrategy ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <FileX size={40} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-base font-semibold text-gray-400">Esperando parámetros de búsqueda</p>
                    <p className="text-sm text-gray-400 mt-1">Busca y selecciona un IFA y una Estrategia arriba.</p>
                  </td>
                </tr>
              ) : articles.length > 0 ? (
                articles.map((article, index) => (
                  <tr key={article.id} className={`group transition-colors ${article.inclusion === 'Incluido' ? 'bg-green-50/40' : article.inclusion === 'Excluido' ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                    {/* Triaje */}
                    <td className="px-4 py-3 text-center align-middle">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                        checked={article.triaje}
                        onChange={() => handleTriajeChange(index)}
                      />
                    </td>

                    {/* ID & Year */}
                    <td className="px-4 py-3 align-middle text-sm font-mono text-indigo-600 font-semibold">{article.id}</td>
                    <td className="px-4 py-3 align-middle text-sm font-medium text-gray-900">{article.year}</td>

                    {/* Title */}
                    <td className="px-4 py-3 align-middle max-w-md">
                      <p className="text-sm font-bold text-gray-900 mb-1 leading-tight group-hover:text-indigo-700 transition-colors">
                        {article.title}
                      </p>
                      <div className="text-xs text-gray-600 line-clamp-2 italic border-l-2 border-indigo-200 pl-2">
                        {article.abstract}
                      </div>
                    </td>

                    {/* Análisis y Detalle */}
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="flex flex-col gap-1.5 items-center justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-24 justify-start text-violet-600 hover:text-violet-700 hover:bg-violet-100 font-semibold text-[11px] border border-transparent hover:border-violet-200"
                          onClick={() => generarPromptIndividual(article)}
                          title="Copiar Prompt para LLM"
                        >
                          <Copy size={14} className="mr-1.5 shrink-0" /> Prompt
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-24 justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-transparent hover:border-blue-200"
                          onClick={() => setSelectedArticle(article)}
                          title="Ver Detalle"
                        >
                          <FileText size={14} className="mr-1.5 shrink-0" /> Detalle
                        </Button>
                      </div>
                    </td>

                    {/* Inclusión */}
                    <td className="px-4 py-3 text-center align-middle">
                      <select
                        className={`w-full h-8 px-1 text-[11px] font-bold rounded-md border focus:ring-2 focus:outline-none transition-colors cursor-pointer appearance-none text-center
                          ${article.inclusion === 'Incluido' 
                            ? 'bg-green-100 border-green-200 text-green-800 focus:ring-green-500' 
                            : article.inclusion === 'Excluido' 
                            ? 'bg-red-100 border-red-200 text-red-800 focus:ring-red-500' 
                            : 'bg-white border-gray-300 text-gray-600 focus:ring-indigo-500 hover:bg-gray-50'
                          }`}
                        value={article.inclusion}
                        onChange={(e) => handleInclusionChange(index, e.target.value)}
                      >
                        <option value="">Seleccione...</option>
                        <option value="Incluido">✅ Incluido</option>
                        <option value="Excluido">❌ Excluido</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                    <Database size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-900">Listo para buscar</p>
                    <p className="text-xs text-gray-500 mt-1">Presiona "Ejecutar Búsqueda" para recuperar los artículos desde PubMed.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* PANEL LATERAL DE DETALLES DEL ARTICULO */}
      {selectedArticle && (
        <>
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] transition-opacity"
            onClick={() => setSelectedArticle(null)}
          />
          <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-[210] flex flex-col border-l border-gray-200 transform transition-transform duration-300 translate-x-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Detalles del Estudio</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedArticle(null)}
                className="h-8 w-8 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={18} />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-md uppercase tracking-wide">
                    {selectedArticle.pubType || 'Estudio Clínico'}
                  </span>
                  <span className="text-sm font-semibold text-gray-500">{selectedArticle.year}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">{selectedArticle.title}</h2>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p><strong className="text-gray-700">PMID:</strong> <span className="text-indigo-600 font-mono font-medium">{selectedArticle.id}</span></p>
                  {selectedArticle.doi && <p><strong className="text-gray-700">DOI:</strong> <span className="text-gray-600 font-mono">{selectedArticle.doi}</span></p>}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-violet-500"/> Abstract Completo
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed text-justify whitespace-pre-wrap">
                  {selectedArticle.abstract || "No se encontró abstract disponible para este artículo."}
                </p>
              </div>

              <div className="pt-6 pb-2 border-t border-gray-100">
                <a 
                  href={`https://pubmed.ncbi.nlm.nih.gov/${selectedArticle.id ? String(selectedArticle.id).replace(/\D/g, '') : ''}/`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  Ver artículo original en PubMed <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
