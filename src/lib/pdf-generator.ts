import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generateInventoryPDF = (products: any[], businessName: string = 'Smart Inventory Pro') => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = format(now, "dd 'de' MMMM, yyyy", { locale: es });

  // --- Header ---
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName.toUpperCase(), 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE DE INVENTARIO', 15, 33);
  doc.text(`Fecha: ${dateStr}`, 195, 33, { align: 'right' });

  // --- Summary Metrics ---
  const totalItems = products.length;
  const totalStock = products.reduce((acc, p) => acc + (p.current_stock || 0), 0);
  const totalValue = products.reduce((acc, p) => acc + ((p.current_stock || 0) * (p.cost_price || 0)), 0);
  const avgMargin = products.reduce((acc, p) => {
    const margin = ((p.sale_price - p.cost_price) / p.sale_price) * 100;
    return acc + (isNaN(margin) ? 0 : margin);
  }, 0) / (totalItems || 1);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN GENERAL', 15, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Productos: ${totalItems}`, 15, 57);
  doc.text(`Stock Total: ${totalStock} uds`, 70, 57);
  doc.text(`Valor Inventario (Costo): $${totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 120, 57);
  
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(15, 62, 195, 62);

  // --- Table ---
  const tableRows = products.map(p => [
    p.name,
    p.sku || '-',
    p.current_stock ?? 0,
    `$${Number(p.cost_price).toFixed(2)}`,
    `$${Number(p.sale_price).toFixed(2)}`,
    `${(((p.sale_price - p.cost_price) / p.sale_price) * 100).toFixed(1)}%`
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Producto', 'SKU', 'Stock', 'Costo', 'Venta', 'Margen']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      2: { halign: 'center' }, // Stock
      3: { halign: 'right' },  // Costo
      4: { halign: 'right' },  // Venta
      5: { halign: 'right' }   // Margen
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 70, left: 15, right: 15 }
  });

  // --- Footer ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} - Generado por Smart Inventory Pro`,
      105,
      285,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`Inventario_${format(now, 'yyyy-MM-dd_HHmm')}.pdf`);
};
