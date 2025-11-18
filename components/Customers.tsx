
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { PlusIcon, TrashIcon, ContactsIcon } from '../utils/icons';
import type { Customer } from '../types';
import CustomerDetail from './CustomerDetail';

export const CustomerForm: React.FC<{onClose: () => void, customer?: Customer | null}> = ({ onClose, customer }) => {
  const { t, addCustomer, updateCustomer } = useAppContext();
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>(customer?.paymentType || 'Credit');
  const [notes, setNotes] = useState(customer?.notes || '');

  const handleContactSelect = async () => {
    // Check if the API is supported
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert(t('contactPickerNotSupported'));
      return;
    }

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      // @ts-ignore - navigator.contacts is experimental
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
      console.log("Contact selection failed or cancelled", ex);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      updateCustomer({ id: customer.id, name, phone, address, paymentType, notes });
    } else {
      addCustomer({ name, phone, address, paymentType, notes });
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
      <Select id="paymentType" label={t('paymentType')} value={paymentType} onChange={e => setPaymentType(e.target.value as 'Cash' | 'Credit')}>
        <option value="Credit">{t('credit')}</option>
        <option value="Cash">{t('cash')}</option>
      </Select>
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

const Customers: React.FC = () => {
  const { t, customers, getCustomerBalance, formatCurrency, deleteCustomer } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);


  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);
  
  const handleAdd = () => {
    setIsModalOpen(true);
  }

  const handleDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    }
  }

  if (selectedCustomerId) {
    return <CustomerDetail customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">{t('customers')}</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="mr-2" /> {t('addCustomer')}
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input id="search" label={t('search')} placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-sm font-semibold text-slate-600">{t('name')}</th>
                <th className="p-3 text-sm font-semibold text-slate-600">{t('phone')}</th>
                <th className="p-3 text-sm font-semibold text-slate-600">{t('balance')}</th>
                <th className="p-3 text-sm font-semibold text-slate-600">{t('paymentType')}</th>
                 <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => {
                const balance = getCustomerBalance(customer.id);
                return (
                  <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium whitespace-nowrap">{customer.name}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{customer.phone}</td>
                    <td className={`p-3 font-semibold whitespace-nowrap ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${customer.paymentType === 'Credit' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                        {t(customer.paymentType.toLowerCase())}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedCustomerId(customer.id)}>{t('viewDetails')}</Button>
                        <Button variant="danger" size="sm" onClick={() => setCustomerToDelete(customer)}><TrashIcon /></Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
        </div>
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('newCustomer')}>
        <CustomerForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} title={t('deleteConfirmation')}>
        <div>
          <p>{t('deleteCustomerWarning')}</p>
          <div className="flex justify-end space-x-3 pt-4 mt-4">
            <Button variant="secondary" onClick={() => setCustomerToDelete(null)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
