import { BaseService, ServiceResult, ListResult } from './BaseService';
import { Quiz, Question, QuizAttempt, QuizCategory } from '../types/database';
import { monitoring } from './MonitoringService';

export class QuizService extends BaseService<'quizzes'> {
  constructor() {
    super('quizzes');
  }

  /**
   * Get a quiz by ID with its questions
   */
  async getQuiz(id: string): Promise<ServiceResult<Quiz & { questions: Question[] }>> {
    try {
      const { data, error } = await this.supabase
        .from('quizzes')
        .select(`
          *,
          questions (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'QuizService.getQuiz',
          id
        })
      };
    }
  }

  /**
   * List quizzes for an organization with optional category filter
   */
  async listQuizzes(
    organizationId: string,
    categoryId?: string,
    options?: { page?: number; limit?: number }
  ): Promise<ListResult<Quiz>> {
    return this.listRows({
      ...options,
      filters: {
        organization_id: organizationId,
        ...(categoryId ? { category_id: categoryId } : {})
      }
    });
  }

  /**
   * Create a new quiz
   */
  async createQuiz(
    quiz: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>,
    questions: Omit<Question, 'id' | 'quiz_id' | 'created_at' | 'updated_at'>[]
  ): Promise<ServiceResult<Quiz & { questions: Question[] }>> {
    const endMark = monitoring.startMetric('create_quiz');

    try {
      const { data: newQuiz, error: quizError } = await this.table
        .insert(quiz)
        .select()
        .single();

      if (quizError) throw quizError;

      // Add quiz_id to questions
      const questionsWithQuizId = questions.map(q => ({
        ...q,
        quiz_id: newQuiz.id
      }));

      // Insert questions
      const { data: newQuestions, error: questionsError } = await this.supabase
        .from('questions')
        .insert(questionsWithQuizId)
        .select();

      if (questionsError) throw questionsError;

      return {
        data: { ...newQuiz, questions: newQuestions },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'QuizService.createQuiz',
          quiz,
          questionsCount: questions.length
        })
      };
    } finally {
      endMark();
    }
  }

  /**
   * Submit a quiz attempt
   */
  async submitQuizAttempt(
    attempt: Omit<QuizAttempt, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<QuizAttempt>> {
    const endMark = monitoring.startMetric('submit_quiz');

    try {
      const { data, error } = await this.supabase
        .from('quiz_attempts')
        .insert(attempt)
        .select(`
          *,
          quiz (*)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'QuizService.submitQuiz',
          quizId: attempt.quiz_id,
          userId: attempt.user_id
        })
      };
    } finally {
      endMark();
    }
  }

  /**
   * Get user's quiz attempts
   */
  async getUserAttempts(
    userId: string,
    quizId?: string
  ): Promise<ListResult<QuizAttempt>> {
    try {
      let query = this.supabase
        .from('quiz_attempts')
        .select('*, quiz (*)', { count: 'exact' })
        .eq('user_id', userId);

      if (quizId) {
        query = query.eq('quiz_id', quizId);
      }

      const { data, error, count } = await query;

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
          context: 'QuizService.getUserAttempts',
          userId,
          quizId
        })
      };
    }
  }

  /**
   * List quiz categories for an organization
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
          context: 'QuizService.listCategories',
          organizationId
        })
      };
    }
  }
}
