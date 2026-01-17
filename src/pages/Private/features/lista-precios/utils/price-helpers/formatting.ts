import type { CurrencyCode } from '@/shared/currency';
import { formatMoney } from '@/shared/currency';

type FormatPriceOptions = {
	currencyCode?: CurrencyCode;
	showSymbol?: boolean;
	trimDecimals?: boolean;
};

export const formatPrice = (value: number, options?: FormatPriceOptions): string =>
	formatMoney(value, options?.currencyCode, {
		showSymbol: options?.showSymbol,
		trimDecimals: options?.trimDecimals,
	});

export const formatDate = (dateString: string): string => new Date(dateString).toLocaleDateString();
