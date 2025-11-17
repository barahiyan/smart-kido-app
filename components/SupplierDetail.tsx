

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Purchase } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import { SupplierForm } from './Suppliers';
import { SupplierPaymentForm } from './Purchases';
import { TrashIcon } from '../utils/icons';

interface SupplierDetailProps {
  supplierId: string;
  onBack: () => void;
}

const SupplierDetail: React.FC<SupplierDetailProps> = ({ supplierId, onBack }) => {
  const { t, suppliers, purchases, products, formatCurrency, formatDate, deleteSupplier, deleteSupplierPayment } = useAppContext();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{purchaseId: string, paymentId: string} | null>(null);

  const supplier = suppliers.find(s => s.id === supplierId);
  
  const { supplierPurchases, totalPayable } = useMemo(() => {
    if (!supplier) return { supplierPurchases: [], totalPayable: 0 };

    const filteredPurchases = purchases
      .filter(p => p.supplierId === supplierId)
      .map(purchase => {
        const product = products.find(p => p.id === purchase.productId);
        const totalPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = purchase.totalAmount - totalPaid;
        return { ...purchase, totalPaid, balance, productName: (product && product.name) || 'N/A' };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const totalPayable = filteredPurchases.reduce((sum, p) => sum + p.balance, 0);
    
    return { supplierPurchases: filteredPurchases, totalPayable };
  }, [supplier, purchases, products]);


  if (!supplier) {
    return (
      <div>
        <p>Supplier not found.</p>
        <Button onClick={onBack}>{t('backToSuppliers')}</Button>
      </div>
    );
  }
  
  const handleRecordPayment = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsPaymentModalOpen(true);
  };

  const handleDelete = () => {
    if(supplier) {
        deleteSupplier(supplier.id);
        setShowDeleteConfirm(false);
        onBack();
    }
  }

  const handleDeletePayment = () => {
    if (paymentToDelete) {
        deleteSupplierPayment(paymentToDelete.purchaseId, paymentToDelete.paymentId);
        setPaymentToDelete(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Button onClick={onBack} variant="secondary">
          &larr; {t('backToSuppliers')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card title={t('supplierDetails')}>
                <div className="space-y-3">
                    <div>
                        <h4 className="text-sm text-slate-500">{t('name')}</h4>
                        <p className="font-semibold text-lg">{supplier.name}</p>
                    </div>
                     <div>
                        <h4 className="text-sm text-slate-500">{t('phone')}</h4>
                        <p className="font-semibold">{supplier.phone}</p>
                    </div>
                    <div>
                        <h4 className="text-sm text-slate-500">{t('address')}</h4>
                        <p className="font-semibold">{supplier.address || 'N/A'}</p>
                    </div>
                    {supplier.notes && (
                        <div>
                            <h4 className="text-sm text-slate-500">{t('notes')}</h4>
                            <p className="font-semibold text-sm italic bg-slate-50 p-2 rounded">{supplier.notes}</p>
                        </div>
                    )}
                </div>
                 <div className="mt-4 pt-4 border-t space-y-2">
                    <Button onClick={() => setIsEditModalOpen(true)} className="w-full" variant="secondary">{t('editSupplier')}</Button>
                    <Button onClick={() => setShowDeleteConfirm(true)} className="w-full" variant="danger">{t('delete')}</Button>
                </div>
            </Card>

             <Card>
                <h4 className="text-slate-500 font-medium">{t('totalPayable')}</h4>
                <p className={`text-4xl font-bold mt-2 ${totalPayable > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(totalPayable)}
                </p>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card title={t('purchaseHistory')}>
                <div className="space-y-6">
                    {supplierPurchases.length > 0 ? supplierPurchases.map(purchase => (
                        <div key={purchase.id} className="p-4 border rounded-lg">
                            <div className="flex flex-wrap justify-between items-start gap-2">
                                <div>
                                    <p className="font-bold text-lg text-dark">{purchase.productName}</p>
                                    <p className="text-sm text-slate-500">{formatDate(purchase.date)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{formatCurrency(purchase.totalAmount)}</p>
                                    <p className={`text-sm font-semibold ${purchase.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {t('balance')}: {formatCurrency(purchase.balance)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-dashed">
                                <h5 className="font-semibold text-sm mb-2">{t('paymentsMade')}</h5>
                                {purchase.payments.length > 0 ? (
                                    <ul className="space-y-1 text-sm list-inside">
                                        {purchase.payments.map(p => (
                                            <li key={p.id} className="flex justify-between items-center group">
                                                <span>{formatDate(p.date)} - <span className="font-medium text-slate-700">{formatCurrency(p.amount)}</span></span>
                                                <button onClick={() => setPaymentToDelete({purchaseId: purchase.id, paymentId: p.id})} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">{t('noPaymentsMade')}</p>
                                )}
                                {purchase.balance > 0 && (
                                    <div className="text-right mt-3">
                                        <Button size="sm" onClick={() => handleRecordPayment(purchase)}>{t('recordPayment')}</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 py-8">{t('noPurchasesYet')}</p>
                    )}
                </div>
            </Card>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('editSupplier')}>
        <SupplierForm supplier={supplier} onClose={() => setIsEditModalOpen(false)} />
      </Modal>

      {selectedPurchase && (
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={t('newPayment')}>
            <SupplierPaymentForm purchase={selectedPurchase} onClose={() => setIsPaymentModalOpen(false)} />
        </Modal>
      )}

       <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title={t('deleteConfirmation')}>
        <div>
          <p>{t('deleteSupplierWarning')}</p>
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

export default SupplierDetail;
