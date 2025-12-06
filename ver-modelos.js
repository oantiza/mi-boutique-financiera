// Archivo: ver-modelos.js
// Ejecutar con: node ver-modelos.js
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Nota: Si la librería no tiene listModels directo, intentaremos un truco
  // pero lo ideal es probar el nombre nuevo primero.
  console.log("Probando conexión con gemini-2.5-flash...");
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hola, ¿estás vivo?");
    console.log("✅ ¡ÉXITO! El modelo 'gemini-2.5-flash' funciona.");
    console.log("Respuesta:", result.response.text());
  } catch (error) {
    console.error("❌ Falló gemini-2.5-flash:", error.message);
    
    console.log("\n--- Intento con gemini-2.0-flash ---");
    try {
        const model2 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        await model2.generateContent("Test");
        console.log("✅ ¡ÉXITO! El modelo 'gemini-2.0-flash' funciona.");
    } catch(e) { console.error("❌ También falló 2.0"); }
  }
}

checkModels();