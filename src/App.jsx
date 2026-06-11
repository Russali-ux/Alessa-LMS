import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation
} from "react-router-dom";

import SidebarMainMenu from "./Components/Sidebar/SidebarMainMenu";

import { Button } from "./Components/ui/button";
import { Input } from "./Components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Components/ui/card";

// Componentes temporales usando el sistema de UI
const PlaceholderPage = ({ title }) => (
  <div className="p-8 h-full min-h-[80vh] flex items-center justify-center">
    <Card className="w-full max-w-lg text-center shadow-lg border-t-4 border-t-primary-500 hover:shadow-xl transition-all duration-300">
      <CardHeader className="space-y-3 pb-4">
        <div className="mx-auto w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        </div>
        <CardTitle className="text-2xl font-bold text-gray-800">{title}</CardTitle>
        <CardDescription className="text-base">Módulo en construcción</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Estamos trabajando intensamente en este módulo. Muy pronto estará disponible con nuevas funcionalidades y un diseño de vanguardia.
        </p>
        <Button variant="outline" className="w-full bg-gray-50 hover:bg-gray-100" disabled>Próximamente disponible</Button>
      </CardContent>
    </Card>
  </div>
);

const Dashboard = () => <PlaceholderPage title="Dashboard Principal" />;

import Products from "./pages/Products";


const SearchStrategies = () => <PlaceholderPage title="Estrategias de Búsqueda" />;
import SearchExecutions from "./pages/SearchExecutions";
const ArticlePool = () => <PlaceholderPage title="Pool de Artículos" />;
const Screening = () => <PlaceholderPage title="Screening (Filtro)" />;

const CandidateLibrary = () => <PlaceholderPage title="Librería de Candidatos" />;
const KnowledgeBase = () => <PlaceholderPage title="Base de Conocimiento" />;

const Zotero = () => <PlaceholderPage title="Integración con Zotero" />;
const CSLRepository = () => <PlaceholderPage title="Repositorio CSL" />;

import Settings from "./pages/Settings";

const Login = ({ onLogin }) => (
  <div className="h-screen flex flex-col items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-400/20 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-400/20 rounded-full blur-3xl pointer-events-none mix-blend-multiply" />
    
    <Card className="w-full max-w-[420px] shadow-2xl relative z-10 backdrop-blur-xl bg-white/95 border-0 ring-1 ring-gray-200">
      <CardHeader className="space-y-2 text-center pt-10 pb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform transition-transform hover:scale-105">
          <span className="text-white text-3xl font-extrabold">A</span>
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">AlessaLMS</CardTitle>
        <CardDescription className="text-base text-gray-500">Ingresa a tu cuenta para continuar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-10 px-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Correo Electrónico</label>
            <Input placeholder="admin@alessalms.com" type="email" className="h-12 bg-gray-50/50 focus:bg-white transition-colors" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Contraseña</label>
              <a href="#" className="text-xs font-medium text-primary-600 hover:text-primary-700">¿Olvidaste tu contraseña?</a>
            </div>
            <Input placeholder="••••••••" type="password" className="h-12 bg-gray-50/50 focus:bg-white transition-colors" />
          </div>
        </div>
        <Button 
          onClick={() => onLogin({ name: 'Admin', role: 'admin' })} 
          className="w-full h-12 text-base font-medium shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-primary-600 to-blue-600 border-0"
        >
          Ingresar al Sistema
        </Button>
      </CardContent>
    </Card>
  </div>
);

/* =========================
   LAYOUT WRAPPER
========================= */

function LayoutWrapper() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const location = useLocation();

  const hideSidebar =
    location.pathname === "/login";

  return (
    <div className="h-screen flex bg-gray-50">

      {!hideSidebar && (
        <aside
          className={`
            transition-all duration-300
            ${isSidebarCollapsed ? "w-20" : "w-72"}
            bg-white
            border-r
            border-gray-200
            h-full
          `}
        >
          <SidebarMainMenu
            isCollapsed={isSidebarCollapsed}
            onToggle={() =>
              setIsSidebarCollapsed(!isSidebarCollapsed)
            }
          />
        </aside>
      )}

      <main className="flex-1 overflow-auto">

        <Routes>

          {/* DASHBOARD */}

          <Route
            path="/"
            element={<Dashboard />}
          />

          {/* PRODUCTS */}

          <Route
            path="/products"
            element={<Products />}
          />

          {/* LITERATURE MONITORING */}

          <Route
            path="/literature/strategies"
            element={<SearchStrategies />}
          />

          <Route
            path="/literature/executions"
            element={<SearchExecutions />}
          />

          <Route
            path="/literature/articles"
            element={<ArticlePool />}
          />

          <Route
            path="/literature/screening"
            element={<Screening />}
          />

          {/* EVIDENCE */}

          <Route
            path="/evidence/candidates"
            element={<CandidateLibrary />}
          />

          <Route
            path="/evidence/knowledge-base"
            element={<KnowledgeBase />}
          />

          {/* REFERENCES */}

          <Route
            path="/references/zotero"
            element={<Zotero />}
          />

          <Route
            path="/references/csl"
            element={<CSLRepository />}
          />

          {/* SETTINGS */}

          <Route
            path="/settings"
            element={<Settings />}
          />

        </Routes>

      </main>

    </div>
  );
}

/* =========================
   APP
========================= */

export default function App() {

  const [user, setUser] = useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const storedToken =
      localStorage.getItem("token");

    const storedUser =
      localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    setLoading(false);

  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <Login onLogin={handleLogin} />
    );
  }

  return (
    <BrowserRouter>
      <LayoutWrapper />
    </BrowserRouter>
  );
}
