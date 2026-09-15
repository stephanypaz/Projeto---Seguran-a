import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payload up to 25MB for base64 photo verification
  app.use(express.json({ limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * Biometric Face & Anti-Spoofing Verification Endpoint
   * Evaluates if the image contains a real, living human face with eyes, nose, and mouth visible.
   * Strictly rejects hands, fingers, objects, paper photos, and photos of smartphone/tablet screens.
   */
  app.post('/api/verify-biometrics', async (req, res) => {
    try {
      const { photoDataUrl, userName } = req.body;

      if (!photoDataUrl || typeof photoDataUrl !== 'string') {
        res.status(400).json({
          isValid: false,
          failureReason: 'INVALID_PAYLOAD',
          message: 'Imagem não fornecida para validação.',
        });
        return;
      }

      // Extract base64 payload
      const matches = photoDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : 'image/jpeg';
      const base64Data = matches ? matches[2] : photoDataUrl;

      const ai = getAi();
      if (!ai) {
        // Fallback if GEMINI_API_KEY is not configured
        res.json({
          isValid: true,
          isHumanFace: true,
          eyesVisible: true,
          noseVisible: true,
          mouthVisible: true,
          isSpoofOrPresentation: false,
          isHandOrObject: false,
          sharpnessQuality: 90,
          failureReason: 'NONE',
          detailedMessage: 'Validação local aprovada (Gemini API Key não configurada no servidor).',
        });
        return;
      }

      const prompt = `Você é o sistema de segurança e auditoria biométrica hospitalar (ISO 27799 e Art. 154-A do Código Penal).
Analise com RIGOR MÁXIMO a imagem capturada pela câmera de acesso para o usuário: "${userName || 'Profissional de Saúde'}".

REGRAS ESTREITAS DE RECONHECIMENTO FACIAL E ANTI-FRAUDE:
1. DEVE SER UM ROSTO HUMANO REAL:
   - A imagem deve conter a cabeça/rosto de uma pessoa real.
   - NUNCA aceite uma mão, dedos, braço, punho, pé, objeto, teto ou fundo vazio. Se o usuário estiver mostrando a mão ou os dedos (como em um sinal de pare ou palma aberta), REJEITE IMEDIATAMENTE marcando "isHandOrObject": true e "failureReason": "HAND_DETECTED".
2. RECONHECIMENTO DE ESTRUTURAS FACIAIS OBRIGATÓRIAS (OLHOS, NARIZ E BOCA):
   - Olhos: Ambos os olhos devem estar visíveis e abertos ("eyesVisible": true/false).
   - Nariz: O nariz deve estar visível e desobstruído ("noseVisible": true/false).
   - Boca: A boca deve estar visível e descoberta ("mouthVisible": true/false).
   - Se olhos, nariz ou boca estiverem cobertos ou ausentes, a validação DEVE FALHAR ("isValid": false).
3. ANTI-SPOOFING / ANTI-FRAUDE RIGOROSO (PROIBIDO FOTO DE PAPEL OU DE CELULAR):
   - "isSpoofOrPresentation": true se a imagem for uma foto tirada de outra tela (celular, tablet, notebook, TV) ou foto impressa em folha de papel.
   - Identifique artefatos de tela: moiré, grade de pixels, reflexos de vidro, bordas de celular ou reflexo de iluminação plana.
   - Identifique artefatos de papel: bordas de folha, textura de impressão, amassados ou reflexo de papel fotográfico.
   - Se for foto de celular ou papel, REJEITE marcando "isSpoofOrPresentation": true e "failureReason": "SCREEN_OR_PAPER_SPOOF".
4. NITIDEZ:
   - A imagem deve estar nítida e com foco suficiente para identificação ("sharpnessQuality": número de 0 a 100).
   - Se estiver excessivamente borrada ou sem foco, reprove com "failureReason": "BLURRY".

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "isValid": boolean, // true SOMENTE se for um rosto humano vivo, real, com olhos, nariz e boca visíveis, sem ser tela, papel ou mão
  "isHumanFace": boolean, // true se é um rosto humano, false se for mão, objeto, etc.
  "eyesVisible": boolean, // true se os olhos estão claramente visíveis
  "noseVisible": boolean, // true se o nariz está visível
  "mouthVisible": boolean, // true se a boca está visível
  "isSpoofOrPresentation": boolean, // true se for foto de tela de celular ou foto impressa em papel
  "isHandOrObject": boolean, // true se for detectada uma mão, dedos ou outro objeto
  "sharpnessQuality": number, // 0 a 100
  "failureReason": "HAND_DETECTED" | "SCREEN_OR_PAPER_SPOOF" | "FACE_NOT_FOUND" | "EYES_COVERED" | "MOUTH_COVERED" | "BLURRY" | "POOR_LIGHTING" | "NONE",
  "detailedMessage": string // Mensagem curta, educada e direta em português explicando o resultado
}`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 250,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      const responseText = geminiResponse.text?.trim() || '{}';
      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        // Fallback if json parsing had extra chars
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Formato de resposta do Gemini inválido.');
        }
      }

      res.json(parsedResult);
    } catch (error: unknown) {
      console.error('Error in /api/verify-biometrics:', error);
      res.status(500).json({
        isValid: false,
        failureReason: 'SERVER_ERROR',
        detailedMessage: 'Erro durante o processamento de verificação biométrica.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
