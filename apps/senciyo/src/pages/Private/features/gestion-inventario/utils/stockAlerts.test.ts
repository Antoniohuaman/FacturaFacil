import { evaluateStockAlert, getStockAlertType } from './stockAlerts';

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected} but received ${actual}`);
  }
};

const assertDefined = (value: unknown, message: string) => {
  if (typeof value !== 'number') {
    throw new Error(`${message}. Expected number but received ${value}`);
  }
};

export const runStockAlertTests = () => {
  assertEqual(getStockAlertType({ disponible: 4, stockMinimo: 5 }), 'LOW', 'Disponible below mínimo should flag LOW');
  assertEqual(getStockAlertType({ disponible: 5, stockMinimo: 5 }), 'LOW', 'Disponible equal to mínimo should flag LOW');
  assertEqual(getStockAlertType({ disponible: 12, stockMaximo: 10 }), 'OVER', 'Disponible above máximo should flag OVER');
  assertEqual(getStockAlertType({ disponible: 8, stockMinimo: 5, stockMaximo: 10 }), 'OK', 'Disponible within thresholds should be OK');
  assertEqual(getStockAlertType({ disponible: 8 }), 'OK', 'Without thresholds result should be OK');

  const criticalEvaluation = evaluateStockAlert({ disponible: 2, stockMinimo: 6 });
  assertEqual(criticalEvaluation.type, 'LOW', 'Critical evaluation should be LOW');
  assertEqual(criticalEvaluation.isCritical, true, 'Critical evaluation should set flag');
  assertDefined(criticalEvaluation.missing, 'Critical evaluation should expose missing units');
  assertEqual(criticalEvaluation.missing, 4, 'Critical evaluation missing units mismatch');

  const overEvaluation = evaluateStockAlert({ disponible: 15, stockMaximo: 10 });
  assertEqual(overEvaluation.type, 'OVER', 'Over evaluation should be OVER');
  assertEqual(overEvaluation.isCritical, false, 'Over evaluation is never critical');
  assertDefined(overEvaluation.excess, 'Over evaluation should expose excess units');
  assertEqual(overEvaluation.excess, 5, 'Over evaluation excess units mismatch');

  const nonCriticalLow = evaluateStockAlert({ disponible: 9, stockMinimo: 10 });
  assertEqual(nonCriticalLow.type, 'LOW', 'Should still be LOW');
  assertEqual(nonCriticalLow.isCritical, false, 'Above half of mínimo should not be critical');
  assertDefined(nonCriticalLow.missing, 'Non critical low should report missing units');
  assertEqual(nonCriticalLow.missing, 1, 'Missing units mismatch');
};
