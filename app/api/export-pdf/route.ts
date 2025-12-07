import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import PDFDocument from 'pdfkit';

function getDB() {
  if (getApps().length > 0) return getFirestore(getApp());
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'monthly';
    // Mapeo crítico para encontrar los datos
    const dbTag = type === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';

    const db = getDB();
    const snapshot = await db.collection('analysis_results')
      .where('type', '==', dbTag)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }

    const data = snapshot.docs[0].data();
    const doc = new PDFDocument({ margin: 50 });
    
    // Convertir stream a buffer
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const buffers: any[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        doc.fontSize(20).text('Global Investment Outlook', { align: 'center' });
        doc.fontSize(12).text(`Reporte: ${type.toUpperCase()}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text('Resumen Ejecutivo');
        doc.fontSize(10).text(data.executive_summary || "Sin datos");
        
        // ... (Aquí podrías añadir más detalles de la tabla si quisieras)

        doc.end();
    });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Informe_${type}.pdf"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}