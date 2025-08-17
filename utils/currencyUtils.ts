export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  'ILS': { code: 'ILS', symbol: '₪', name: 'שקל' },
  'USD': { code: 'USD', symbol: '$', name: 'דולר' },
  'EUR': { code: 'EUR', symbol: '€', name: 'יורו' }
};

export const getCurrencyInfo = (currencyCode: string): CurrencyInfo => {
  return CURRENCIES[currencyCode] || CURRENCIES['ILS']; // Default to ILS if unknown
};

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyInfo(currencyCode);
  return `${currency.symbol}${amount.toFixed(2)}`;
};

export const formatCurrencyWithName = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyInfo(currencyCode);
  return `${currency.symbol}${amount.toFixed(2)} ${currency.name}`;
};

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = getCurrencyInfo(currencyCode);
  return currency.symbol;
};

export const getCurrencyName = (currencyCode: string): string => {
  const currency = getCurrencyInfo(currencyCode);
  return currency.name;
}; 