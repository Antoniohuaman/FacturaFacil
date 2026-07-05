interface ResumenPagoCompraProps {
  moneda: string;
  saldoInicial: number;
  importeAplicado: number;
  totalMedios: number;
  saldoResultante: number;
  diferencia: number;
}

/** Resumen visible de conciliación entre el importe aplicado a la CxP y la suma de medios de pago. */
export default function ResumenPagoCompra({
  moneda,
  saldoInicial,
  importeAplicado,
  totalMedios,
  saldoResultante,
  diferencia,
}: ResumenPagoCompraProps) {
  const cuadra = Math.abs(diferencia) < 0.01;

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
      <div className="flex justify-between text-gray-600">
        <span>Saldo inicial</span>
        <span className="font-mono">{saldoInicial.toFixed(2)} {moneda}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>Importe aplicado</span>
        <span className="font-mono">{importeAplicado.toFixed(2)} {moneda}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>Medios registrados</span>
        <span className="font-mono">{totalMedios.toFixed(2)} {moneda}</span>
      </div>
      <div className="flex justify-between text-gray-700 font-medium pt-1.5 border-t border-gray-200">
        <span>Saldo resultante</span>
        <span className="font-mono">{saldoResultante.toFixed(2)} {moneda}</span>
      </div>
      <div className={`flex justify-between font-semibold pt-1 ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
        <span>Diferencia</span>
        <span className="font-mono">{diferencia.toFixed(2)} {moneda}</span>
      </div>
    </div>
  );
}
