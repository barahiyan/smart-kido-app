import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, EditIcon, TrashIcon, ContactsIcon } from '../utils/icons';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { Supplier } from '../types';

// Firebase
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

// --- SEHEMU YA 1: FOMU YA WAZABUNI ---
const SupplierForm: React.FC<{ onClose: () => void, supplier?: Supplier | null }> = ({ onClose, supplier }) => {
  const { t } = useAppContext();
  const [name, setName] = useState(supplier?.name || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [notes, setNotes] = useState(supplier?.notes || '');
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
        if (contact.name && contact.name.length > 0) setName(contact.name[0]);
        if (contact.tel && contact.tel.length > 0) setPhone(contact.tel[0]);
      }
    } catch (ex) {
      console.log("Contact selection failed", ex);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const supplierData = { name, phone, address, notes, updatedAt: serverTimestamp() };

    try {
      if (supplier) {
        await updateDoc(doc(db, "wazabuni", supplier.id), supplierData);
      } else {
        await addDoc(collection(db, "wazabuni"), { ...supplierData, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Imeshindikana kuhifadhi mzabuni.");
    } finally {
      setIsSubmitting(false);
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
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">{t('notes')}</label>
        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Inahifadhi...' : t('save')}</Button>
      </div>
    </form>
  )
}

// --- SEHEMU YA 2: ORODHA YA WAZABUNI ---
const Suppliers: React.FC = () => {
  const { t, getSupplierBalance, formatCurrency } = useAppContext(); // getSupplierBalance bado inatumia context logic kwa sasa, lakini tutai-update ukipenda

  // State za Firebase
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Suppliers
  useEffect(() => {
    const q = query(collection(db, "wazabuni"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching suppliers:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  const handleAdd = () => {
    setSupplierToEdit(null);
    setIsModalOpen(true);
  }

  const handleEdit = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setIsModalOpen(true);
  }

  const handleDelete = async () => {
    if (supplierToDelete) {
      try {
        await deleteDoc(doc(db, "wazabuni", supplierToDelete.id));
      } catch (error) {
        console.error("Error deleting supplier:", error);
        alert("Imeshindikana kufuta mzabuni.");
      }
      setSupplierToDelete(null);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">{t('suppliers')}</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="mr-2" /> {t('addSupplier')}
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input id="search-suppliers" label={t('search')} placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          {loading ? <p className="text-center py-4">Inapakua Wazabuni...</p> : (
            <table className="min-w-full w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-sm font-semibold text-slate-600">{t('name')}</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">{t('phone')}</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">{t('address')}</th>
                  {/* <th className="p-3 text-sm font-semibold text-slate-600">{t('balance')}</th> */}
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => {
                  // const balance = getSupplierBalance(supplier.id); // Hii inahitaji logic ya purchases
                  return (
                    <tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium whitespace-nowrap">{supplier.name}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{supplier.phone}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{supplier.address}</td>
                      {/* <td className={`p-3 font-semibold whitespace-nowrap ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {formatCurrency(balance)}
                                        </td> */}
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(supplier)}><EditIcon /></Button>
                        <Button size="sm" variant="danger" onClick={() => setSupplierToDelete(supplier)}><TrashIcon /></Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!loading && filteredSuppliers.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={supplierToEdit ? t('editSupplier') : t('newSupplier')}>
        <SupplierForm onClose={() => setIsModalOpen(false)} supplier={supplierToEdit} />
      </Modal>

      <Modal isOpen={!!supplierToDelete} onClose={() => setSupplierToDelete(null)} title={t('deleteConfirmation')}>
        <div>
          <p>{t('deleteSupplierWarning')}</p>
          <div className="flex justify-end space-x-3 pt-4 mt-4">
            <Button variant="secondary" onClick={() => setSupplierToDelete(null)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Suppliers;