import { BaseService, ServiceResult, ListResult } from './BaseService';
import { StudyMaterial, QuizCategory } from '../types/database';
import { monitoring } from './MonitoringService';

export class StudyMaterialService extends BaseService<'study_materials'> {
  constructor() {
    super('study_materials');
  }

  /**
   * Get study material by ID
   */
  async getMaterial(id: string): Promise<ServiceResult<StudyMaterial>> {
    try {
      const { data, error } = await this.table
        .select('*, category (*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'StudyMaterialService.getMaterial',
          id
        })
      };
    }
  }

  /**
   * List study materials for an organization
   */
  async listMaterials(
    organizationId: string,
    categoryId?: string,
    options?: { page?: number; limit?: number }
  ): Promise<ListResult<StudyMaterial>> {
    return this.listRows({
      ...options,
      filters: {
        organization_id: organizationId,
        ...(categoryId ? { category_id: categoryId } : {})
      }
    });
  }

  /**
   * Create new study material
   */
  async createMaterial(
    material: Omit<StudyMaterial, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<StudyMaterial>> {
    const endMark = monitoring.startMetric('create_material');
    try {
      const { data, error } = await this.insertRow(material);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'StudyMaterialService.createMaterial',
          material
        })
      };
    } finally {
      endMark();
    }
  }

  /**
   * Update study material
   */
  async updateMaterial(
    id: string,
    updates: Partial<Omit<StudyMaterial, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<StudyMaterial>> {
    const endMark = monitoring.startMetric('update_material');
    try {
      const { data, error } = await this.updateRow(id, updates);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'StudyMaterialService.updateMaterial',
          id,
          updates
        })
      };
    } finally {
      endMark();
    }
  }

  /**
   * Delete study material
   */
  async deleteMaterial(id: string): Promise<ServiceResult<void>> {
    const endMark = monitoring.startMetric('delete_material');
    try {
      const { error } = await this.deleteRow(id);
      if (error) throw error;
      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'StudyMaterialService.deleteMaterial',
          id
        })
      };
    } finally {
      endMark();
    }
  }

  /**
   * List study material categories for an organization
   */
  async listCategories(organizationId: string): Promise<ListResult<QuizCategory>> {
    try {
      const { data, error, count } = await this.supabase
        .from('quiz_categories')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);

      if (error) throw error;

      return {
        data: data || [],
        count,
        error: null
      };
    } catch (error) {
      return {
        data: [],
        count: 0,
        error: this.handleError(error, {
          context: 'StudyMaterialService.listCategories',
          organizationId
        })
      };
    }
  }

  /**
   * Update material order within a category
   */
  async updateMaterialOrder(
    categoryId: string,
    orderedIds: string[]
  ): Promise<ServiceResult<void>> {
    const endMark = monitoring.startMetric('update_material_order');
    
    try {
      // Update each material's order in sequence
      const updates = orderedIds.map((id, index) => ({
        id,
        order: index + 1
      }));

      const { error } = await this.supabase
        .from(this.tableName)
        .upsert(updates)
        .eq('category_id', categoryId);

      if (error) throw error;

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'StudyMaterialService.updateMaterialOrder',
          categoryId,
          orderedIds
        })
      };
    } finally {
      endMark();
    }
  }
}
