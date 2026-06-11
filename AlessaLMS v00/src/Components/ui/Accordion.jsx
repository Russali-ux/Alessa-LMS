import { useState } from "react";

export const Accordion = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl mb-4 bg-surface shadow-sm overflow-hidden transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center p-4 font-semibold text-text-main bg-surface hover:bg-surface-hover transition-colors"
      >
        {title}
        <span className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          {open ? "−" : "+"}
        </span>
      </button>

      {/* solo oculta el contenido sin desmontarlo */}
      <div className={`p-4 border-t border-border ${open ? "block" : "hidden"}`}>
      {children}
      </div>
    </div>
  );
};
