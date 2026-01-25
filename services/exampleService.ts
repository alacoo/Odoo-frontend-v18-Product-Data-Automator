/**
 * Example Service
 * 
 * This is a template service showing the expected structure for API services.
 * 
 * IMPORTANT:
 * - Use the shared apiClient from @/core/adapters/apiClient
 * - Always return typed responses
 * - Handle errors appropriately
 */

// Import the shared API client (uncomment when integrating)
// import { apiClient } from '@/core/adapters/apiClient';

import { ExampleEntity, ExampleApiResponse } from '../types';

/**
 * Fetch all entities from the API
 * @returns Promise<ExampleEntity[]> List of entities
 * @throws Error If the request fails
 */
export const getEntities = async (): Promise<ExampleEntity[]> => {
    // Uncomment when integrating with actual API
    // const response = await apiClient.get('/api/example.entity');
    // return response.data;

    // Placeholder return
    return [];
};

/**
 * Fetch a single entity by ID
 * @param id - Entity ID
 * @returns Promise<ExampleEntity> The entity
 * @throws Error If not found or request fails
 */
export const getEntityById = async (id: number): Promise<ExampleEntity> => {
    // Uncomment when integrating with actual API
    // const response = await apiClient.get(`/api/example.entity/${id}`);
    // return response.data;

    // Placeholder return
    return {
        id,
        name: 'Example',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
};

/**
 * Create a new entity
 * @param data - Entity data to create
 * @returns Promise<ExampleEntity> The created entity
 */
export const createEntity = async (
    data: Omit<ExampleEntity, 'id' | 'created_at' | 'updated_at'>
): Promise<ExampleEntity> => {
    // Uncomment when integrating with actual API
    // const response = await apiClient.post('/api/example.entity', data);
    // return response.data;

    // Placeholder return
    return {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
};

/**
 * Update an existing entity
 * @param id - Entity ID
 * @param data - Partial entity data to update
 * @returns Promise<ExampleEntity> The updated entity
 */
export const updateEntity = async (
    id: number,
    data: Partial<ExampleEntity>
): Promise<ExampleEntity> => {
    // Uncomment when integrating with actual API
    // const response = await apiClient.put(`/api/example.entity/${id}`, data);
    // return response.data;

    // Placeholder return
    return {
        id,
        name: data.name || 'Updated',
        is_active: data.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
};

/**
 * Delete an entity
 * @param id - Entity ID to delete
 * @returns Promise<boolean> True if deleted successfully
 */
export const deleteEntity = async (id: number): Promise<boolean> => {
    // Uncomment when integrating with actual API
    // await apiClient.delete(`/api/example.entity/${id}`);
    // return true;

    return true;
};
