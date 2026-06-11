import { X, AlertTriangle } from "lucide-react";
import { Button } from "./button";

export const AlertConfirm = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-500 mb-8">{message}</p>
          
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-0" onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
