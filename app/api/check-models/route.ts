import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "No hay API KEY configurada" }, { status: 500 });
  }

  try {
    // Consultamos directamente al endpoint de listado de Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Error de Google: ${response.status}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();

    // Filtramos solo los que sirven para "generateContent" (chat/texto)
    const availableModels = data.models
      .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m: any) => ({
        name: m.name, // ESTO ES LO QUE NECESITAMOS (ej: models/gemini-1.5-flash)
        displayName: m.displayName,
        version: m.version
      }));

    return NextResponse.json({ 
      count: availableModels.length,
      models: availableModels 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}