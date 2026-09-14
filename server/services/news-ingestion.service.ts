import crypto from 'crypto';
import { db } from '../db';
import { news } from '../db/schema';
import { eq, or } from 'drizzle-orm';

export interface IngestedNewsItem {
  sourceId: string;
  contestId?: string | null;
  title: string;
  summary: string;
  content: string;
  externalUrl?: string;
  imageUrl?: string;
  category?: string;
  publishedAt: Date;
  isImportant?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

export interface IngestedDocumentItem {
  sourceId: string;
  contestId: string;
  title: string;
  description?: string;
  documentType: string;
  fileUrl?: string;
  externalUrl?: string;
  publicationDate: Date;
  fileSizeBytes?: number;
}

export interface NewsProvider {
  name: string;
  fetchLatestNews(): Promise<IngestedNewsItem[]>;
  fetchContestNews(contestId: string): Promise<IngestedNewsItem[]>;
  fetchDocuments(contestId: string): Promise<IngestedDocumentItem[]>;
}

export class NewsIngestionService {
  /**
   * Normaliza uma URL removendo parâmetros de rastreamento (UTM, fbclid, etc.)
   * e padronizando protocolo e barra final para deduplicação canônica.
   */
  static generateCanonicalUrl(rawUrl?: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
      const parsed = new URL(rawUrl.trim());
      // Remove parâmetros comuns de rastreamento
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        '_ga',
        'ref',
      ];
      for (const p of trackingParams) {
        parsed.searchParams.delete(p);
      }
      let cleaned = parsed.origin + parsed.pathname;
      if (cleaned.endsWith('/') && cleaned.length > 1) {
        cleaned = cleaned.slice(0, -1);
      }
      const search = parsed.searchParams.toString();
      return search ? `${cleaned}?${search}` : cleaned;
    } catch {
      return rawUrl.trim();
    }
  }

  /**
   * Gera hash SHA-256 criptográfico baseado em título normalizado, fonte e data.
   */
  static generateContentHash(
    sourceId: string,
    title: string,
    publishedAt: string | Date,
    canonicalUrl?: string | null
  ): string {
    const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, ' ');
    const pubIso = new Date(publishedAt).toISOString().split('T')[0]; // Dia de publicação
    const base = `${sourceId}|${normalizedTitle}|${pubIso}|${canonicalUrl || ''}`;
    return crypto.createHash('sha256').update(base).digest('hex');
  }

  /**
   * Verifica se já existe notícia cadastrada com a mesma URL canônica ou hash de conteúdo.
   */
  static async checkDuplicate(
    canonicalUrl?: string | null,
    contentHash?: string | null
  ): Promise<{ isDuplicate: boolean; existingNewsId?: string; reason?: string }> {
    if (!canonicalUrl && !contentHash) {
      return { isDuplicate: false };
    }

    const conditions = [];
    if (canonicalUrl) {
      conditions.push(eq(news.canonicalUrl, canonicalUrl));
    }
    if (contentHash) {
      conditions.push(eq(news.contentHash, contentHash));
    }

    if (conditions.length === 0) {
      return { isDuplicate: false };
    }

    const existing = await db
      .select({ id: news.id, canonicalUrl: news.canonicalUrl, contentHash: news.contentHash })
      .from(news)
      .where(or(...conditions))
      .limit(1);

    if (existing.length > 0) {
      const match = existing[0];
      const reason =
        match.canonicalUrl && match.canonicalUrl === canonicalUrl
          ? 'URL canônica duplicada'
          : 'Conteúdo idêntico já cadastrado (hash SHA-256)';
      return {
        isDuplicate: true,
        existingNewsId: match.id,
        reason,
      };
    }

    return { isDuplicate: false };
  }
}
