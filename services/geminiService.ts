import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audio";

export const translateText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  // Lazy Initialization: Access key and create client ONLY when function is called.
  // Using (import.meta as any) to avoid TypeScript errors with VITE_API_KEY
  const apiKey = (import.meta as any).env.VITE_API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Please ensure VITE_API_KEY is set in your Vercel environment variables.");
    throw new Error("API Key is missing in Vercel environment variables");
  }

  // Initialize inside the function
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate the following English text to Thai. Only provide the translated text without any explanations or additional formatting. Text: "${text}"`,
      config: {
        temperature: 0.3, // Lower temperature for more accurate translation
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  if (!text.trim()) throw new Error("No text to speak");

  // Lazy Initialization: Access key and create client ONLY when function is called.
  const apiKey = (import.meta as any).env.VITE_API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Please ensure VITE_API_KEY is set in your Vercel environment variables.");
    throw new Error("API Key is missing in Vercel environment variables");
  }

  // Initialize inside the function
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data received from model");
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    
    return audioBuffer;

  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};