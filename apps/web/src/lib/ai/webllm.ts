import { CreateMLCEngine, InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";

let engine: MLCEngineInterface | null = null;
let isInitializing = false;
let initProgress = 0;
let initText = "";

type ProgressCallback = (progress: number, text: string) => void;
const listeners: ProgressCallback[] = [];

function notifyListeners() {
  listeners.forEach(l => l(initProgress, initText));
}

export function subscribeToWebLLM(callback: ProgressCallback) {
  listeners.push(callback);
  callback(initProgress, initText);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
}

export async function getWebLLMEngine(): Promise<MLCEngineInterface> {
  if (engine) return engine;
  
  if (isInitializing) {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (engine) {
          clearInterval(check);
          resolve(engine);
        } else if (!isInitializing) {
          clearInterval(check);
          reject(new Error("Engine failed to initialize"));
        }
      }, 500);
    });
  }

  isInitializing = true;
  
  try {
    const selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    
    engine = await CreateMLCEngine(
      selectedModel,
      {
        initProgressCallback: (report: InitProgressReport) => {
          initProgress = report.progress;
          initText = report.text;
          notifyListeners();
        }
      }
    );
    
    isInitializing = false;
    return engine;
  } catch (error) {
    isInitializing = false;
    console.error("Failed to load WebLLM:", error);
    throw error;
  }
}
