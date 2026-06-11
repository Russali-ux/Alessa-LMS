import { Link, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Pill,
  Search,
  PlayCircle,
  FileSearch,
  ClipboardCheck,
  Database,
  Brain,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";

export default function SidebarMainMenu({
  isCollapsed,
  onToggle
}) {

  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const menu = [

    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/"
    },

    {
      icon: Pill,
      label: "Products & IFAs",
      path: "/products"
    },

    {
      icon: Search,
      label: "Search Strategies",
      path: "/literature/strategies"
    },

    {
      icon: PlayCircle,
      label: "Search Executions",
      path: "/literature/executions"
    },

    {
      icon: FileSearch,
      label: "Article Pool",
      path: "/literature/articles"
    },

    {
      icon: ClipboardCheck,
      label: "Screening",
      path: "/literature/screening"
    },

    {
      icon: Database,
      label: "Candidate Library",
      path: "/evidence/candidates"
    },

    {
      icon: Brain,
      label: "Knowledge Base",
      path: "/evidence/knowledge-base"
    },

    {
      icon: BookOpen,
      label: "Zotero",
      path: "/references/zotero"
    },

    {
      icon: Settings,
      label: "Settings",
      path: "/settings"
    }

  ];

  return (
    <div className="h-full flex flex-col">

      {/* HEADER */}

      <div
        className={`
          p-5 border-b flex items-center
          ${isCollapsed
            ? "justify-center"
            : "justify-between"}
        `}
      >

        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold">
              Alessa LMS
            </h1>

            <p className="text-xs text-gray-500">
              Literature Monitoring Service
            </p>
          </div>
        )}

        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isCollapsed
            ? <ChevronRight size={20} />
            : <ChevronLeft size={20} />
          }
        </button>

      </div>

      {/* MENU */}

      <div className="flex-1 p-4">

        <nav className="flex flex-col gap-2">

          {menu.map(
            ({ icon: Icon, label, path }) => {

              const active =
                location.pathname === path;

              return (

                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-3
                    px-4 py-3 rounded-xl
                    transition

                    ${
                      active
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }

                    ${
                      isCollapsed
                        ? "justify-center"
                        : ""
                    }
                  `}
                >

                  <Icon size={20} />

                  {!isCollapsed &&
                    <span>{label}</span>
                  }

                </Link>

              );
            }
          )}

        </nav>

      </div>

      {/* FOOTER */}

      <div className="border-t">

        <button
          onClick={handleLogout}
          className={`
            w-full
            flex items-center gap-3
            px-4 py-4
            text-red-600
            hover:bg-red-50

            ${isCollapsed
              ? "justify-center"
              : ""
            }
          `}
        >
          <LogOut size={20} />

          {!isCollapsed &&
            <span>Cerrar Sesión</span>
          }

        </button>

      </div>

    </div>
  );
}