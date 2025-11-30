import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audio";

// Helper function to lazily initialize the client
const getClient = () => {
  // Access VITE_API_KEY using import.meta.env for Vite/Vercel support.
  // Cast to 'any' to avoid TypeScript errors if types aren't fully configured.
  const apiKey = (import.meta as any).env.VITE_API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Please ensure VITE_API_KEY is set in your Vercel environment variables.");
    throw new Error("API Key is missing. Please check your configuration.");
  }
  
  return new GoogleGenAI({ apiKey });
};

export const translateText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  try {
    // Initialize inside the function (Lazy Initialization)
    const ai = getClient();
    
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
    throw error; // Rethrow so the UI can handle the error state
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  if (!text.trim()) throw new Error("No text to speak");

  try {
    // Initialize inside the function (Lazy Initialization)
    const ai = getClient();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is usually a good default
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
    throw error; // Rethrow so the UI can handle the error state
  }
};