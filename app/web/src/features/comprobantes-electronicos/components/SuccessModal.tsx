import { CheckCircle2, Printer, Mail, MessageCircle, Link2, FileText, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobante: {
    tipo: string;
    serie: string;
    numero: string;
    total: number;
    cliente?: string;
    vuelto?: number;
  };
  onPrint: () => void;
  onNewSale: () => void;
}

export const SuccessModal = ({ isOpen, onClose, comprobante, onPrint, onNewSale }: SuccessModalProps) => {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendEmail = async () => {
    if (!email) return;
    setIsSending(true);
    // Aquí irá la lógica para enviar por correo
    setTimeout(() => {
      setIsSending(false);
      setShowEmailInput(false);
      setEmail('');
      alert(`✅ Comprobante enviado a ${email}`);
    }, 1500);
  };

  const handleSendWhatsApp = () => {
    const phone = phoneNumber.replace(/\D/g, '');
    if (!phone) return;
    
    const message = encodeURIComponent(
      `¡Hola! Te comparto el comprobante:\n\n` +
      `${comprobante.tipo} ${comprobante.serie}-${comprobante.numero}\n` +
      `Total: S/ ${comprobante.total.toFixed(2)}\n\n` +
      `Gracias por tu compra.`
    );
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowWhatsAppInput(false);
    setPhoneNumber('');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/comprobante/${comprobante.serie}-${comprobante.numero}`;
    navigator.clipboard.writeText(link);
    alert('🔗 Enlace copiado al portapapeles');
  };

  const handlePrintAndClose = () => {
    onPrint();
    setTimeout(() => {
      onClose();
      onNewSale();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        
        {/* Header con animación de éxito */}
        <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-8 text-center overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20"></div>
          </div>
          
          {/* Icono de éxito con animación */}
          <div className="relative mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              <CheckCircle2 className="w-20 h-20 text-white relative animate-scaleIn" strokeWidth={2.5} />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            ¡Venta exitosa! <Sparkles className="w-5 h-5" />
          </h2>
          <p className="text-green-50 text-sm">
            {comprobante.tipo} {comprobante.serie}-{comprobante.numero}
          </p>
        </div>

        {/* Contenido */}
        <div className="p-6">
          
          {/* Resumen de venta */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Total pagado</span>
              <span className="text-2xl font-bold text-gray-900">S/ {comprobante.total.toFixed(2)}</span>
            </div>
            
            {comprobante.vuelto !== undefined && comprobante.vuelto > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="text-sm text-gray-600">Vuelto</span>
                <span className="text-lg font-semibold text-orange-600">S/ {comprobante.vuelto.toFixed(2)}</span>
              </div>
            )}
            
            {comprobante.cliente && (
              <div className="pt-2 border-t border-gray-300 mt-2">
                <span className="text-xs text-gray-500">Cliente: </span>
                <span className="text-sm font-medium text-gray-700">{comprobante.cliente}</span>
              </div>
            )}
          </div>

          {/* Acciones principales */}
          <div className="space-y-3 mb-6">
            
            {/* Imprimir */}
            <button
              onClick={handlePrintAndClose}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <Printer className="w-5 h-5" />
              Imprimir y nueva venta
            </button>

            {/* Compartir por WhatsApp */}
            {!showWhatsAppInput ? (
              <button
                onClick={() => setShowWhatsAppInput(true)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-[1.02] shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar por WhatsApp
              </button>
            ) : (
              <div className="flex gap-2 items-center animate-slideDown">
                <input
                  type="tel"
                  placeholder="Ej: 987654321"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <button
                  onClick={handleSendWhatsApp}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                  Enviar
                </button>
                <button
                  onClick={() => setShowWhatsAppInput(false)}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Enviar por correo */}
            {!showEmailInput ? (
              <button
                onClick={() => setShowEmailInput(true)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-md"
              >
                <Mail className="w-5 h-5" />
                Enviar por correo
              </button>
            ) : (
              <div className="flex gap-2 items-center animate-slideDown">
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isSending ? '...' : 'Enviar'}
                </button>
                <button
                  onClick={() => setShowEmailInput(false)}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Acciones secundarias */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              <Link2 className="w-4 h-4" />
              Copiar enlace
            </button>
            <button
              onClick={onPrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              <Printer className="w-4 h-4" />
              Reimprimir
            </button>
          </div>

          {/* Botón de nueva venta */}
          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl font-semibold hover:from-gray-800 hover:to-gray-900 transition-all"
          >
            <FileText className="w-5 h-5" />
            Nueva venta
          </button>
        </div>
      </div>

      {/* Animaciones en CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to { 
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
          }
        }
        @keyframes scaleIn {
          0% { 
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          60% { 
            transform: scale(1.2) rotate(10deg);
          }
          100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-slideDown {
          animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-scaleIn {
          animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};
