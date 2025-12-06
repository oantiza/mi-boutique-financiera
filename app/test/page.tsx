// app/test/page.tsx
"use client"; // Esto es obligatorio en Next.js para botones

import { db } from "../../lib/firebase"; // Importamos tu conexión
import { collection, addDoc } from "firebase/firestore"; 
import { useState } from "react";

export default function TestPage() {
  const [mensaje, setMensaje] = useState("Esperando acción...");

  const guardarDatoPrueba = async () => {
    try {
      setMensaje("Guardando...");
      
      // AQUÍ OCURRE LA MAGIA:
      // Le decimos a la DB: "En la colección 'clientes', añade este documento"
      const docRef = await addDoc(collection(db, "clientes"), {
        nombre: "Cliente de Prueba",
        email: "test@ejemplo.com",
        fecha: new Date(),
        dinero: 5000
      });

      setMensaje(`¡Éxito! Dato guardado con ID: ${docRef.id}`);
      console.log("Documento escrito con ID: ", docRef.id);
      
    } catch (e) {
      console.error("Error añadiendo documento: ", e);
      setMensaje("Error: Mira la consola (F12) para ver qué pasó.");
    }
  };

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif" }}>
      <h1>Prueba de Conexión a Base de Datos</h1>
      <p>Estado: <strong>{mensaje}</strong></p>
      <button 
        onClick={guardarDatoPrueba}
        style={{
          padding: "10px 20px", 
          backgroundColor: "blue", 
          color: "white", 
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        ENVIAR DATO A LA NUBE
      </button>
    </div>
  );
}