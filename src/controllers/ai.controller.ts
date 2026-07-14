<<<<<<< HEAD
import { Request, Response } from 'express';
import { generateAIResponse } from '../services/ai.service';

export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      res.status(400).json({ success: false, message: 'Prompt is required' });
      return;
    }

    const aiResponse = await generateAIResponse(prompt, history);

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse,
      },
    });
  } catch (error: any) {
    console.error('Error in chatWithAI:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
=======
import { type RequestHandler } from 'express';

interface ChatHistoryItem {
  role: string;
  text: string;
}

export const aiChat: RequestHandler = async (req, res) => {
  const { prompt, history } = req.body as { prompt: string; history?: ChatHistoryItem[] };

  console.log(`[AI CHAT STREAM] Request received - Prompt: "${prompt}", History length: ${history?.length || 0}`);

  if (!prompt || typeof prompt !== 'string') {
    console.warn('[AI CHAT STREAM] Rejecting: prompt is empty or not a string');
    res.status(400).json({ error: 'Prompt is required and must be a string' });
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('[AI CHAT STREAM] Rejecting: GEMINI_API_KEY is not defined');
    res.status(500).json({ error: 'Gemini API key is not configured' });
    return;
  }

  // Cấu hình headers cho Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Tắt buffering cho Nginx/reverse proxy nếu có

  // Gửi headers đi lập tức để client nhận được 200 OK ngay tức thì và mở stream kết nối
  res.flushHeaders();

  try {
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        const role = turn.role === 'ai' ? 'model' : 'user';
        if (turn.text && (role === 'user' || role === 'model')) {
          contents.push({
            role: role,
            parts: [{ text: turn.text }]
          });
        }
      }
    }

    // Đẩy prompt hiện tại của user vào contents
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    console.log('[AI CHAT STREAM] Fetching response from Gemini Stream API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?key=${geminiApiKey}&alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [
              {
                text: "Bạn là ReMind AI - trợ lý hỗ trợ sức khỏe tinh thần thân thiện, đồng cảm và biết lắng nghe. Hãy trả lời ngắn gọn, chân thành, nhẹ nhàng bằng tiếng Việt. Nếu người dùng có dấu hiệu khủng hoảng tâm lý nghiêm trọng, tự hại hoặc tự tử, hãy khuyên họ gọi ngay hotline khẩn cấp 1800 599 920 hoặc liên hệ với chuyên gia.",
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI CHAT STREAM] Gemini Stream API returned error:', errorText);
      res.write(`data: ${JSON.stringify({ error: 'Failed to fetch response from Gemini API' })}\n\n`);
      res.end();
      return;
    }

    if (!response.body) {
      console.error('[AI CHAT STREAM] No response body received from Gemini API');
      res.write(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    // Đọc stream bất đồng bộ và ghi tiếp về client
    const stream = response.body as any;
    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Định dạng SSE của Gemini là "data: { ...JSON... }"
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              // Gửi chunk văn bản về cho Client
              res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
            }
          } catch (err) {
            // Bỏ qua
          }
        }
      }
    }

    // Gửi tín hiệu hoàn thành
    res.write('data: [DONE]\n\n');
    res.end();
    console.log('[AI CHAT STREAM] Stream completed successfully');
  } catch (error) {
    console.error('[AI CHAT STREAM] Exception occurred:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
    res.end();
>>>>>>> e0c2c457c166cc7aecb7e645d009dce52f469f70
  }
};
