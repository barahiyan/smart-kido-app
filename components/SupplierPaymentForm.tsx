
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import { Purchase } from '../types';

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
