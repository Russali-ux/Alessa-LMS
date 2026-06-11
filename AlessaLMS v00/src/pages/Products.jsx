import React, { useState, useEffect } from 'react';
import DataTable from '../Components/DataTable';
import { Button } from '../Components/ui/button';
import { X, Calendar, BookOpen, Layers, CheckCircle2, Search, ArrowRight, ShieldCheck, Pill } from 'lucide-react';
import IfaForm from '../Components/IfaForm/IfaForm';

// Mock data in case JSONs are empty or fail to load
const mockIFAs = [
  { id: "IFA_001", ifa_name: "Tacrolimus", atc4_name: "Immunosuppressants", atc_code: "L04AD02" }
];
const mockIndications = [];
const mockIfaInd = [];
const mockStrategies = [];

export default function Products() {
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [notification, setNotification] = useState(null);

  const loadData = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/data');
      const dbData = await response.json();

      let ifas = Array.isArray(dbData.ifas) && dbData.ifas.length > 0 ? dbData.ifas : mockIFAs;
      let indications = Array.isArray(dbData.indications) && dbData.indications.length > 0 ? dbData.indications : mockIndications;
      let relations = Array.isArray(dbData.ifaIndications) && dbData.ifaIndications.length > 0 ? dbData.ifaIndications : mockIfaInd;
      let strategies = Array.isArray(dbData.strategies) && dbData.strategies.length > 0 ? dbData.strategies : mockStrategies;

      const processedData = ifas.map(ifa => {
        // Relaciones IFA-Indicaciones
        const relatedIndIds = relations
          .filter(r => String(r.ifa_id) === String(ifa.id))
          .map(r => String(r.indication_id || r.ind_id));
          
        const relatedIndications = indications
          .filter(ind => relatedIndIds.includes(String(ind.id)))
          .map(ind => ind.meddra_term || ind.Indicacion_MEDDRA);

        // Full indication objects for the edit form
        const relatedFullIndications = indications
          .filter(ind => relatedIndIds.includes(String(ind.id)))
          .map(ind => ({
            id: ind.id,
            free_text: ind.free_text || "",
            meddra_code: ind.meddra_code || "",
            meddra_term: ind.meddra_term || ind.Indicacion_MEDDRA || "",
            cie10_code: ind.cie10_code || "",
            cie10_name: ind.cie10_name || "",
            strategies: strategies.filter(s => String(s.ifa_id) === String(ifa.id) && (s.indication_reference === ind.meddra_term || s.indication_reference === ind.free_text)).map(s => ({
              id: s.id,
              pico_search: s.query_text || "", // Mapeo del query_text real
              categories: [s.strategy_category || s.category].filter(Boolean),
              frequency: s.frequency || "Mensual"
            }))
          }));

        // Fix empty strategies array if they were globally attached
        if (relatedFullIndications.length > 0 && relatedFullIndications[0].strategies.length === 0) {
            const globalStrategies = strategies.filter(s => String(s.ifa_id) === String(ifa.id));
            if (globalStrategies.length > 0) {
                relatedFullIndications[0].strategies = globalStrategies.map(s => ({
                  id: s.id,
                  pico_search: s.query_text || "",
                  categories: [s.strategy_category || s.category].filter(Boolean),
                  frequency: s.frequency || "Mensual"
                }));
            }
        }

        // Relaciones IFA-Estrategias
        const relatedStrategies = strategies
          .filter(s => String(s.ifa_id) === String(ifa.id))
          .map(s => s.strategy_category || s.strategy_name);
        
        return {
          id: ifa.id,
          IFA_Name: ifa.ifa_name || ifa.IFA_Name,
          ATC4_Name: ifa.atc4_name || ifa.ATC4_Name || "-",
          atc_code: ifa.atc_code || "-",
          Indicaciones: relatedIndications,
          EstrategiasList: relatedStrategies,
          Estrategias: relatedStrategies,
          ArticulosNuevos: Math.floor(Math.random() * 20),
          last_search: "2026-06-01",
          next_search: "2026-07-01",
          screening_pending: Math.floor(Math.random() * 30) + 5,
          candidate_library: Math.floor(Math.random() * 100) + 20,
          knowledge_base: Math.floor(Math.random() * 50) + 10,
          _raw: {
            id: ifa.id,
            ifa_name: ifa.ifa_name || ifa.IFA_Name,
            atc4_code: ifa.atc_code || "",
            atc4_name: ifa.atc4_name || "",
            atc5_code: ifa.atc5_code || "",
            atc5_name: ifa.atc5_name || "",
            status: ifa.active !== false ? "Activo" : "Inactivo",
            monitoring_level: ifa.monitoring_level || "A",
            indications: relatedFullIndications,
            baseline_date: "2026-01-01",
            next_execution_date: "2026-07-01"
          }
        };
      });

      setData(processedData);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetails = (row) => {
    setSelectedRow(row);
    setIsPanelOpen(true);
  };

  const handleCloseDetails = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedRow(null), 300); // clear after animation
  };

  const handleOpenNewForm = () => {
    setEditingData(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (row) => {
    setEditingData(row._raw);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (payload) => {
    try {
      const response = await fetch('http://localhost:3000/api/ifas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Falló el upsert en la BD');
      
      setIsFormOpen(false);
      setNotification({ type: 'success', message: '¡Registro guardado exitosamente en PostgreSQL!' });
      
      // Recargar datos desde la BD para reflejar los cambios
      loadData();
      
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'Error al conectar con la base de datos.' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const columns = [
    { key: "IFA_Name", label: "IFA Name", width: "180px" },
    { key: "ATC4_Name", label: "ATC 4 Name", width: "150px" },
    { 
      key: "Indicaciones", 
      label: "Indicación MEDDRA", 
      width: "300px",
      render: (indicaciones) => {
        if (!indicaciones || indicaciones.length === 0) return <span className="text-gray-400 italic">Sin indicaciones</span>;
        
        const showCount = 2;
        const visible = indicaciones.slice(0, showCount);
        const hidden = indicaciones.slice(showCount);

        return (
          <div className="flex flex-wrap gap-1 items-center relative group/tooltip">
            {visible.map((ind, i) => (
              <span key={i} className="px-2.5 py-1 bg-primary-50 text-primary-700 text-[11px] rounded-md font-medium border border-primary-100 whitespace-nowrap">
                {ind}
              </span>
            ))}
            {hidden.length > 0 && (
              <div className="relative flex items-center">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] rounded-md font-medium border border-gray-200 cursor-help hover:bg-gray-200 transition-colors">
                  +{hidden.length}
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[250px] bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[100] shadow-xl">
                  <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {hidden.map((ind, i) => (
                      <span key={i} className="whitespace-normal leading-tight flex items-start gap-1.5">
                        <span className="text-primary-400 mt-0.5">•</span> {ind}
                      </span>
                    ))}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    { 
      key: "ArticulosNuevos", 
      label: "Artículos Nuevos", 
      width: "140px",
      render: (val) => (
        <div className="flex items-center">
          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${val > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
            {val > 0 ? `+${val} nuevos` : '0'}
          </span>
        </div>
      )
    },
    { 
      key: "Estrategias", 
      label: "Estrategias", 
      width: "250px",
      render: (strategies) => {
        if (!strategies || strategies.length === 0) return <span className="text-gray-400 italic text-xs">Sin estrategias</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {strategies.slice(0, 2).map((strat, i) => (
              <span key={i} className="px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 text-[10px] rounded uppercase tracking-wider font-semibold">
                {strat}
              </span>
            ))}
            {strategies.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] rounded font-semibold">
                +{strategies.length - 2}
              </span>
            )}
          </div>
        );
      }
    }
  ];

  const actions = [
    { label: "Ver detalles", onClick: (row) => handleOpenDetails(row) },
    { label: "Editar", onClick: (row) => handleOpenEditForm(row) },
    { label: "Eliminar", onClick: (row) => console.log("Eliminar", row), className: "text-red-600 focus:text-red-600 focus:bg-red-50" }
  ];

  return (
    <div className="p-8 h-full min-h-[80vh] flex flex-col gap-8 bg-gray-50/50 overflow-x-hidden relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[300] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10 duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <CheckCircle2 size={20} />
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      <div className="flex flex-col space-y-3 max-w-4xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600">
            Productos & IFAs
          </span>
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Panel de control de los IFAs monitorizados. Verifica la cobertura de indicaciones, estrategias de búsqueda activas y estado de monitoreo.
        </p>
      </div>

      <div className="flex-1">
        <DataTable
          title="Directorio de IFAs Monitorizados"
          columns={columns}
          data={data}
          actions={actions}
          showAddButton={true}
          onAdd={handleOpenNewForm}
          rowsPerPageOptions={[5, 10, 25, 50]}
          defaultRowsPerPage={10}
        />
      </div>

      {/* OVERLAY & SIDEBAR (VER DETALLES) */}
      <div 
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] transition-opacity duration-300 ${isPanelOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={handleCloseDetails}
      />
      
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[210] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedRow && (
          <>
            {/* Header Sidebar */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Pill size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedRow.IFA_Name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedRow.id} • {selectedRow.atc_code}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseDetails} className="rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </Button>
            </div>

            {/* Content Sidebar */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* KPIs / Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Search size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Última Búsqueda</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{selectedRow.last_search}</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Calendar size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Próxima Búsqueda</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{selectedRow.next_search}</p>
                </div>
              </div>

              {/* Status Counters */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Estado del Monitoreo
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Layers size={16} className="text-violet-500" />
                      <span className="text-sm font-medium">Screening Pendiente</span>
                    </div>
                    <span className="bg-violet-100 text-violet-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{selectedRow.screening_pending}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 text-gray-700">
                      <BookOpen size={16} className="text-blue-500" />
                      <span className="text-sm font-medium">Librería de Candidatos</span>
                    </div>
                    <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{selectedRow.candidate_library}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 text-gray-700">
                      <ShieldCheck size={16} className="text-green-500" />
                      <span className="text-sm font-medium">Base de Conocimiento</span>
                    </div>
                    <span className="bg-green-100 text-green-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{selectedRow.knowledge_base}</span>
                  </div>
                </div>
              </div>

              {/* Indications */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary-500" />
                  Indicaciones Monitorizadas ({selectedRow.Indicaciones?.length || 0})
                </h4>
                {selectedRow.Indicaciones && selectedRow.Indicaciones.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedRow.Indicaciones.map((ind, i) => (
                      <div key={i} className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                        {ind}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">No hay indicaciones registradas.</p>
                )}
              </div>

              {/* Strategies */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Search size={16} className="text-violet-500" />
                  Estrategias de Búsqueda ({selectedRow.EstrategiasList?.length || 0})
                </h4>
                {selectedRow.EstrategiasList && selectedRow.EstrategiasList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRow.EstrategiasList.map((strat, i) => (
                      <span key={i} className="px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-md border border-violet-100">
                        {strat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">No hay estrategias configuradas.</p>
                )}
              </div>
              
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80">
              <Button onClick={() => handleOpenEditForm(selectedRow)} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium flex items-center justify-center gap-2">
                Editar Registro <ArrowRight size={16} />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* FORMULARIO COMPLETO PARA NUEVO/EDITAR */}
      <IfaForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={editingData}
        onSave={handleSaveForm}
      />

    </div>
  );
}
