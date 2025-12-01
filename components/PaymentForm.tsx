import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import { Sale } from '../types';

// Firebase Imports
import { db } from '../firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export const PaymentForm: React.FC<{ sale: Sale; onClose: () => void }> = ({ sale, onClose }) => {
    const { t, formatCurrency, products } = useAppContext();
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tafuta jina la bidhaa (kwa ajili ya display tu)
    const product = products.find(p => p.id === sale.productId);

    // Kokotoa deni lililobaki
    const payments = sale.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = sale.totalAmount - totalPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payAmount = Number(amount);
        if (payAmount <= 0 || payAmount > balance) {
            alert("Kiasi cha kulipa si sahihi. Haiwezi kuzidi deni.");
            return;
        }

        setIsSubmitting(true);

        try {
            await runTransaction(db, async (transaction) => {
                // 1. Pata data mpya ya mauzo (kuhakikisha deni bado lipo)
                const saleRef = doc(db, "mauzo", sale.id);
                const saleDoc = await transaction.get(saleRef);

                if (!saleDoc.exists()) {
                    throw "Mauzo haya hayapo!";
                }

                const currentSale = saleDoc.data();
                const currentPayments = currentSale.payments || [];

                // 2. Ongeza malipo mapya
                const newPayment = {
                    id: 'pay_' + Date.now(), // ID ya kipekee
                    amount: payAmount,
                    date: new Date(paymentDate).toISOString()
                };

                const updatedPayments = [...currentPayments, newPayment];

                // 3. Angalia kama deni limeisha
                const newTotalPaid = updatedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
                const newPaymentType = newTotalPaid >= currentSale.totalAmount ? 'Cash' : 'Credit';

                // 4. Update Firebase
                transaction.update(saleRef, {
                    payments: updatedPayments,
                    paymentType: newPaymentType,
                    updatedAt: serverTimestamp()
                });
            });

            // alert("Malipo yamerekodiwa kikamilifu!");
            onClose();
        } catch (error) {
            console.error("Error recording payment:", error);
            alert("Imeshindikana kurekodi malipo. Tafadhali jaribu tena.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p>{t('productName')}: <span className="font-semibold">{(product && product.name) || 'N/A'}</span></p>
            <p>{t('remainingBalance')}: <span className="font-semibold text-red-500">{formatCurrency(balance)}</span></p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    id="paymentAmount"
                    label={t('paymentAmount')}
                    type="number"
                    min="0"
                    max={balance}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                />
                <Input
                    id="paymentDate"
                    label={t('paymentDate')}
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Inarekodi...' : t('recordPayment')}
                </Button>
            </div>
        </form>
    )
}