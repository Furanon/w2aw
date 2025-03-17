import { RecommendationService } from './recommendationService';
import { generateMockActivities, generateMockUserInteractions } from './mockData';

/**
 * Singleton instance of the RecommendationService
 */
class RecommendationServiceSingleton {
  private static instance: RecommendationService | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Gets the singleton instance of the RecommendationService
   * @returns The RecommendationService instance
   */
  public getInstance(): RecommendationService {
    if (!RecommendationServiceSingleton.instance) {
      console.log('Creating new RecommendationService instance');
      RecommendationServiceSingleton.instance = new RecommendationService();
    }
    return RecommendationServiceSingleton.instance;
  }

  /**
   * Initializes the recommendation service with mock data
   * @param forceReinitialization Force reinitialization even if already initialized
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(forceReinitialization: boolean = false): Promise<void> {
    // If already initializing, return the existing promise
    if (this.initializationPromise && !forceReinitialization) {
      return this.initializationPromise;
    }

    // If already initialized and not forcing reinitialization, return resolved promise
    if (this.initialized && !forceReinitialization) {
      return Promise.resolve();
    }

    // Create a new initialization promise
    this.initializationPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log('Initializing recommendation service...');
        const service = this.getInstance();
        
        // Generate mock data
        const mockActivities = generateMockActivities(100);
        const mockInteractions = generateMockUserInteractions(20, mockActivities, 200);
        
        console.log(`Generated ${mockActivities.length} mock activities and ${mockInteractions.length} user interactions`);
        
        // Initialize the service with mock data
        await service.initializeWithData(mockActivities, mockInteractions);
        
        console.log('Recommendation service initialized successfully');
        this.initialized = true;
        resolve();
      } catch (error) {
        console.error('Failed to initialize recommendation service:', error);
        this.initializationPromise = null;
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  /**
   * Checks if the recommendation service is initialized
   * @returns True if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Resets the singleton instance
   * This is primarily useful for testing
   */
  public reset(): void {
    RecommendationServiceSingleton.instance = null;
    this.initialized = false;
    this.initializationPromise = null;
    console.log('RecommendationService singleton has been reset');
  }
}

// Create and export the singleton instance
const recommendationServiceSingleton = new RecommendationServiceSingleton();

export default recommendationServiceSingleton;

/**
 * Convenience function to get the recommendation service instance
 * Will throw an error if accessed before initialization
 */
export function getRecommendationService(): RecommendationService {
  if (!recommendationServiceSingleton.isInitialized()) {
    throw new Error(
      'RecommendationService accessed before initialization. Call recommendationServiceSingleton.initialize() first.'
    );
  }
  return recommendationServiceSingleton.getInstance();
}

/**
 * Initialize the recommendation service
 * @param force Force reinitialization even if already initialized
 */
export async function initializeRecommendations(force: boolean = false): Promise<void> {
  try {
    await recommendationServiceSingleton.initialize(force);
  } catch (error) {
    console.error('Error during recommendation initialization:', error);
    throw new Error(`Failed to initialize recommendation service: ${error instanceof Error ? error.message : String(error)}`);
  }
}

