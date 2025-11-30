import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audio";

// Helper function to lazily initialize the client
const getClient = () => {
  // Use process.env.API_KEY as required by guidelines and to avoid import.meta errors
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    throw new Error("Failed to translate text. Please check your connection.");
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
    throw new Error("Failed to generate speech.");
  }
};