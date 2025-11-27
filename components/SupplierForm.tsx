
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from './ui/Button';
import Input from './ui/Input';
import { ContactsIcon } from '../utils/icons';
import type { Supplier } from '../types';

export const SupplierForm: React.FC<{onClose: () => void, supplier?: Supplier | null}> = ({ onClose, supplier }) => {
  const { t, addSupplier, updateSupplier } = useAppContext();
  const [name, setName] = useState(supplier?.name || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [notes, setNotes] = useState(supplier?.notes || '');

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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supplier) {
      updateSupplier({ id: supplier.id, name, phone, address, notes });
    } else {
      addSupplier({ name, phone, address, notes });
    }
    onClose();
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
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">{t('notes')}</label>
        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  )
}
