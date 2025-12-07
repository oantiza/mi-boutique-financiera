import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import PDFDocument from 'pdfkit';

// --- 1. CONEXIÓN A BASE DE DATOS ROBUSTA ---
function getDB() {
  if (getApps().length > 0) return getFirestore(getApp());
  
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountString) {
      throw new Error("Faltan credenciales de Firebase en el entorno.");
  }

  // Parseamos el JSON unificado y limpio
  const serviceAccount = JSON.parse(serviceAccountString);
  initializeApp({ credential: cert(serviceAccount) });
  
  return getFirestore();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'monthly'; // 'monthly' o 'weekly'
    
    // Mapeo inverso: de URL a etiqueta de Base de Datos
    const dbTag = type === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const reportTitle = type === 'monthly' ? 'ESTRATEGIA MENSUAL' : 'TÁCTICO SEMANAL';

    // --- 2. OBTENER DATOS DE FIRESTORE ---
    const db = getDB();
    const snapshot = await db.collection('analysis_results')
      .where('type', '==', dbTag)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "No se encontró ningún informe para generar." }, { status: 404 });
    }

    const data = snapshot.docs[0].data();

    // --- 3. GENERAR EL PDF (Streaming) ---
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: any[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- DISEÑO DEL DOCUMENTO ---

        // 1. Cabecera
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#0F172A').text('Global Investment Outlook', { align: 'center' });
        doc.moveDown(0.5);
        
        // Subtítulo (Corrección solicitada aplicada al PDF también)
        doc.fontSize(14).font('Helvetica').fillColor('#EAB308').text(reportTitle, { align: 'center', characterSpacing: 2 });
        doc.moveDown(0.5);
        
        doc.fontSize(10).fillColor('grey').text(`Fecha de Corte: ${data.date || new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Línea divisoria
        doc.strokeColor('#E2E8F0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(2);

        // 2. Resumen Ejecutivo
        doc.fillColor('black');
        doc.fontSize(16).font('Helvetica-Bold').text('Resumen Ejecutivo');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').text(data.executive_summary || "Sin resumen disponible.", {
            align: 'justify',
            lineGap: 4
        });
        doc.moveDown(2);

        // 3. Sentimiento
        doc.fontSize(16).font('Helvetica-Bold').text('Sentimiento de Mercado');
        doc.fontSize(14).fillColor('#EAB308').text(data.marketSentiment || "Neutral", { indent: 0 });
        doc.fillColor('black'); // Reset color
        doc.moveDown(2);

        // 4. Matriz de Asignación (Solo Monthly)
        if (type === 'monthly' && data.model_portfolio && Array.isArray(data.model_portfolio)) {
            // Check de espacio para salto de página
            if (doc.y > 500) doc.addPage();

            doc.fontSize(16).font('Helvetica-Bold').text('Matriz de Asignación de Activos');
            doc.moveDown();

            const startX = 50;
            let currentY = doc.y;
            const rowHeight = 30;

            // Cabecera de Tabla
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text("Clase", startX, currentY);
            doc.text("Región", startX + 100, currentY);
            doc.text("Peso", startX + 200, currentY);
            doc.text("Visión", startX + 280, currentY);
            
            // Línea debajo cabecera
            currentY += 15;
            doc.moveTo(startX, currentY).lineTo(545, currentY).stroke();
            currentY += 10;

            // Filas
            doc.font('Helvetica').fontSize(10);
            data.model_portfolio.forEach((item: any) => {
                if (currentY > 750) { doc.addPage(); currentY = 50; }

                doc.text(item.asset_class || "-", startX, currentY, { width: 90 });
                doc.text(item.region || "-", startX + 100, currentY, { width: 90 });
                doc.font('Helvetica-Bold').text(`${item.weight}%`, startX + 200, currentY);
                doc.font('Helvetica').text(item.view || "-", startX + 280, currentY);
                
                currentY += rowHeight;
            });
            doc.moveDown(2);
        }

        // 5. Drivers
        if (data.keyDrivers && Array.isArray(data.keyDrivers)) {
            if (doc.y > 600) doc.addPage();
            
            doc.fontSize(16).font('Helvetica-Bold').text('Drivers Principales');
            doc.moveDown();
            
            data.keyDrivers.forEach((driver: any) => {
                 doc.fontSize(12).font('Helvetica-Bold').text(`• ${driver.title || "Driver"}`);
                 doc.fontSize(10).font('Helvetica').text(driver.impact || "-", { indent: 15, align: 'justify' });
                 doc.moveDown(1);
            });
        }

        // Footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('grey').text(
                `Generado por AI (Gemini 2.5) - ${new Date().toLocaleDateString()}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
        }

        doc.end();
    });

    // --- 4. RESPUESTA HTTP ---
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Informe_${type}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Error generando PDF:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}