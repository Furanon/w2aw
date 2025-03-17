import * as tf from '@tensorflow/tfjs';
import { User, Activity, UserInteraction } from './mockData';

// Interface definitions
interface ModelConfig {
  numUsers: number;
  numActivities: number;
  embeddingDim: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
}

interface TrainingData {
  userIndices: number[];
  activityIndices: number[];
  ratings: number[];
}

interface RecommendationModel {
  userEmbedding: tf.LayersModel;
  activityEmbedding: tf.LayersModel;
  model: tf.LayersModel;
}

interface Prediction {
  activityId: string;
  score: number;
}

// Default configuration
const DEFAULT_CONFIG: ModelConfig = {
  numUsers: 100,
  numActivities: 200,
  embeddingDim: 50,
  learningRate: 0.001,
  epochs: 10,
  batchSize: 64
};

/**
 * Preprocess user interaction data for model training
 * 
 * @param interactions Array of user interactions
 * @param users Array of users
 * @param activities Array of activities
 * @returns Processed training data
 */
export function preprocessData(
  interactions: UserInteraction[],
  users: User[],
  activities: Activity[]
): TrainingData {
  // Create user and activity mapping
  const userMap = new Map<string, number>();
  const activityMap = new Map<string, number>();
  
  users.forEach((user, index) => {
    userMap.set(user.id, index);
  });
  
  activities.forEach((activity, index) => {
    activityMap.set(activity.id, index);
  });
  
  // Prepare arrays for tensor creation
  const userIndices: number[] = [];
  const activityIndices: number[] = [];
  const ratings: number[] = [];
  
  // Process interactions into rating data
  interactions.forEach(interaction => {
    const userIndex = userMap.get(interaction.userId);
    const activityIndex = activityMap.get(interaction.activityId);
    
    if (userIndex !== undefined && activityIndex !== undefined) {
      userIndices.push(userIndex);
      activityIndices.push(activityIndex);
      
      // Convert interaction types to numerical ratings
      let rating = 0;
      switch(interaction.interactionType) {
        case 'view':
          rating = 1;
          break;
        case 'like':
          rating = 3;
          break;
        case 'book':
          rating = 5;
          break;
      }
      
      ratings.push(rating);
    }
  });
  
  return {
    userIndices,
    activityIndices,
    ratings
  };
}

/**
 * Creates a collaborative filtering model
 * 
 * @param config Model configuration
 * @returns Recommendation model
 */
export function createModel(config: ModelConfig = DEFAULT_CONFIG): RecommendationModel {
  // User embedding model
  const userInput = tf.input({ shape: [1], name: 'userInput', dtype: 'int32' });
  const userEmbedding = tf.layers.embedding({
    inputDim: config.numUsers,
    outputDim: config.embeddingDim,
    name: 'userEmbedding'
  }).apply(userInput);
  const userVector = tf.layers.flatten().apply(userEmbedding);
  
  // Activity embedding model
  const activityInput = tf.input({ shape: [1], name: 'activityInput', dtype: 'int32' });
  const activityEmbedding = tf.layers.embedding({
    inputDim: config.numActivities,
    outputDim: config.embeddingDim,
    name: 'activityEmbedding'
  }).apply(activityInput);
  const activityVector = tf.layers.flatten().apply(activityEmbedding);
  
  // Dot product for recommendation score
  const dot = tf.layers.dot({ axes: 1 }).apply([userVector, activityVector]);
  
  // Compile user embedding model
  const userEmbeddingModel = tf.model({
    inputs: userInput,
    outputs: userVector,
    name: 'userEmbeddingModel'
  });
  
  // Compile activity embedding model
  const activityEmbeddingModel = tf.model({
    inputs: activityInput,
    outputs: activityVector,
    name: 'activityEmbeddingModel'
  });
  
  // Compile full model
  const fullModel = tf.model({
    inputs: [userInput, activityInput],
    outputs: dot,
    name: 'recommendationModel'
  });
  
  fullModel.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'meanSquaredError'
  });
  
  return {
    userEmbedding: userEmbeddingModel,
    activityEmbedding: activityEmbeddingModel,
    model: fullModel
  };
}

/**
 * Trains the recommendation model
 * 
 * @param model The recommendation model
 * @param data Training data
 * @param config Model configuration
 * @returns Training history
 */
export async function trainModel(
  model: RecommendationModel,
  data: TrainingData,
  config: ModelConfig = DEFAULT_CONFIG
): Promise<tf.History> {
  // Convert data to tensors
  const userIndicesTensor = tf.tensor2d(data.userIndices, [data.userIndices.length, 1], 'int32');
  const activityIndicesTensor = tf.tensor2d(data.activityIndices, [data.activityIndices.length, 1], 'int32');
  const ratingsTensor = tf.tensor1d(data.ratings, 'float32');
  
  // Train the model
  const history = await model.model.fit(
    [userIndicesTensor, activityIndicesTensor],
    ratingsTensor,
    {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}/${config.epochs} - loss: ${logs?.loss.toFixed(4)} - val_loss: ${logs?.val_loss.toFixed(4)}`);
        }
      }
    }
  );
  
  // Clean up tensors to prevent memory leaks
  userIndicesTensor.dispose();
  activityIndicesTensor.dispose();
  ratingsTensor.dispose();
  
  return history;
}

/**
 * Gets recommendations for a specific user
 * 
 * @param model The trained recommendation model
 * @param userId User ID 
 * @param userMap Map of user IDs to indices
 * @param activities List of all activities
 * @param topK Number of recommendations to return
 * @returns Array of recommended activities with scores
 */
export async function getRecommendations(
  model: RecommendationModel,
  userId: string,
  users: User[],
  activities: Activity[],
  topK: number = 10
): Promise<Prediction[]> {
  // Get user index
  const userIndex = users.findIndex(user => user.id === userId);
  if (userIndex === -1) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  // Generate predictions for all activities
  const predictions: Prediction[] = [];
  
  // Create user tensor (we'll reuse this)
  const userTensor = tf.tensor2d([userIndex], [1, 1], 'int32');
  
  // Predict ratings for each activity
  for (let i = 0; i < activities.length; i++) {
    const activityTensor = tf.tensor2d([i], [1, 1], 'int32');
    
    const prediction = model.model.predict([userTensor, activityTensor]) as tf.Tensor;
    const score = (await prediction.data())[0];
    
    predictions.push({
      activityId: activities[i].id,
      score
    });
    
    // Clean up to prevent memory leaks
    activityTensor.dispose();
    prediction.dispose();
  }
  
  // Clean up user tensor
  userTensor.dispose();
  
  // Sort by score and return top K
  return predictions
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Save the model for later use
 * 
 * @param model The recommendation model to save
 * @param path Path to save the model to
 */
export async function saveModel(model: RecommendationModel, path: string): Promise<void> {
  await model.model.save(`file://${path}`);
}

/**
 * Load a previously saved model
 * 
 * @param path Path to load the model from
 * @param config Model configuration
 * @returns Loaded recommendation model
 */
export async function loadModel(path: string, config: ModelConfig = DEFAULT_CONFIG): Promise<RecommendationModel> {
  const model = await tf.loadLayersModel(`file://${path}/model.json`);
  
  // Recreate the full model structure for compatibility
  const loadedModel = createModel(config);
  loadedModel.model = model;
  
  return loadedModel;
}

/**
 * Visualize the embedding space (can be used for UI visualization)
 * 
 * @param model The recommendation model
 * @param users Array of users
 * @param activities Array of activities
 * @returns Embeddings for visualization
 */
export async function getEmbeddingsForVisualization(
  model: RecommendationModel,
  users: User[],
  activities: Activity[]
): Promise<{userEmbeddings: number[][], activityEmbeddings: number[][]}> {
  // Get all user embeddings
  const userIndices = Array.from({length: users.length}, (_, i) => i);
  const userTensor = tf.tensor2d(userIndices, [users.length, 1], 'int32');
  const userEmbeddings = model.userEmbedding.predict(userTensor) as tf.Tensor;
  
  // Get all activity embeddings
  const activityIndices = Array.from({length: activities.length}, (_, i) => i);
  const activityTensor = tf.tensor2d(activityIndices, [activities.length, 1], 'int32');
  const activityEmbeddings = model.activityEmbedding.predict(activityTensor) as tf.Tensor;
  
  // Convert to arrays for visualization
  const userEmbeddingsArray = await userEmbeddings.array() as number[][];
  const activityEmbeddingsArray = await activityEmbeddings.array() as number[][];
  
  // Clean up tensors
  userTensor.dispose();
  activityTensor.dispose();
  userEmbeddings.dispose();
  activityEmbeddings.dispose();
  
  return {
    userEmbeddings: userEmbeddingsArray,
    activityEmbeddings: activityEmbeddingsArray
  };
}

/**
 * Complete recommendation engine workflow: from data to predictions
 * 
 * @param users Array of users
 * @param activities Array of activities
 * @param interactions Array of user interactions
 * @param userId User ID to get recommendations for
 * @returns Array of recommended activities
 */
export async function runRecommendationWorkflow(
  users: User[],
  activities: Activity[],
  interactions: UserInteraction[],
  userId: string
): Promise<Prediction[]> {
  // 1. Preprocess data
  const trainingData = preprocessData(interactions, users, activities);
  
  // 2. Create model
  const config: ModelConfig = {
    numUsers: users.length,
    numActivities: activities.length,
    embeddingDim: 50,
    learningRate: 0.001,
    epochs: 10,
    batchSize: 64
  };
  const model = createModel(config);
  
  // 3. Train model
  await trainModel(model, trainingData, config);
  
  // 4. Get recommendations
  return getRecommendations(model, userId, users, activities);
}

