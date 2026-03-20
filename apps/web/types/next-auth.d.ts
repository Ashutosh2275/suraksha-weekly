/**
 * Augments NextAuth types so TypeScript knows about the custom session fields
 * (backendToken and worker) we inject in the jwt/session callbacks.
 */
import 'next-auth';
import type { Worker } from '../../../../shared/types';

declare module 'next-auth' {
  interface Session {
    /** JWT issued by the FastAPI backend */
    backendToken: string;
    /** Full worker profile returned on login/registration */
    worker: Pick<
      Worker,
      | 'id'
      | 'phone'
      | 'name'
      | 'city'
      | 'service_zones'
      | 'platform_type'
      | 'trust_score'
      | 'trust_tier'
      | 'avg_daily_hours'
      | 'avg_weekly_earnings'
    >;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken: string;
    worker: Session['worker'];
  }
}
