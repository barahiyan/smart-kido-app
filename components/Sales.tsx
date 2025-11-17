

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, EditIcon, TrashIcon } from '../utils/icons';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { ProductCategory, type Sale, type Customer } from '../types';

const QuickCustomerForm: React.FC<{onCustomerCreate: (customer: Customer) => void}> = ({ onCustomerCreate }) => {
    const { t, addCustomer } = useAppContext();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newCustomerData = { name, phone, address: '', paymentType: 'Credit' as const, notes: '' };
        const newCustomer = addCustomer(newCustomerData);
        onCustomerCreate(newCustomer);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded-md space-y-3 bg-slate-50">
            <h3 className="font-semibold">{t('createNewCustomer')}</h3>
            <Input id="quick-name" label={t('name')} value={name} onChange={e => setName(e.target.value)} required />
            <Input id="quick-phone" label={t('phone')} value={phone} onChange={e => setPhone(e.target.value)} />
            <Button type="submit" size="sm">{t('save')}</Button>
        </form>
    );
};


const SaleForm: React.FC<{onClose: () => void, sale?: Sale | null}> = ({ onClose, sale }) => {
    const { t, customers, products, addSale, updateSale, formatCurrency } = useAppContext();
    
    const [customerId, setCustomerId] = useState('');
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (sale) {
            setCustomerId(sale.customerId);
            setProductId(sale.productId);
            setQuantity(String(sale.quantity));
            setUnitPrice(String(sale.unitPrice));
            setDate(new Date(sale.date).toISOString().split('T')[0]);
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            setAmountPaid(String(totalPaid));
        } else {
             setDate(new Date().toISOString().split('T')[0]);
        }
    }, [sale]);

    const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);
    const totalAmount = Number(quantity) * Number(unitPrice);
    
    useEffect(() => {
        if (selectedProduct && !sale) { // Only autofill for new sales
            setUnitPrice(String(selectedProduct.sellingPrice));
        }
    }, [selectedProduct, sale]);

    const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'new') {
            setShowNewCustomerForm(true);
            setCustomerId('');
        } else {
            setShowNewCustomerForm(false);
            setCustomerId(value);
        }
    };

    const handleCustomerCreated = (newCustomer: Customer) => {
        setCustomerId(newCustomer.id);
        setShowNewCustomerForm(false);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || !productId) return;
        
        const saleData = {
            customerId,
            productId,
            quantity: Number(quantity) || 0,
            unitPrice: Number(unitPrice) || 0,
            totalAmount,
            date: new Date(date).toISOString(),
        };

        if (sale) {
            updateSale({ ...sale, ...saleData });
        } else {
            const newSale: Omit<Sale, 'id'> = {
                ...saleData,
                payments: Number(amountPaid) > 0 ? [{ id: 'p' + Math.random(), amount: Number(amountPaid), date: new Date(date).toISOString()}] : []
            };
            addSale(newSale);
        }
        onClose();
    };
    
    const originalStock = useMemo(() => {
        if (!selectedProduct) return 0;
        // If editing, the original stock should include the quantity from the sale being edited
        return selectedProduct.stock + (sale && sale.productId === productId ? sale.quantity : 0);
    }, [selectedProduct, sale, productId]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select id="customer" label={t('customer')} value={customerId} onChange={handleCustomerChange} required>
                <option value="" disabled>{t('selectCustomer')}</option>
                {customers.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="new">{t('createNewCustomer')}</option>
            </Select>

            {showNewCustomerForm && <QuickCustomerForm onCustomerCreate={handleCustomerCreated} />}
            
            <Select id="product" label={t('product')} value={productId} onChange={e => setProductId(e.target.value)} required>
                <option value="" disabled>{t('selectProduct')}</option>
                {products.filter(p => p.stock > 0 || (sale && p.id === sale.productId)).map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock} {t('inStock')})</option>)}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  id="quantity" 
                  label={t('quantity')} 
                  type="number" 
                  min="0" 
                  max={originalStock}
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} />
                <Input id="unitPrice" label={t('unitPrice')} type="number" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
            </div>
             {selectedProduct && <p className="text-sm text-slate-500">{t('stockAvailable')}: {originalStock}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="totalAmount" label={t('totalAmount')} type="number" value={totalAmount || ''} readOnly className="bg-slate-100" />
              <Input id="saleDate" label={t('date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            
            <Input id="amountPaid" label={t('amountPaid')} type="number" min="0" max={totalAmount} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} disabled={!!sale} />
            <p className="text-right font-semibold">{t('remainingBalance')}: {formatCurrency(totalAmount - Number(amountPaid))}</p>

             <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button type="submit" disabled={!customerId || !productId || Number(quantity) <= 0 || Number(quantity) > originalStock }>{t('save')}</Button>
            </div>
        </form>
    );
};

export const PaymentForm: React.FC<{ sale: Sale; onClose: () => void }> = ({ sale, onClose }) => {
    const { t, recordPayment, formatCurrency, products } = useAppContext();
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const product = products.find(p => p.id === sale.productId);
    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = sale.totalAmount - totalPaid;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        recordPayment(sale.id, { amount: Number(amount), date: new Date(paymentDate).toISOString() });
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

const Sales: React.FC = () => {
    const { t, sales, customers, products, formatCurrency, formatDate, deleteSale } = useAppContext();
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const salesWithDetails = useMemo(() => {
        return sales.map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const product = products.find(p => p.id === sale.productId);
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = sale.totalAmount - totalPaid;
            const profit = product ? (sale.unitPrice - product.costPrice) * sale.quantity : 0;
            return { ...sale, customerName: (customer && customer.name) || 'N/A', productName: (product && product.name) || 'N/A', totalPaid, balance, profit };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, customers, products]);

    const filteredSales = useMemo(() => {
        return salesWithDetails.filter(s => 
            s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [salesWithDetails, searchTerm]);

    const handleRecordPayment = (sale: Sale) => {
        setSelectedSale(sale);
        setIsPaymentModalOpen(true);
    };

    const handleEditSale = (sale: Sale) => {
        setSaleToEdit(sale);
        setIsSaleModalOpen(true);
    };

    const handleDeleteSale = () => {
        if (saleToDelete) {
            deleteSale(saleToDelete.id);
            setSaleToDelete(null);
        }
    }

    const closeSaleModal = () => {
        setIsSaleModalOpen(false);
        setSaleToEdit(null);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">{t('sales')}</h1>
                <Button onClick={() => setIsSaleModalOpen(true)}>
                    <PlusIcon className="mr-2" /> {t('addSale')}
                </Button>
            </div>

            <Card>
                 <div className="mb-4">
                    <Input id="search-sales" label={t('search')} placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('product')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('customer')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('amount')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('profit')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('balance')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600">{t('date')}</th>
                                <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-3 font-medium whitespace-nowrap">{sale.productName}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{sale.customerName}</td>
                                    <td className="p-3 font-semibold whitespace-nowrap">{formatCurrency(sale.totalAmount)}</td>
                                    <td className="p-3 font-semibold text-green-600 whitespace-nowrap">{formatCurrency(sale.profit)}</td>
                                    <td className={`p-3 font-semibold whitespace-nowrap ${sale.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>{formatCurrency(sale.balance)}</td>
                                    <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{formatDate(sale.date)}</td>
                                    <td className="p-3 text-right whitespace-nowrap space-x-2">
                                        {sale.balance > 0 && <Button size="sm" onClick={() => handleRecordPayment(sale)}>{t('recordPayment')}</Button>}
                                        <Button size="sm" variant="secondary" onClick={() => handleEditSale(sale)}><EditIcon /></Button>
                                        <Button size="sm" variant="danger" onClick={() => setSaleToDelete(sale)}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredSales.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
                </div>
            </Card>

            <Modal isOpen={isSaleModalOpen} onClose={closeSaleModal} title={saleToEdit ? t('editSale') : t('newSale')}>
                <SaleForm onClose={closeSaleModal} sale={saleToEdit} />
            </Modal>
            
            {selectedSale && (
                <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={t('newPayment')}>
                    <PaymentForm sale={selectedSale} onClose={() => setIsPaymentModalOpen(false)} />
                </Modal>
            )}

            <Modal isOpen={!!saleToDelete} onClose={() => setSaleToDelete(null)} title={t('deleteConfirmation')}>
                <div>
                    <p>{t('deleteSaleWarning')}</p>
                    <div className="flex justify-end space-x-3 pt-4 mt-4">
                        <Button variant="secondary" onClick={() => setSaleToDelete(null)}>{t('cancel')}</Button>
                        <Button variant="danger" onClick={handleDeleteSale}>{t('delete')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Sales;
