export const exportToCSV = (data: any[], filename: string, columns: { key: string; header: string }[]): void => {
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value ?? '';
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  downloadCSV(csv, filename);
};

export const downloadCSV = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportMilkEntriesToCSV = (entries: any[], filename: string = 'milk-entries'): void => {
  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time' },
    { key: 'quantity', header: 'Quantity (L)' },
    { key: 'fat', header: 'Fat %' },
    { key: 'snf', header: 'SNF %' },
    { key: 'ratePerLitre', header: 'Rate/L (₹)' },
    { key: 'amount', header: 'Amount (₹)' },
  ];
  exportToCSV(entries, filename, columns);
};

export const exportPaymentsToCSV = (payments: any[], filename: string = 'payments'): void => {
  const columns = [
    { key: 'createdAt', header: 'Date' },
    { key: 'farmerName', header: 'Farmer Name' },
    { key: 'amount', header: 'Amount (₹)' },
    { key: 'paymentMode', header: 'Payment Mode' },
    { key: 'referenceNumber', header: 'Reference No.' },
    { key: 'month', header: 'Month' },
    { key: 'year', header: 'Year' },
  ];
  exportToCSV(payments, filename, columns);
};

export const exportRateHistoryToCSV = (rates: any[], filename: string = 'rate-history'): void => {
  const columns = [
    { key: 'createdAt', header: 'Date' },
    { key: 'ratePerLitre', header: 'Rate per Litre (₹)' },
    { key: 'userEmail', header: 'Updated By' },
  ];
  
  // Transform dates to string format before exporting
  const transformedRates = rates.map(rate => ({
    ...rate,
    createdAt: rate.createdAt instanceof Date 
      ? rate.createdAt.toISOString() 
      : rate.createdAt,
  }));
  
  exportToCSV(transformedRates, filename, columns);
};

export const exportFarmersToCSV = (farmers: any[], filename: string = 'farmers'): void => {
  const columns = [
    { key: 'displayName', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    { key: 'createdAt', header: 'Joined Date' },
  ];
  exportToCSV(farmers, filename, columns);
};

export const exportAttendanceToCSV = (attendance: any[], filename: string = 'attendance'): void => {
  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'farmerName', header: 'Farmer Name' },
    { key: 'present', header: 'Present' },
    { key: 'shift', header: 'Shift' },
    { key: 'remarks', header: 'Remarks' },
  ];
  exportToCSV(attendance, filename, columns);
};

export const exportCattleToCSV = (cattle: any[], filename: string = 'cattle'): void => {
  const columns = [
    { key: 'tagNumber', header: 'Tag Number' },
    { key: 'name', header: 'Name' },
    { key: 'breed', header: 'Breed' },
    { key: 'age', header: 'Age' },
    { key: 'lactation', header: 'Lactation' },
    { key: 'dailyMilk', header: 'Daily Milk (L)' },
    { key: 'status', header: 'Status' },
  ];
  exportToCSV(cattle, filename, columns);
};

export const exportAllDataToJSON = async (
  entries: any[], 
  payments: any[], 
  farmers: any[],
  rates: any[]
): Promise<void> => {
  const data = {
    exportDate: new Date().toISOString(),
    milkEntries: entries,
    payments: payments,
    farmers: farmers,
    rateHistory: rates,
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `village-dairy-backup-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
