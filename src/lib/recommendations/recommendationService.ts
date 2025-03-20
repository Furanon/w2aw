import * as tf from '@tensorflow/tfjs';
import { Activity, User, UserInteraction } from './mockData';
import { RecommendationEngine } from './recommendationEngine';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Interface for recommendation results
 */
interface RecommendationResult {
  activityId: string;
  score: number;
  category: string[];
  location: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Interface for visualization node
 */
export interface VisualizationNode {
  id: string;
  name: string;
  type: 'user' | 'activity' | 'category' | 'location';
  value: number;
  x?: number;
  y?: number;
  z?: number;
}

/**
 * Interface for visualization link
 */
export interface VisualizationLink {
  source: string;
  target: string;
  value: number;
  type: 'interaction' | 'similarity' | 'recommendation';
}

/**
 * Interface for visualization data
 */
export interface VisualizationData {
  nodes: VisualizationNode[];
  links: VisualizationLink[];
}

/**
 * Service class for managing the recommendation system
 */
export class RecommendationService {
  private engine: RecommendationEngine;
  private activities: Activity[] = [];
  private users: User[] = [];
  private interactions: UserInteraction[] = [];
  private isInitialized: boolean = false;
  private readonly MODEL_SAVE_PATH = path.join(process.cwd(), 'public', 'models', 'recommendation-model');

  /**
   * Constructor
   */
  constructor() {
    this.engine = new RecommendationEngine();
  }

  /**
   * Initialize the recommendation service
   * @param activities List of activities
   * @param users List of users
   * @param interactions List of user interactions
   */
  public async initialize(
    activities: Activity[],
    users: User[],
    interactions: UserInteraction[]
  ): Promise<void> {
    this.activities = activities;
    this.users = users;
    this.interactions = interactions;

    // Try to load an existing model
    const modelLoaded = await this.loadModel();

    // If model couldn't be loaded, train a new one
    if (!modelLoaded) {
      await this.trainModel();
    }

    this.isInitialized = true;
  }

  /**
   * Get recommendations for a specific user
   * @param userId User ID
   * @param count Number of recommendations to get
   * @param location Optional location to consider
   * @param categories Optional list of categories to filter by
   */
  public async getRecommendationsForUser(
    userId: string,
    count: number = 5,
    location?: { latitude: number; longitude: number },
    categories?: string[]
  ): Promise<RecommendationResult[]> {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized');
    }

    // Get user by ID
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Get predictions from the model
    const predictions = await this.engine.predict(user, this.activities);

    // Sort activities by prediction score
    let sortedActivities = predictions
      .map((score, index) => ({
        activity: this.activities[index],
        score
      }))
      .sort((a, b) => b.score - a.score);

    // Filter by location if provided
    if (location) {
      sortedActivities = sortedActivities.filter(item => {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          item.activity.location.latitude,
          item.activity.location.longitude
        );
        return distance < 50; // Within 50km
      });
    }

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      sortedActivities = sortedActivities.filter(item => 
        item.activity.category.some(cat => categories.includes(cat))
      );
    }

    // Return top N results
    return sortedActivities.slice(0, count).map(item => ({
      activityId: item.activity.id,
      score: item.score,
      category: item.activity.category,
      location: item.activity.location
    }));
  }

  /**
   * Get popular activities
   * @param count Number of activities to return
   * @param categories Optional list of categories to filter by
   */
  public getPopularActivities(count: number = 10, categories?: string[]): RecommendationResult[] {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized');
    }

    // Count interactions per activity
    const activityInteractions = new Map<string, number>();
    for (const interaction of this.interactions) {
      const count = activityInteractions.get(interaction.activityId) || 0;
      activityInteractions.set(interaction.activityId, count + 1);
    }

    // Sort activities by interaction count
    let sortedActivities = this.activities
      .map(activity => ({
        activity,
        count: activityInteractions.get(activity.id) || 0
      }))
      .sort((a, b) => b.count - a.count);

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      sortedActivities = sortedActivities.filter(item => 
        item.activity.category.some(cat => categories.includes(cat))
      );
    }

    // Return top N results
    return sortedActivities.slice(0, count).map(item => ({
      activityId: item.activity.id,
      score: item.count / Math.max(...Array.from(activityInteractions.values())), // Normalize score
      category: item.activity.category,
      location: item.activity.location
    }));
  }

  /**
   * Get activities similar to a specific activity
   * @param activityId Activity ID
   * @param count Number of similar activities to get
   */
  public async getSimilarActivities(activityId: string, count: number = 5): Promise<RecommendationResult[]> {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized');
    }

    // Get activity by ID
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) {
      throw new Error(`Activity with ID ${activityId} not found`);
    }

    // Get similar activities using the model
    const similarities = await this.engine.getSimilarActivities(activity, this.activities);

    // Sort activities by similarity score
    const sortedActivities = similarities
      .map((score, index) => ({
        activity: this.activities[index],
        score
      }))
      .sort((a, b) => b.score - a.score)
      // Filter out the original activity
      .filter(item => item.activity.id !== activityId);

    // Return top N results
    return sortedActivities.slice(0, count).map(item => ({
      activityId: item.activity.id,
      score: item.score,
      category: item.activity.category,
      location: item.activity.location
    }));
  }

  /**
   * Get visualization data for the recommendation network
   * @param userId Optional user ID to focus on
   * @param maxNodes Maximum number of nodes to include
   */
  public async getVisualizationData(userId?: string, maxNodes: number = 100): Promise<VisualizationData> {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized');
    }

    const nodes: VisualizationNode[] = [];
    const links: VisualizationLink[] = [];
    
    // Add user nodes
    let filteredUsers = this.users;
    if (userId) {
      // If userId is provided, focus on that user and related entities
      filteredUsers = this.users.filter(u => u.id === userId);
    }
    
    // Limit number of users
    filteredUsers = filteredUsers.slice(0, Math.min(maxNodes / 4, filteredUsers.length));
    
    // Add user nodes
    for (const user of filteredUsers) {
      nodes.push({
        id: `user-${user.id}`,
        name: user.name,
        type: 'user',
        value: 10
      });
    }
    
    // Get the user interactions for visualization
    const userIds = filteredUsers.map(u => u.id);
    const relevantInteractions = this.interactions.filter(i => userIds.includes(i.userId));
    
    // Get activity IDs from interactions
    const activityIds = new Set(relevantInteractions.map(i => i.activityId));
    
    // Add activity nodes
    const relevantActivities = this.activities.filter(a => activityIds.has(a.id));
    for (const activity of relevantActivities) {
      nodes.push({
        id: `activity-${activity.id}`,
        name: activity.title || `Activity ${activity.id}`,
        type: 'activity',
        value: 7
      });
    }
    
    // Add category nodes
    const categories = new Set<string>();
    relevantActivities.forEach(a => a.category.forEach(c => categories.add(c)));
    
    for (const category of categories) {
      nodes.push({
        id: `category-${category}`,
        name: category,
        type: 'category',
        value: 5
      });
    }
    
    // Add location nodes (simplified by region)
    const locationRegions = new Map<string, { lat: number; lng: number; count: number }>();
    
    relevantActivities.forEach(a => {
      // Round coordinates to create region clusters
      const regionKey = `${Math.round(a.location.latitude)},${Math.round(a.location.longitude)}`;
      
      if (locationRegions.has(regionKey)) {
        const region = locationRegions.get(regionKey)!;
        region.count++;
      } else {
        locationRegions.set(regionKey, {
          lat: a.location.latitude,
          lng: a.location.longitude,
          count: 1
        });
      }
    });
    
    for (const [key, region] of locationRegions.entries()) {
      nodes.push({
        id: `location-${key}`,
        name: `Location ${key}`,
        type: 'location',
        value: Math.min(region.count + 3, 15) // Size based on activity count
      });
    }
    
    // Create links between users and activities
    for (const interaction of relevantInteractions) {
      links.push({
        source: `user-${interaction.userId}`,
        target: `activity-${interaction.activityId}`,
        value: 1,
        type: 'interaction'
      });
    }
    
    // Create links between activities and categories
    for (const activity of relevantActivities) {
      for (const category of activity.category) {
        links.push({
          source: `activity-${activity.id}`,
          target: `category-${category}`,
          value: 1,
          type: 'similarity'
        });
      }
      
      // Create links between activities and locations
      const regionKey = `${Math.round(activity.location.latitude)},${Math.round(activity.location.longitude)}`;
      links.push({
        source: `activity-${activity.id}`,
        target: `location-${regionKey}`,
        value: 1,
        type: 'similarity'
      });
    }
    
    // Add recommendation links
    for (const user of filteredUsers) {
      const recommendations = await this.getRecommendationsForUser(user.id, 3);
      for (const rec of recommendations) {
        links.push({
          source: `user-${user.id}`,
          target: `activity-${rec.activityId}`,
          value: rec.score * 3, // Scale link strength by recommendation score
          type: 'recommendation'
        });
      }
    }
    
    return { nodes, links };
  }

  /**
   * Train the recommendation model
   */
  private async trainModel(): Promise<void> {
    console.log('Training recommendation model...');
    await this.engine.train(this.users, this.activities, this.interactions);
    
    // Save the model
    await this.saveModel();
  }

  /**
   * Save the model to disk
   */
  private async saveModel(): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(this.MODEL_SAVE_PATH), { recursive: true });
      await this.engine.saveModel(this.MODEL_SAVE_PATH);
      console.log(`Model saved to ${this.MODEL_SAVE_PATH}`);
    } catch (error) {
      console.error('Error saving model:', error);
    }
  }

  /**
   * Load the model from disk
   */
  private async loadModel(): Promise<boolean> {
    try {
      await this.engine.loadModel(this.MODEL_SAVE_PATH);
      console.log(`Model loaded from ${this.MODEL_SAVE_PATH}`);
      return true;
    } catch (error) {
      console.warn('Could not load model, will train a new one:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers using the Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get the recommendation model's feature importance data
   * This can be used for visualizing how the model makes decisions
   */
  public async getModelFeatureImportance(): Promise<Record<string, number>> {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized');
    }
    
    return this.engine.getFeatureImportance();
  }

  /**
   * Update the model with new interaction data
   * @param newInteractions New user interactions to update the model with
   */
  public async updateModel(newInteractions: UserInteraction[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized');
    }
    
    // Add new interactions to existing ones
    this.interactions = [...this.interactions, ...newInteractions];
    
    // Retrain the model with

