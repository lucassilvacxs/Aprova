import { describe, it, expect } from 'vitest';
import {
  calculateCebraspeScore,
  calculateStandardScore,
  formatDuration,
} from '../src/core/utils/scoring';

describe('Scoring Utilities (Regras de Pontuação)', () => {
  describe('calculateCebraspeScore (Estilo Cebraspe / CESPE)', () => {
    it('deve calcular corretamente a nota líquida com 1 errada anulando 1 certa', () => {
      // 120 questões: 80 certas, 20 erradas, 20 em branco
      const result = calculateCebraspeScore(80, 20, 20, 1.0);

      expect(result.totalQuestions).toBe(120);
      expect(result.grossScore).toBe(80);
      expect(result.penaltyPoints).toBe(20);
      expect(result.netScore).toBe(60); // 80 - 20 = 60
      expect(result.percentage).toBe(50); // 60 / 120 = 50%
    });

    it('deve permitir pontuação líquida negativa quando configurado', () => {
      // 10 certas, 50 erradas, 40 em branco
      const result = calculateCebraspeScore(10, 50, 40, 1.0, true);

      expect(result.netScore).toBe(-40); // 10 - 50 = -40
      expect(result.percentage).toBe(0); // Percentual não deve ser negativo
    });

    it('deve truncar em 0 quando allowNegative for falso', () => {
      const result = calculateCebraspeScore(10, 50, 40, 1.0, false);
      expect(result.netScore).toBe(0);
    });

    it('deve respeitar fatores de penalidade customizados (ex: 0.5 por erro)', () => {
      // 70 certas, 20 erradas com penalidade de 0.5
      const result = calculateCebraspeScore(70, 20, 10, 0.5);

      expect(result.grossScore).toBe(70);
      expect(result.penaltyPoints).toBe(10);
      expect(result.netScore).toBe(60); // 70 - 10 = 60
    });
  });

  describe('calculateStandardScore (Múltipla Escolha Padrão)', () => {
    it('deve pontuar apenas acertos sem penalizar erros', () => {
      const result = calculateStandardScore(45, 10, 5);
      expect(result.totalQuestions).toBe(60);
      expect(result.score).toBe(45);
      expect(result.percentage).toBe(75); // 45 / 60 = 75%
    });
  });

  describe('formatDuration (Formatação de Tempo)', () => {
    it('deve formatar segundos para MM:SS quando menor que uma hora', () => {
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(59)).toBe('00:59');
    });

    it('deve formatar segundos para HH:MM:SS quando maior ou igual a uma hora', () => {
      expect(formatDuration(3665)).toBe('01:01:05');
      expect(formatDuration(16200)).toBe('04:30:00'); // 4h30 de prova
    });
  });
});
