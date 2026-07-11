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
  }
};
