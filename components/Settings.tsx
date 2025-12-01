import React, { useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { AppDataBackup } from '../types';

// Firebase Imports
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';

interface SettingsProps {
    user: string | null;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const {
        t,
        updatePassword,
        resetData,
        exportData,
        importData,
        customers,
        products,
        sales,
        suppliers,
        purchases
    } = useAppContext();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    // State ya kuonyesha kama tunapakia data
    const [isUploading, setIsUploading] = useState(false);

    const importFileRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (newPassword !== confirmPassword) {
            setMessage(t('passwordMismatchError'));
            setIsError(true);
            return;
        }

        if (!user) return;

        const success = updatePassword(user, currentPassword, newPassword);

        if (success) {
            setMessage(t('passwordChangedSuccess'));
            setIsError(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setMessage(t('incorrectPasswordError'));
            setIsError(true);
        }
    };

    // --- FUNCTION YA KUHAMISHA DATA KWENDA FIREBASE ---
    const handleUploadToCloud = async () => {
        if (!confirm("Je, una uhakika unataka kupakia data zote za zamani (Local) kwenda Firebase? \n\nHii itachukua data ulizonazo kwenye simu na kuziweka mtandaoni.")) return;

        setIsUploading(true);
        try {
            // Helper function ya kutuma data kwa mafungu (Firebase inaruhusu max 500 kwa batch)
            const uploadBatch = async (collectionName: string, items: any[]) => {
                const BATCH_SIZE = 400; // Tunaweka 400 kuwa salama
                for (let i = 0; i < items.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = items.slice(i, i + BATCH_SIZE);

                    chunk.forEach((item) => {
                        const docRef = doc(db, collectionName, item.id);
                        batch.set(docRef, item, { merge: true });
                    });

                    await batch.commit();
                }
            };

            // Tuma kila kipengele
            console.log("Inapakia Wateja...");
            await uploadBatch('wateja', customers);

            console.log("Inapakia Bidhaa...");
            await uploadBatch('bidhaa', products);

            console.log("Inapakia Mauzo...");
            await uploadBatch('mauzo', sales);

            console.log("Inapakia Manunuzi...");
            await uploadBatch('manunuzi', purchases);

            console.log("Inapakia Wazabuni...");
            await uploadBatch('wazabuni', suppliers);

            alert("Hongera! Data zote zimehamishiwa Firebase kikamilifu. Sasa Dashboard yako itajaa.");
        } catch (error) {
            console.error("Shida kwenye kupakia:", error);
            alert("Kuna tatizo la mtandao au data. Jaribu tena.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleResetData = () => {
        resetData();
        setIsResetModalOpen(false);
        setConfirmText('');
    }

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        const file = files && files.length > 0 ? files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const target = e.target;
                const text = target ? target.result : null;
                if (typeof text !== 'string') throw new Error("File could not be read");

                const data: AppDataBackup = JSON.parse(text);

                if (!data.customers || !data.products || !data.sales || !data.suppliers || !data.purchases) {
                    alert(t('importError'));
                    return;
                }

                if (window.confirm(t('importConfirm'))) {
                    importData(data);
                    alert(t('importSuccess'));
                    window.location.reload();
                }

            } catch (error) {
                console.error("Failed to import data:", error);
                alert(t('importError'));
            } finally {
                if (importFileRef.current) {
                    importFileRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };


    return (
        <div>
            <h1 className="text-3xl font-bold text-dark mb-6">{t('settings')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title={t('changePassword')}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            id="currentPassword"
                            label={t('currentPassword')}
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                        <Input
                            id="newPassword"
                            label={t('newPassword')}
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <Input
                            id="confirmNewPassword"
                            label={t('confirmNewPassword')}
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        {message && (
                            <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
                                {message}
                            </p>
                        )}
                        <div className="pt-2">
                            <Button type="submit">{t('updatePassword')}</Button>
                        </div>
                    </form>
                </Card>

                <div className="space-y-6">
                    {/* Hapa ndipo tulipoongeza Cloud Sync */}
                    <Card title="Cloud Synchronization (Firebase)" className="border-2 border-blue-100 bg-blue-50">
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg text-blue-900">Hamisha Data Kwenda Mtandaoni</h3>
                                <p className="text-blue-700 text-sm mb-3">
                                    Una data za zamani kwenye simu? Bonyeza hapa kuzituma zote kwenye Database ya Firebase ili zionekane kwenye Dashboard mpya.
                                </p>
                                <Button
                                    onClick={handleUploadToCloud}
                                    disabled={isUploading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isUploading ? 'Inapakia Data... (Tafadhali subiri)' : 'Upload Local Data to Cloud ☁️'}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card title={t('dataManagement')}>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg">{t('exportData')}</h3>
                                <p className="text-slate-500 text-sm">{t('exportDescription')}</p>
                                <Button onClick={exportData} className="mt-2" variant="secondary">{t('exportData')}</Button>
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-lg">{t('importData')}</h3>
                                <p className="text-slate-500 text-sm">{t('importDescription')}</p>
                                <p className="text-red-500 font-semibold text-sm mt-1">{t('importWarning')}</p>
                                <input
                                    type="file"
                                    id="import-file"
                                    ref={importFileRef}
                                    className="hidden"
                                    accept=".json"
                                    onChange={handleImportData}
                                />
                                <Button as="label" htmlFor="import-file" className="mt-2 cursor-pointer" variant="secondary">
                                    {t('importData')}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card title={t('dangerZone')} className="border-2 border-red-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-lg">{t('resetData')}</h3>
                                <p className="text-slate-500 text-sm max-w-md">{t('resetDataWarning')}</p>
                            </div>
                            <Button variant="danger" onClick={() => setIsResetModalOpen(true)} className="mt-4 md:mt-0 flex-shrink-0">
                                {t('resetData')}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title={t('resetDataWarningTitle')}>
                <div className="space-y-4">
                    <p className="text-slate-600">{t('resetDataWarning')}</p>
                    <p className="text-sm">{t('resetDataConfirmation')}</p>
                    <Input
                        id="confirmReset"
                        label={t('resetDataConfirmationValue')}
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        placeholder={t('resetDataConfirmationValue')}
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>{t('cancel')}</Button>
                        <Button
                            variant="danger"
                            onClick={handleResetData}
                            disabled={confirmText !== t('resetDataConfirmationValue')}
                        >
                            {t('confirm')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;