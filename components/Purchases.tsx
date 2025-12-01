import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, EditIcon, TrashIcon } from '../utils/icons';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { Purchase, Product, Supplier } from '../types';
import { SupplierPaymentForm } from './SupplierPaymentForm';

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
    runTransaction
} from 'firebase/firestore';

// --- SEHEMU YA 1: FOMU YA MANUNUZI (Purchase Form) ---
const PurchaseForm: React.FC<{ onClose: () => void, purchase?: Purchase | null, products: Product[], suppliers: Supplier[] }> = ({ onClose, purchase, products, suppliers }) => {
    const { t, formatCurrency } = useAppContext();

    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [purchaseType, setPurchaseType] = useState<'Cash' | 'Credit'>('Cash');
    const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
    const [amountPaid, setAmountPaid] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalAmount = Number(quantity) * Number(costPrice);

    useEffect(() => {
        if (purchase) {
            setProductId(purchase.productId);
            setQuantity(String(purchase.quantity));
            setCostPrice(String(purchase.costPrice));
            setPurchaseType(purchase.purchaseType);
            setSupplierId(purchase.supplierId);
            const purchaseDate = typeof purchase.date === 'string' ? purchase.date : new Date().toISOString();
            setDate(purchaseDate.split('T')[0]);

            const totalPaid = purchase.payments ? purchase.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
            setAmountPaid(String(totalPaid));
        } else {
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [purchase]);

    // Auto-fill cost price
    useEffect(() => {
        if (!purchase && productId) {
            const selectedProduct = products.find(p => p.id === productId);
            if (selectedProduct) {
                setCostPrice(String(selectedProduct.costPrice));
            }
        }
    }, [productId, products, purchase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) return;

        setIsSubmitting(true);

        const qtyNumber = Number(quantity) || 0;
        const costNumber = Number(costPrice) || 0;
        const paidNumber = Number(amountPaid) || 0;
        const total = qtyNumber * costNumber;

        try {
            if (purchase) {
                // UPDATE (Edit Purchase) - Hapa tuna-update rekodi tu, stock logic ni complex
                const purchaseRef = doc(db, "manunuzi", purchase.id);
                await updateDoc(purchaseRef, {
                    // productId, 
                    // quantity: qtyNumber, // Tusi-update quantity/product kuepuka stock issues kwa sasa
                    costPrice: costNumber,
                    totalAmount: total,
                    date: new Date(date).toISOString(),
                    purchaseType,
                    supplierId,
                    updatedAt: serverTimestamp()
                });
                alert("Manunuzi yamebadilishwa (Stock haijaguswa).");
            } else {
                // CREATE (New Purchase) - Transaction kuongeza stock
                await runTransaction(db, async (transaction) => {
                    // 1. Pata bidhaa
                    const productRef = doc(db, "bidhaa", productId);
                    const productDoc = await transaction.get(productRef);

                    if (!productDoc.exists()) {
                        throw "Bidhaa haipo!";
                    }

                    // 2. Ongeza Stock
                    const currentStock = productDoc.data().stock || 0;
                    const newStock = currentStock + qtyNumber;
                    transaction.update(productRef, { stock: newStock });

                    // 3. Tengeneza Manunuzi Mapya
                    const newPurchaseRef = doc(collection(db, "manunuzi"));
                    const purchaseData = {
                        productId,
                        quantity: qtyNumber,
                        costPrice: costNumber,
                        totalAmount: total,
                        date: new Date(date).toISOString(),
                        purchaseType,
                        supplierId: supplierId || null,
                        payments: (purchaseType === 'Credit' && paidNumber > 0) ? [{
                            id: 'init_pay',
                            amount: paidNumber,
                            date: new Date(date).toISOString()
                        }] : [],
                        createdAt: serverTimestamp()
                    };
                    transaction.set(newPurchaseRef, purchaseData);
                });
            }
            onClose();
        } catch (error: any) {
            console.error("Error saving purchase:", error);
            alert(typeof error === 'string' ? error : "Imeshindikana kuhifadhi manunuzi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
    const sortedSuppliers = useMemo(() => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)), [suppliers]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select id="product" label={t('product')} value={productId} onChange={e => setProductId(e.target.value)} required disabled={!!purchase}>
                <option value="" disabled>{t('selectProduct')}</option>
                {sortedProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    id="quantity"
                    label={t('quantity')}
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    disabled={!!purchase}
                />
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
                    {sortedSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
            </div>

            {purchaseType === 'Credit' && (
                <>
                    <Input id="amountPaid" label={t('amountPaid')} type="number" min="0" max={totalAmount} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} disabled={!!purchase} />
                    <p className="text-right font-semibold">{t('remainingBalance')}: {formatCurrency(totalAmount - Number(amountPaid))}</p>
                </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</Button>
                <Button type="submit" disabled={!productId || Number(quantity) <= 0 || (purchaseType === 'Credit' && !supplierId) || isSubmitting}>
                    {isSubmitting ? 'Inahifadhi...' : t('save')}
                </Button>
            </div>
        </form>
    );
};

// --- SEHEMU YA 2: ORODHA YA MANUNUZI (Purchases List) ---
const Purchases: React.FC = () => {
    const { t, formatCurrency, formatDate } = useAppContext();

    // State za Firebase
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);

    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [purchaseToEdit, setPurchaseToEdit] = useState<Purchase | null>(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<Purchase | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. KUVUTA DATA ZOTE
    useEffect(() => {
        setLoading(true);
        // Manunuzi
        const unsubPurchases = onSnapshot(query(collection(db, "manunuzi"), orderBy("date", "desc")), (s) =>
            setPurchases(s.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)))
        );
        // Bidhaa
        const unsubProducts = onSnapshot(collection(db, "bidhaa"), (s) =>
            setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
        );
        // Wazabuni
        const unsubSuppliers = onSnapshot(collection(db, "wazabuni"), (s) => {
            setSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
            setLoading(false);
        });

        return () => { unsubPurchases(); unsubProducts(); unsubSuppliers(); };
    }, []);

    const purchasesWithDetails = useMemo(() => {
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        return purchases.map(purchase => {
            const product = products.find(p => p.id === purchase.productId);
            const payments = purchase.payments || [];
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = purchase.totalAmount - totalPaid;
            return {
                ...purchase,
                productName: (product && product.name) || 'Deleted Product',
                supplierName: (purchase.supplierId && supplierMap.get(purchase.supplierId)) || 'N/A',
                balance
            };
        });
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

    // 2. KUFUTA MANUNUZI NA KUPUNGUZA STOCK
    const handleDeletePurchase = async () => {
        if (purchaseToDelete) {
            try {
                await runTransaction(db, async (transaction) => {
                    // Punguza stock iliyoongezwa (reverse)
                    const productRef = doc(db, "bidhaa", purchaseToDelete.productId);
                    const productDoc = await transaction.get(productRef);

                    if (productDoc.exists()) {
                        const currentStock = productDoc.data().stock || 0;
                        const newStock = Math.max(0, currentStock - purchaseToDelete.quantity); // Usiruhusu negative
                        transaction.update(productRef, { stock: newStock });
                    }

                    // Futa manunuzi
                    const purchaseRef = doc(db, "manunuzi", purchaseToDelete.id);
                    transaction.delete(purchaseRef);
                });
            } catch (error) {
                console.error("Error deleting purchase:", error);
                alert("Imeshindikana kufuta manunuzi.");
            }
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
                    {loading ? <p className="text-center py-4">Inapakua Manunuzi...</p> : (
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
                                        <td className="p-3 font-medium whitespace-nowrap">{purchase.productName}</td>
                                        <td className="p-3 text-slate-600 whitespace-nowrap">{purchase.supplierName}</td>
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
                    )}
                    {!loading && filteredPurchases.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
                </div>
            </Card>

            <Modal isOpen={isPurchaseModalOpen} onClose={closeModal} title={purchaseToEdit ? t('editPurchase') : t('newPurchase')}>
                <PurchaseForm onClose={closeModal} purchase={purchaseToEdit} products={products} suppliers={suppliers} />
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