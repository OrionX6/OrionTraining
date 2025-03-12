import { AuthError, PostgrestResponse } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { monitoring } from './MonitoringService';
import { supabase } from '../config/supabase';
import { Database } from '../types/database';

type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]['Row'];
export type Insert<T extends TableName> = Tables[T]['Insert'];
export type Update<T extends TableName> = Tables[T]['Update'];

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface ListResult<T> {
  data: T[];
  count: number | null;
  error: Error | null;
}

export abstract class BaseService<T extends TableName> {
  protected supabase: SupabaseClient<Database> = supabase;
  protected table = this.supabase.from(this.tableName);

  protected getRequestOptions() {
    return {
      headers: {
        Prefer: 'return=representation',
        Accept: 'application/vnd.pgrst.object+json',
      },
    };
  }

  constructor(protected tableName: T) {}

  protected async listRows(options?: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
  }): Promise<ListResult<Row<T>>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const offset = (page - 1) * limit;

      let query = this.table.select('*', { count: 'exact' }).range(offset, offset + limit - 1);

      // Apply filters if provided
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count,
        error: null,
      };
    } catch (error) {
      return {
        data: [],
        count: null,
        error: this.handleError(error, {
          context: 'BaseService.listRows',
          options,
        }),
      };
    }
  }

  protected async getRawRow(id: string): Promise<ServiceResult<Row<T>>> {
    try {
      const { data, error } = await this.table.select('*').eq('id', id).single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'BaseService.getRawRow',
          id,
        }),
      };
    }
  }

  protected async insertRow(row: Insert<T>): Promise<ServiceResult<Row<T>>> {
    try {
      const { data, error } = await this.table.insert(row).select().single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'BaseService.insertRow',
          row,
        }),
      };
    }
  }

  protected async updateRow(id: string, updates: Update<T>): Promise<ServiceResult<Row<T>>> {
    try {
      const { data, error } = await this.table.update(updates).eq('id', id).select().single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'BaseService.updateRow',
          id,
          updates,
        }),
      };
    }
  }

  protected async deleteRow(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.table.delete().eq('id', id);

      if (error) throw error;
      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'BaseService.deleteRow',
          id,
        }),
      };
    }
  }

  protected handleError(error: unknown, context: Record<string, any>): Error {
    console.error(`Error in ${this.tableName}:`, error);

    const finalError = error instanceof Error ? error : new Error(String(error));

    monitoring.captureError(finalError, {
      ...context,
      table: this.tableName,
      type: error instanceof AuthError ? 'auth' : 'database',
    });

    return finalError;
  }
}
