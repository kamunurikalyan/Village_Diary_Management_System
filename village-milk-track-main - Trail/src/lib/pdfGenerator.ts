import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MilkEntry {
  id?: string;
  date: string;
  time?: string;
  quantity: number;
  fat: number;
  amount: number;
  ratePerLitre: number;
  userId?: string;
}

export interface FarmerInfo {
  displayName?: string;
  email?: string;
}

export const generateMilkEntryPDF = (
  entries: MilkEntry[],
  farmerInfo?: FarmerInfo,
  isAdmin: boolean = false
): void => {
  const doc = new jsPDF();
  
  // Get current date for the report
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Village Dairy', 14, 22);
  
  doc.setFontSize(14);
  doc.text('Milk Collection Statement', 14, 32);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${currentDate}`, 14, 40);

  // Add farmer info if provided (for farmer dashboard)
  if (farmerInfo && !isAdmin) {
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Farmer Name: ${farmerInfo.displayName || farmerInfo.email || 'N/A'}`, 14, 50);
  }

  // Prepare table data - using ₹ symbol for Indian Rupee
  const tableData = entries.map((entry, index) => [
    index + 1,
    entry.date,
    entry.time || '-',
    `${entry.quantity}L`,
    `${entry.fat}%`,
    `₹${entry.ratePerLitre}`,
    `₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  // Calculate totals
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

  // Create table
  const startY = farmerInfo && !isAdmin ? 58 : 48;
  
  autoTable(doc, {
    head: [['#', 'Date', 'Time', 'Quantity', 'Fat', 'Rate', 'Amount (₹)']],
    body: tableData,
    startY: startY,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 20 },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
  });

  // Get the final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary section
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  
  const summaryX = 120;
  doc.text('Summary:', summaryX, finalY);
  
  doc.setFontSize(10);
  doc.text(`Total Entries: ${entries.length}`, summaryX, finalY + 8);
  doc.text(`Total Quantity: ${totalQuantity.toLocaleString('en-IN')}L`, summaryX, finalY + 16);
  
  doc.setFontSize(12);
  doc.setTextColor(34, 197, 94);
  doc.text(`Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX, finalY + 26);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Village Dairy - Milk Management System', 14, 285);
  
  // Save the PDF
  const fileName = isAdmin 
    ? `Milk_Collection_Statement_All_${currentDate.replace(/\//g, '-')}.pdf`
    : `Milk_Collection_Statement_${currentDate.replace(/\//g, '-')}.pdf`;
    
  doc.save(fileName);
};
