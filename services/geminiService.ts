import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audio";

const API_KEY = process.env.API_KEY || '';

// Initialize the client once if possible, or per request if key might change (here assume static env)
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const translateText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

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
    throw new Error("Failed to translate text. Please check your connection and API key.");
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  if (!text.trim()) throw new Error("No text to speak");

  try {
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

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    
    // Clean up context state if needed, though we usually keep context alive or let GC handle it if not playing immediately
    // For this helper, we return the buffer so the UI can play it.
    // Note: The context used to decode must be compatible or we might need to recreate it. 
    // Ideally, we share a context, but for simplicity here we create one for decoding.
    
    return audioBuffer;

  } catch (error) {
    console.error("TTS error:", error);
    throw new Error("Failed to generate speech.");
  }
};
