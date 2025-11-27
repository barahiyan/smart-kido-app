import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { ContactsIcon } from '../utils/icons';
import type { Customer } from '../types';
// Firebase Imports
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export interface CustomerFormProps {
  onClose: () => void;
  customer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, customer, onSuccess }) => {
  const { t } = useAppContext(); // Tunatumia t pekee, hatuhitaji addCustomer ya local storage tena

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>(customer?.paymentType || 'Credit');
  const [notes, setNotes] = useState(customer?.notes || '');

  // State ya kuzuia button wakati inatuma
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSelect = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert(t('contactPickerNotSupported'));
      return;
    }

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      // @ts-ignore
      const contacts = await navigator.contacts.select(props, opts);

      if (contacts.length) {
        const contact = contacts[0];
        if (contact.name && contact.name.length > 0) {
          setName(contact.name[0]);
        }
        if (contact.tel && contact.tel.length > 0) {
          setPhone(contact.tel[0]);
        }
      }
    } catch (ex) {
      console.log("Contact selection failed", ex);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Washa loading

    try {
      const customerData = {
        name,
        phone,
        address,
        paymentType,
        notes,
        updatedAt: serverTimestamp() // Weka muda wa sasa
      };

      if (customer) {
        // UPDATE: Kama tunabadilisha mteja aliyepo
        await updateDoc(doc(db, "wateja", customer.id), customerData);
      } else {
        // CREATE: Kama ni mteja mpya
        const docRef = await addDoc(collection(db, "wateja"), {
          ...customerData,
          createdAt: serverTimestamp() // Mteja mpya ana tarehe ya kuundwa
        });

        // Kama kuna onSuccess prop, tuitumie (ingawa Customers.tsx inasikiliza snapshot)
        if (onSuccess) {
          onSuccess({ id: docRef.id, ...customerData } as any);
        }
      }

      onClose(); // Funga fomu
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Imeshindikana kuhifadhi mteja. Tafadhali jaribu tena.");
    } finally {
      setIsSubmitting(false); // Zima loading
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="name" label={t('name')} value={name} onChange={e => setName(e.target.value)} required />
      <Input
        id="phone"
        label={t('phone')}
        value={phone}
        onChange={e => setPhone(e.target.value)}
        endAdornment={
          <button
            type="button"
            onClick={handleContactSelect}
            className="p-2 text-slate-400 hover:text-primary-600 focus:outline-none"
            title={t('selectContact')}
          >
            <ContactsIcon className="w-5 h-5" />
          </button>
        }
      />
      <Input id="address" label={t('address')} value={address} onChange={e => setAddress(e.target.value)} />
      <Select id="paymentType" label={t('paymentType')} value={paymentType} onChange={e => setPaymentType(e.target.value as 'Cash' | 'Credit')}>
        <option value="Credit">{t('credit')}</option>
        <option value="Cash">{t('cash')}</option>
      </Select>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">{t('notes')}</label>
        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Inahifadhi...' : t('save')}
        </Button>
      </div>
    </form>
  )
}