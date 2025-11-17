

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, EditIcon, TrashIcon } from '../utils/icons';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { Purchase, Supplier } from '../types';

const PurchaseForm: React.FC<{onClose: () => void, purchase?: Purchase | null}> = ({ onClose, purchase }) => {
    const { t, products, suppliers, addPurchase, updatePurchase, formatCurrency } = useAppContext();
    
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [purchaseType, setPurchaseType] = useState<'Cash' | 'Credit'>('Cash');
    const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
    const [amountPaid, setAmountPaid] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const totalAmount = Number(quantity) * Number(costPrice);

    useEffect(() => {
        if (purchase) {
            setProductId(purchase.productId);
            setQuantity(String(purchase.quantity));
            setCostPrice(String(purchase.costPrice));
            setPurchaseType(purchase.purchaseType);
            setSupplierId(purchase.supplierId);
            setDate(new Date(purchase.date).toISOString().split('T')[0]);
            const totalPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
            setAmountPaid(String(totalPaid));
        } else {
            // Reset form for new purchase
            setProductId('');
            setQuantity('');
            setCostPrice('');
            setPurchaseType('Cash');
            setSupplierId(undefined);
            setDate(new Date().toISOString().split('T')[0]);
            setAmountPaid('');
        }
    }, [purchase]);
    
    useEffect(() => {
        if (!purchase) { // Only auto-fill price for new entries
            const selectedProduct = products.find(p => p.id === productId);
            if (selectedProduct) {
                setCostPrice(String(selectedProduct.costPrice));
            } else {
                setCostPrice('');
            }
        }
    }, [productId, products, purchase]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) return;
        
        const purchaseData = {
            productId,
            quantity: Number(quantity) || 0,
            costPrice: Number(costPrice) || 0,
            totalAmount,
            date: new Date(date).toISOString(),
            purchaseType,
            supplierId,
        };

        if (purchase) {
            const updatedPurchase: Purchase = {
                ...purchase,
                ...purchaseData,
            }
            updatePurchase(updatedPurchase);
        } else {
            const newPurchase: Omit<Purchase, 'id'> = {
                ...purchaseData,
                payments: (purchaseType === 'Credit' && Number(amountPaid) > 0) ? [{ id: 'p' + Math.random(), amount: Number(amountPaid), date: new Date(date).toISOString()}] : []
            };
            addPurchase(newPurchase);
        }
        
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select id="product" label={t('product')} value={productId} onChange={e => setProductId(e.target.value)} required>
                <option value="" disabled>{t('selectProduct')}</option>
                {products.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="quantity" label={t('quantity')} type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
                <Input id="costPrice" label={t('costPrice')} type="number" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
            </div>

            <Input id="totalAmount" label={t('totalAmount')} type="number" value={totalAmount || ''} readOnly className="bg-slate-100" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select id="purchaseType" label={t('purchaseType')} value={purchaseType} onChange={e => setPurchaseType(e.target.value as 'Cash' | 'Credit')}>
                  <option value="Cash">{t('cash')}</option>
                  <option value="Credit">{t('credit')}</option>
              </Select>
              <Input id="purchaseDate" label={t('date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div>
                <Select 
                    id="supplier" 
                    label={t('supplier')}
                    value={supplierId || ''} 
                    onChange={(e) => setSupplierId(e.target.value || undefined)}
                    required={purchaseType === 'Credit'}
                >
                    <option value="">
                        {purchaseType === 'Credit' ? t('selectSupplier') : `${t('selectSupplier')} (${t('optional')})`}
                    </option>
                    {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
            </div>
            
            {purchaseType === 'Credit' && (
                <>
                <Input id="amountPaid" label={t('amountPaid')} type="number" min="0" max={totalAmount} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} disabled={!!purchase} />
                <p className="text-right font-semibold">{t('remainingBalance')}: {formatCurrency(totalAmount - Number(amountPaid))}</p>
                </>
            )}


             <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button type="submit" disabled={!productId || Number(quantity) <= 0 || (purchaseType === 'Credit' && !supplierId)}>{t('save')}</Button>
            </div>
        </form>
    );
};

export const SupplierPaymentForm: React.FC<{ purchase: Purchase; onClose: () => void }> = ({ purchase, onClose }) => {
    const { t, recordSupplierPayment, formatCurrency, products } = useAppContext();
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const product = products.find(p => p.id === purchase.productId);
    const totalPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = purchase.totalAmount - totalPaid;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        recordSupplierPayment(purchase.id, { amount: Number(amount), date: new Date(paymentDate).toISOString() });
        onClose();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p>{t('productName')}: <span className="font-semibold">{(product && product.name) || 'N/A'}</span></p>
            <p>{t('remainingBalance')}: <span className="font-semibold text-red-500">{formatCurrency(balance)}</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="paymentAmount" label={t('paymentAmount')} type="number" min="0" max={balance} value={amount} onChange={e => setAmount(e.target.value)} required/>
              <Input id="paymentDate" label={t('paymentDate')} type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
            </div>
             <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button type="submit">{t('recordPayment')}</Button>
            </div>
        </form>
    )
}

const Purchases: React.FC = () => {
    const { t, purchases, products, suppliers, formatCurrency, formatDate, deletePurchase } = useAppContext();
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [purchaseToEdit, setPurchaseToEdit] = useState<Purchase | null>(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<Purchase | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const purchasesWithDetails = useMemo(() => {
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        return purchases.map(purchase => {
            const product = products.find(p => p.id === purchase.productId);
            const totalPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = purchase.totalAmount - totalPaid;
            return { 
                ...purchase, 
                productName: (product && product.name) || '', 
                supplierName: (purchase.supplierId && supplierMap.get(purchase.supplierId)) || '', 
                balance 
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [purchases, products, suppliers]);

    const filteredPurchases = useMemo(() => {
        if (!searchTerm) return purchasesWithDetails;
        const term = searchTerm.toLowerCase();
        return purchasesWithDetails.filter(p => {
            const productNameMatch = p.productName.toLowerCase().includes(term);
            const supplierNameMatch = p.supplierName.toLowerCase().includes(term);
            return productNameMatch || supplierNameMatch;
        });
    }, [purchasesWithDetails, searchTerm]);

    const handleAddPurchase = () => {
        setPurchaseToEdit(null);
        setIsPurchaseModalOpen(true);
    }
    
    const handleEditPurchase = (purchase: Purchase) => {
        setPurchaseToEdit(purchase);
        setIsPurchaseModalOpen(true);
    };

    const handleDeletePurchase = () => {
        if (purchaseToDelete) {
            deletePurchase(purchaseToDelete.id);
            setPurchaseToDelete(null);
        }
    }

    const handleRecordPayment = (purchase: Purchase) => {
        setSelectedPurchaseForPayment(purchase);
        setIsPaymentModalOpen(true);
    };
    
    const closeModal = () => {
        setIsPurchaseModalOpen(false);
        setPurchaseToEdit(null);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">{t('purchases')}</h1>
                <Button onClick={handleAddPurchase}>
                    <PlusIcon className="mr-2" /> {t('addPurchase')}
                </Button>
            </div>

            <Card>
                 <div className="mb-4">
                    <Input id="search-purchases" label={t('search')} placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('product')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('supplier')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('amount')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('balance')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('date')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchases.map(purchase => (
                                <tr key={purchase.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-3 font-medium whitespace-nowrap">{purchase.productName || 'N/A'}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{purchase.supplierName || 'N/A'}</td>
                                    <td className="p-3 font-semibold whitespace-nowrap">{formatCurrency(purchase.totalAmount)}</td>
                                    <td className={`p-3 font-semibold whitespace-nowrap ${purchase.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>{formatCurrency(purchase.balance)}</td>
                                    <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{formatDate(purchase.date)}</td>
                                    <td className="p-3 text-right whitespace-nowrap space-x-2">
                                        {purchase.purchaseType === 'Credit' && purchase.balance > 0 && <Button size="sm" onClick={() => handleRecordPayment(purchase)}>{t('recordPayment')}</Button>}
                                        <Button size="sm" variant="secondary" onClick={() => handleEditPurchase(purchase)}><EditIcon /></Button>
                                        <Button size="sm" variant="danger" onClick={() => setPurchaseToDelete(purchase)}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredPurchases.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
                </div>
            </Card>

            <Modal isOpen={isPurchaseModalOpen} onClose={closeModal} title={purchaseToEdit ? t('editPurchase') : t('newPurchase')}>
                <PurchaseForm onClose={closeModal} purchase={purchaseToEdit} />
            </Modal>
            
            {selectedPurchaseForPayment && (
                <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={t('newPayment')}>
                    <SupplierPaymentForm purchase={selectedPurchaseForPayment} onClose={() => setIsPaymentModalOpen(false)} />
                </Modal>
            )}

             <Modal isOpen={!!purchaseToDelete} onClose={() => setPurchaseToDelete(null)} title={t('deleteConfirmation')}>
                <div>
                    <p>{t('deletePurchaseWarning')}</p>
                    <div className="flex justify-end space-x-3 pt-4 mt-4">
                        <Button variant="secondary" onClick={() => setPurchaseToDelete(null)}>{t('cancel')}</Button>
                        <Button variant="danger" onClick={handleDeletePurchase}>{t('delete')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Purchases;
