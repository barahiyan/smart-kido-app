import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, EditIcon, TrashIcon } from '../utils/icons';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { type Sale, type Customer, type Product } from '../types';
import { CustomerForm } from './CustomerForm';
import { PaymentForm } from './PaymentForm';

// Firebase Imports
import { db } from '../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    runTransaction,
    getDoc
} from 'firebase/firestore';

// --- SEHEMU YA 1: FOMU YA MAUZO (Sale Form) ---
const SaleForm: React.FC<{ onClose: () => void, sale?: Sale | null, products: Product[], customers: Customer[] }> = ({ onClose, sale, products, customers }) => {
    const { t, formatCurrency } = useAppContext();

    // State za Fomu
    const [customerId, setCustomerId] = useState('');
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Kujaza fomu kama tunafanya Edit
    useEffect(() => {
        if (sale) {
            setCustomerId(sale.customerId);
            setProductId(sale.productId);
            setQuantity(String(sale.quantity));
            setUnitPrice(String(sale.unitPrice));
            // Hakikisha date ipo na ni string kabla ya kuisplit
            const saleDate = typeof sale.date === 'string' ? sale.date : new Date().toISOString();
            setDate(saleDate.split('T')[0]);

            const totalPaid = sale.payments ? sale.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
            setAmountPaid(String(totalPaid));
        } else {
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [sale]);

    const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);
    const totalAmount = Number(quantity) * Number(unitPrice);

    // Kujaza bei kiotomatiki ukichagua bidhaa
    useEffect(() => {
        if (selectedProduct && !sale) {
            setUnitPrice(String(selectedProduct.sellingPrice));
        }
    }, [selectedProduct, sale]);

    const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'new') {
            setIsCustomerModalOpen(true);
        } else {
            setCustomerId(value);
        }
    };

    const handleCustomerCreated = (newCustomer: Customer) => {
        // Hii itaitwa na CustomerForm ikimaliza kutuma Firebase
        setCustomerId(newCustomer.id);
        setIsCustomerModalOpen(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || !productId) return;

        setIsSubmitting(true);

        const qtyNumber = Number(quantity) || 0;
        const priceNumber = Number(unitPrice) || 0;
        const paidNumber = Number(amountPaid) || 0;
        const total = qtyNumber * priceNumber;

        try {
            if (sale) {
                // UPDATE (Edit Sale) - Hii ni ngumu kidogo, kwa sasa tuna-update taarifa za mauzo tu
                // Logic ya kurudisha stock na kukata tena ni complex, hapa tuna-update rekodi tu
                const saleRef = doc(db, "mauzo", sale.id);
                await updateDoc(saleRef, {
                    customerId,
                    // productId, // Kuepuka kuvuruga stock, tusi-update product kwa sasa kwenye edit
                    // quantity: qtyNumber, // Vivyo hivyo kwa quantity
                    unitPrice: priceNumber,
                    totalAmount: total,
                    date: new Date(date).toISOString(),
                    updatedAt: serverTimestamp()
                });
                alert("Mauzo yamebadilishwa (Kumbuka: Stock haijaguswa kwenye Edit).");
            } else {
                // CREATE (New Sale) - Hapa tunatumia Transaction kupunguza Stock
                await runTransaction(db, async (transaction) => {
                    // 1. Pata bidhaa uhakikishe ipo na stock inatosha
                    const productRef = doc(db, "bidhaa", productId);
                    const productDoc = await transaction.get(productRef);

                    if (!productDoc.exists()) {
                        throw "Bidhaa haipo!";
                    }

                    const currentStock = productDoc.data().stock || 0;
                    if (currentStock < qtyNumber) {
                        throw "Bidhaa hazitoshi stoo! Zimebaki " + currentStock;
                    }

                    // 2. Punguza Stock
                    const newStock = currentStock - qtyNumber;
                    transaction.update(productRef, { stock: newStock });

                    // 3. Tengeneza Mauzo Mpya
                    const newSaleRef = doc(collection(db, "mauzo"));
                    const saleData = {
                        customerId,
                        productId,
                        quantity: qtyNumber,
                        unitPrice: priceNumber,
                        totalAmount: total,
                        date: new Date(date).toISOString(),
                        paymentType: (paidNumber >= total) ? 'Cash' : 'Credit',
                        payments: paidNumber > 0 ? [{
                            id: 'initial_pay',
                            amount: paidNumber,
                            date: new Date(date).toISOString()
                        }] : [],
                        createdAt: serverTimestamp()
                    };
                    transaction.set(newSaleRef, saleData);
                });
            }
            onClose();
        } catch (error: any) {
            console.error("Error processing sale:", error);
            // Onyesha ujumbe kama ni ishu ya stock
            alert(typeof error === 'string' ? error : "Imeshindikana kuuza. Jaribu tena.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Kokotoa stock halisi (kama ni edit, jumlisha ile ya mwanzo)
    const originalStock = useMemo(() => {
        if (!selectedProduct) return 0;
        return selectedProduct.stock + (sale && sale.productId === productId ? sale.quantity : 0);
    }, [selectedProduct, sale, productId]);

    const sortedCustomers = useMemo(() => {
        return [...customers].sort((a, b) => a.name.localeCompare(b.name));
    }, [customers]);

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Select id="customer" label={t('customer')} value={customerId} onChange={handleCustomerChange} required>
                            <option value="" disabled>{t('selectCustomer')}</option>
                            {sortedCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            <option value="new" className="font-bold text-primary-600">+ {t('createNewCustomer')}</option>
                        </Select>
                    </div>
                    <Button type="button" onClick={() => setIsCustomerModalOpen(true)} className="mb-[2px] px-3" title={t('addCustomer')}>
                        <PlusIcon className="w-5 h-5" />
                    </Button>
                </div>

                <Select id="product" label={t('product')} value={productId} onChange={e => setProductId(e.target.value)} required disabled={!!sale}>
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
                        onChange={e => setQuantity(e.target.value)}
                        disabled={!!sale} // Disable quantity on edit for simplicity (stock logic)
                    />
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
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</Button>
                    <Button type="submit" disabled={!customerId || !productId || Number(quantity) <= 0 || isSubmitting}>{isSubmitting ? 'Inakata Stock...' : t('save')}</Button>
                </div>
            </form>

            <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title={t('newCustomer')}>
                <CustomerForm onClose={() => setIsCustomerModalOpen(false)} onSuccess={handleCustomerCreated} />
            </Modal>
        </>
    );
};

// --- SEHEMU YA 2: ORODHA YA MAUZO (Sales List) ---
const Sales: React.FC = () => {
    const { t, formatCurrency, formatDate } = useAppContext();

    // State za Firebase
    const [sales, setSales] = useState<Sale[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. KUVUTA DATA ZOTE (Mauzo, Wateja, Bidhaa)
    useEffect(() => {
        setLoading(true);
        // Mauzo
        const unsubSales = onSnapshot(query(collection(db, "mauzo"), orderBy("date", "desc")), (s) =>
            setSales(s.docs.map(d => ({ id: d.id, ...d.data() } as Sale)))
        );
        // Wateja
        const unsubCustomers = onSnapshot(collection(db, "wateja"), (s) =>
            setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer)))
        );
        // Bidhaa
        const unsubProducts = onSnapshot(collection(db, "bidhaa"), (s) => {
            setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            setLoading(false);
        });

        return () => { unsubSales(); unsubCustomers(); unsubProducts(); };
    }, []);

    const salesWithDetails = useMemo(() => {
        return sales.map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const product = products.find(p => p.id === sale.productId);
            // Hakikisha payments ni array kabla ya reduce
            const payments = sale.payments || [];
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = sale.totalAmount - totalPaid;
            const profit = product ? (sale.unitPrice - product.costPrice) * sale.quantity : 0;
            return {
                ...sale,
                customerName: (customer && customer.name) || 'Deleted Customer',
                productName: (product && product.name) || 'Deleted Product',
                totalPaid,
                balance,
                profit
            };
        });
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

    // 2. KUFUTA MAUZO NA KURUDISHA STOCK
    const handleDeleteSale = async () => {
        if (saleToDelete) {
            try {
                await runTransaction(db, async (transaction) => {
                    // Rudisha stock kwa bidhaa
                    const productRef = doc(db, "bidhaa", saleToDelete.productId);
                    const productDoc = await transaction.get(productRef);

                    if (productDoc.exists()) {
                        const currentStock = productDoc.data().stock || 0;
                        const newStock = currentStock + saleToDelete.quantity;
                        transaction.update(productRef, { stock: newStock });
                    }

                    // Futa mauzo
                    const saleRef = doc(db, "mauzo", saleToDelete.id);
                    transaction.delete(saleRef);
                });
                // alert("Mauzo yamefutwa na stock imerudishwa.");
            } catch (error) {
                console.error("Error deleting sale:", error);
                alert("Imeshindikana kufuta mauzo.");
            }
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
                    {loading ? <p className="text-center py-4">Inapakua Mauzo...</p> : (
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
                    )}
                    {!loading && filteredSales.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
                </div>
            </Card>

            <Modal isOpen={isSaleModalOpen} onClose={closeSaleModal} title={saleToEdit ? t('editSale') : t('newSale')}>
                {/* Hapa tunapitisha products na customers kwa sababu SaleForm ipo ndani ya modal */}
                <SaleForm onClose={closeSaleModal} sale={saleToEdit} products={products} customers={customers} />
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