import { useState } from 'react';
import { db } from '../firebase'; // Hapa tunavuta ile database yetu
import { collection, addDoc } from 'firebase/firestore';

const TestConnection = () => {
    const [status, setStatus] = useState("Subiri...");

    const tumaDataYaJaribio = async () => {
        setStatus("Inajaribu kutuma...");
        try {
            // Hapa tunatengeneza collection mpya inaitwa 'majaribio' na kuweka data
            const docRef = await addDoc(collection(db, "majaribio"), {
                ujumbe: "Huu ni ujumbe wa test kutoka Antigravity!",
                muda: new Date(),
                kifaa: "Kompyuta ya Abdulrahim",
                imeruhusiwa: true
            });

            setStatus("IMEFANIKIWA! ✅ ID ya Data: " + docRef.id);
            alert("Hongera! Data imeingia Firebase. Connection ipo safi.");
        } catch (e) {
            console.error("Kuna Error: ", e);
            setStatus("IMESHINDIKANA ❌. Angalia Console.");
            alert("Kuna shida. Angalia kama Internet ipo au Rules za Firebase.");
        }
    };

    return (
        <div style={{ padding: '20px', margin: '20px', border: '2px dashed green', borderRadius: '10px', textAlign: 'center' }}>
            <h2>🔧 Mtambo wa Kujaribu Database</h2>
            <p style={{ fontWeight: 'bold' }}>Hali: {status}</p>

            <button
                onClick={tumaDataYaJaribio}
                style={{
                    backgroundColor: '#0F9D58',
                    color: 'white',
                    padding: '10px 20px',
                    fontSize: '16px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                BONYEZA HAPA KUTUMA DATA
            </button>
        </div>
    );
};

export default TestConnection;