import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import { CustomerForm } from './CustomerForm';
import { DownloadIcon, TrashIcon } from '../utils/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Customer, Sale, Product } from '../types';

// Firebase Imports
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, deleteDoc, runTransaction } from 'firebase/firestore';

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
}

type StatementRow = {
  date: string;
  description: string;
  charge: number;
  payment: number;
  balance: number;
  type: 'sale' | 'payment';
  saleId: string;
  paymentId?: string;
};

const StatementTable: React.FC<{
  rows: StatementRow[];
  totalBalance: number;
  onDeletePayment: (saleId: string, paymentId: string) => void;
}> = ({ rows, totalBalance, onDeletePayment }) => {
  const { t, formatDate, formatCurrency } = useAppContext();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full w-full text-left">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3 text-sm font-semibold text-slate-600">{t('date')}</th>
            <th className="p-3 text-sm font-semibold text-slate-600">{t('notes')}</th>
            <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('totalAmount')}</th>
            <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('amountPaid')}</th>
            <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('balance')}</th>
            <th className="p-3 text-sm font-semibold text-slate-600 text-right no-print"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100">
              <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{formatDate(row.date)}</td>
              <td className="p-3 font-medium">{row.description}</td>
              <td className="p-3 text-right whitespace-nowrap">{row.charge > 0 ? formatCurrency(row.charge) : '-'}</td>
              <td className="p-3 text-right text-green-600 whitespace-nowrap">{row.payment > 0 ? formatCurrency(row.payment) : '-'}</td>
              <td className={`p-3 font-semibold text-right whitespace-nowrap ${row.balance > 0 ? 'text-red-500' : 'text-dark'}`}>
                {formatCurrency(row.balance)}
              </td>
              <td className="p-3 text-right no-print">
                {row.type === 'payment' && row.paymentId && (
                  <button onClick={() => onDeletePayment(row.saleId, row.paymentId!)} className="text-red-500 hover:text-red-700">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="text-center text-slate-500 py-8">{t('noSalesYet')}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          {rows.length > 0 && (
            <tr className="border-t-2 font-bold bg-slate-50">
              <td colSpan={4} className="p-3 text-right">{t('totalBalance')}</td>
              <td className={`p-3 text-right ${totalBalance > 0 ? 'text-red-500' : 'text-dark'}`}>{formatCurrency(totalBalance)}</td>
              <td className="no-print"></td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
};


const CustomerDetail: React.FC<CustomerDetailProps> = ({ customerId, onBack }) => {
  const { t, formatCurrency, formatDate } = useAppContext();

  // State za Firebase
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{ saleId: string, paymentId: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 1. KUVUTA DATA KUTOKA FIREBASE (Mteja, Mauzo yake, na Bidhaa)
  useEffect(() => {
    setLoading(true);

    // Vuta Mteja
    const unsubCustomer = onSnapshot(doc(db, "wateja", customerId), (doc) => {
      if (doc.exists()) {
        setCustomer({ id: doc.id, ...doc.data() } as Customer);
      } else {
        setCustomer(null);
      }
    });

    // Vuta Mauzo ya Mteja Huyu tu
    const qSales = query(collection(db, "mauzo"), where("customerId", "==", customerId), orderBy("date", "asc"));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });

    // Vuta Bidhaa (kwa ajili ya majina)
    const unsubProducts = onSnapshot(collection(db, "bidhaa"), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    return () => { unsubCustomer(); unsubSales(); unsubProducts(); };
  }, [customerId]);

  // Kokotoa Jumla ya Deni (Total Balance)
  const totalBalance = useMemo(() => {
    if (!sales) return 0;
    return sales.reduce((sum, sale) => {
      const payments = sale.payments || [];
      const paid = payments.reduce((pSum, p) => pSum + p.amount, 0);
      return sum + (sale.totalAmount - paid);
    }, 0);
  }, [sales]);

  const statementRows: StatementRow[] = useMemo(() => {
    if (!customer || !sales) return [];

    const transactions: {
      date: string;
      description: string;
      charge: number;
      payment: number;
      type: 'sale' | 'payment';
      saleId: string;
      paymentId?: string;
    }[] = [];

    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      // Record Sale
      transactions.push({
        date: sale.date,
        description: `${(product && product.name) || 'N/A'} (${sale.quantity} x ${formatCurrency(sale.unitPrice)})`,
        charge: sale.totalAmount,
        payment: 0,
        type: 'sale',
        saleId: sale.id,
      });

      // Record Payments
      const payments = sale.payments || [];
      payments.forEach(p => {
        transactions.push({
          date: p.date,
          description: t('newPayment'),
          charge: 0,
          payment: p.amount,
          type: 'payment',
          saleId: sale.id,
          paymentId: p.id
        });
      });
    });

    // Panga kwa tarehe
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return transactions.map(tx => {
      runningBalance += tx.charge - tx.payment;
      return {
        ...tx,
        balance: runningBalance,
      };
    });
  }, [customer, sales, products, formatCurrency, t]);

  const handleDownloadPdf = async () => {
    if (!customer) return;
    setIsDownloading(true);

    const pdfContainer = document.getElementById('pdf-container');
    const pdfElement = document.getElementById('pdf-render-area');

    if (!pdfElement || !pdfContainer) {
      console.error("PDF elements not found");
      setIsDownloading(false);
      return;
    }

    const originalClassName = pdfContainer.className;
    pdfContainer.className = '';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '0';
    pdfContainer.style.zIndex = '-1';

    try {
      const canvas = await html2canvas(pdfElement, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Statement-${customer.name.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert('Failed to generate PDF.');
    } finally {
      pdfContainer.className = originalClassName;
      pdfContainer.style.position = '';
      pdfContainer.style.left = '';
      pdfContainer.style.top = '';
      pdfContainer.style.zIndex = '';
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Inapakua taarifa za mteja...</div>;
  }

  if (!customer) {
    return (
      <div>
        <p>Customer not found.</p>
        <Button onClick={onBack}>{t('backToCustomers')}</Button>
      </div>
    );
  }

  // KUFUTA MTEJA (Firebase)
  const handleDelete = async () => {
    if (customer) {
      try {
        await deleteDoc(doc(db, "wateja", customer.id));
        setShowDeleteConfirm(false);
        onBack();
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert("Imeshindikana kufuta mteja.");
      }
    }
  }

  // KUFUTA MALIPO (Firebase Transaction)
  const handleDeletePayment = async () => {
    if (paymentToDelete) {
      try {
        await runTransaction(db, async (transaction) => {
          const saleRef = doc(db, "mauzo", paymentToDelete.saleId);
          const saleDoc = await transaction.get(saleRef);
          if (!saleDoc.exists()) throw "Sale not found";

          const saleData = saleDoc.data();
          const currentPayments = saleData.payments || [];

          // Chuja malipo kuondoa lile tunalofuta
          const updatedPayments = currentPayments.filter((p: any) => p.id !== paymentToDelete.paymentId);

          // Update Firebase
          transaction.update(saleRef, { payments: updatedPayments });
        });
        setPaymentToDelete(null);
      } catch (error) {
        console.error("Error deleting payment:", error);
        alert("Imeshindikana kufuta malipo.");
      }
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6">
        <Button onClick={onBack} variant="secondary">
          &larr; {t('backToCustomers')}
        </Button>
        <Button onClick={handleDownloadPdf} disabled={isDownloading}>
          <DownloadIcon className="mr-2 h-5 w-5" />
          {isDownloading ? t('downloading') : t('downloadPDF')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title={t('customerDetails')}>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm text-slate-500">{t('name')}</h4>
                <p className="font-semibold text-lg">{customer.name}</p>
              </div>
              <div>
                <h4 className="text-sm text-slate-500">{t('phone')}</h4>
                <p className="font-semibold">{customer.phone}</p>
              </div>
              <div>
                <h4 className="text-sm text-slate-500">{t('address')}</h4>
                <p className="font-semibold">{customer.address || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm text-slate-500">{t('paymentType')}</h4>
                <p><span className={`px-2 py-1 text-xs font-semibold rounded-full ${customer.paymentType === 'Credit' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                  {t(customer.paymentType.toLowerCase())}
                </span></p>
              </div>
              {customer.notes && (
                <div>
                  <h4 className="text-sm text-slate-500">{t('notes')}</h4>
                  <p className="font-semibold text-sm italic bg-slate-50 p-2 rounded">{customer.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t space-y-2">
              <Button onClick={() => setIsEditModalOpen(true)} className="w-full" variant="secondary">{t('editCustomer')}</Button>
              <Button onClick={() => setShowDeleteConfirm(true)} className="w-full" variant="danger">{t('delete')}</Button>
            </div>
          </Card>

          <Card>
            <h4 className="text-slate-500 font-medium">{t('totalBalance')}</h4>
            <p className={`text-4xl font-bold mt-2 ${totalBalance > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={t('transactionHistory')}>
            <StatementTable
              rows={statementRows}
              totalBalance={totalBalance}
              onDeletePayment={(saleId, paymentId) => setPaymentToDelete({ saleId, paymentId })}
            />
          </Card>
        </div>
      </div>

      <div id="pdf-container" className="hidden">
        <div id="pdf-render-area" className="p-8 bg-white text-dark" style={{ width: '800px' }}>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">{t('appName')}</h1>
            <p className="text-lg text-slate-600">{t('customerDetails')} {t('summary')}</p>
          </div>
          <div className="flex justify-between mb-6 pb-4 border-b">
            <div>
              <p className="text-slate-500">{t('customer')}</p>
              <p className="font-bold text-lg">{customer.name}</p>
              <p>{customer.phone}</p>
              <p>{customer.address}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">{t('date')}:</span> {formatDate(new Date().toISOString())}</p>
              <p className="mt-4"><span className="text-slate-500">{t('totalBalance')}:</span></p>
              <p className={`font-bold text-2xl ${totalBalance > 0 ? 'text-red-500' : 'text-dark'}`}>{formatCurrency(totalBalance)}</p>
            </div>
          </div>
          <StatementTable rows={statementRows} totalBalance={totalBalance} onDeletePayment={() => { }} />
        </div>
      </div>


      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('editCustomer')}>
        <CustomerForm customer={customer} onClose={() => setIsEditModalOpen(false)} />
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title={t('deleteConfirmation')}>
        <div>
          <p>{t('deleteCustomerWarning')}</p>
          <div className="flex justify-end space-x-3 pt-4 mt-4">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!paymentToDelete} onClose={() => setPaymentToDelete(null)} title={t('deleteConfirmation')}>
        <div>
          <p>{t('deletePaymentWarning')}</p>
          <div className="flex justify-end space-x-3 pt-4 mt-4">
            <Button variant="secondary" onClick={() => setPaymentToDelete(null)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={handleDeletePayment}>{t('delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDetail;