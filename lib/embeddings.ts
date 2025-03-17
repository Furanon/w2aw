import { InferenceSession } from 'onnxjs';
import fs from 'fs';
import path from 'path';

const isNodeEnvironment = () => {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
};

async function initializeONNX() {
  try {
    if (isNodeEnvironment()) {
      console.log('Initializing in Node.js environment for ONNX');
      const session = new InferenceSession();
      const modelPath = path.resolve('./model.onnx');
      const modelData = fs.readFileSync(modelPath);
      session.loadModel(modelData);
      return session;
    } else {
      console.log('Initializing in the browser environment for ONNX');
      const session = new InferenceSession();
      // Assume model URL or Blob provided for web environment
      const modelUrl = 'model.onnx'; // Update with correct URL or handling logic
      await session.loadModel(modelUrl);
      return session;
    }
  } catch (error) {
    console.error('Failed to initialize ONNX:', error);
    throw new Error('Failed to initialize ONNX session');
  }
}
      
      // Set up the WebAssembly backend
      await tf.setBackend('wasm');
      await tf.ready();
      
      console.log('Using TensorFlow.js WebAssembly backend');
      return tf;
    } catch (error) {
      console.error('Failed to load TensorFlow.js WebAssembly backend:', error);
      throw new Error('Failed to initialize TensorFlow.js backend');
    }
  }
}

// Global TensorFlow.js instance cache
let onnxSession: InferenceSession | null = null;
let modelLoaded = false;

export async function initializeModel(): Promise<InferenceSession> {
  if (onnxSession) {
    return onnxSession;
  }

  try {
    console.log('Initializing ONNX model...');
    onnxSession = await initializeONNX();
    modelLoaded = true;
    console.log('ONNX model loaded successfully');
    return onnxSession;
  } catch (error) {
    console.error('Error during ONNX model initialization:', error);
    throw new Error('Failed to initialize ONNX model');
  }
}

/**
 * Generates an embedding vector for the provided text
 * @param text The text to generate an embedding for
 * @returns Promise resolving to a Float32Array containing the embedding
 */
export async function generateEmbedding(text: string): Promise<Float32Array> {
  try {
    const session = await initializeModel();
    
    const tensorInput = new onnx.Tensor(new Float32Array(text.split('').map(char => char.charCodeAt(0) / 256)), 'float32', [1, text.length, 1]); // Simplified conversion
    const input = { input: tensorInput };
    
    const outputData = await session.run(input);
    const outputTensor = outputData.values().next().value;
    const embeddingArray = outputTensor.data as Float32Array;
    
    return embeddingArray;
  } catch (error) {
    console.error('Error generating ONNX embedding:', error);
    throw new Error('Failed to generate ONNX text embedding');
  }
}

/**
 * Generates an embedding specifically for a listing by combining title and description
 * @param title The listing title
 * @param description The listing description
 * @returns Promise resolving to a Float32Array containing the embedding
 */
export async function generateListingEmbedding(
  title: string, 
  description: string
): Promise<Float32Array> {
  // Combine title and description with title having more weight
  const combinedText = `${title} ${title} ${description}`;
  return generateEmbedding(combinedText);
}

/**
 * Formats an embedding array for use with pgvector in PostgreSQL
 * @param embedding The embedding Float32Array
 * @returns A string formatted for PostgreSQL vector type
 */
export function formatEmbeddingForPgvector(embedding: Float32Array): string {
  return `[${Array.from(embedding).join(',')}]`;
}

