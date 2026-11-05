interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

export class AuthRateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000, // 15 minutos
    blockDurationMs = 15 * 60 * 1000 // 15 minutos de bloqueio
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  private getKey(ip: string, email?: string): string {
    const cleanIp = (ip || 'unknown').trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    return `${cleanIp}:${cleanEmail}`;
  }

  public isBlocked(ip: string, email?: string): boolean {
    const key = this.getKey(ip, email);
    const record = this.attempts.get(key);
    if (!record) return false;

    const now = Date.now();

    if (record.blockedUntil) {
      if (now < record.blockedUntil) {
        return true;
      }
      // O tempo de bloqueio expirou: resetar
      this.attempts.delete(key);
      return false;
    }

    // Se o registro expirou fora da janela, limpar
    if (now - record.firstAttemptAt > this.windowMs) {
      this.attempts.delete(key);
      return false;
    }

    return false;
  }

  public recordFailedAttempt(ip: string, email?: string): void {
    const key = this.getKey(ip, email);
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      this.attempts.set(key, {
        count: 1,
        firstAttemptAt: now,
      });
      return;
    }

    record.count += 1;

    if (record.count >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
    }
  }

  public resetAttempts(ip: string, email?: string): void {
    const key = this.getKey(ip, email);
    this.attempts.delete(key);
  }

  public clearAll(): void {
    this.attempts.clear();
  }
}

export const authRateLimiter = new AuthRateLimiter();

