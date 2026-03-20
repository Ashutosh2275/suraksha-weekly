import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const INTERNAL_API =
  process.env.INTERNAL_API_URL ?? 'http://localhost:8000/api/v1';
const DEMO_PHONE = '+919876543210';
const DEMO_OTP = '1234';
const DEMO_WORKER_ID = 'demo-worker-9876543210';

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return input;
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'otp',
      name: 'OTP',
      /**
       * Credentials schema for NextAuth UI (unused — we handle the form).
       * All fields required to register a new worker or log in an existing one.
       */
      credentials: {
        phone: { type: 'text' },
        otp: { type: 'text' },
        name: { type: 'text' },
        city: { type: 'text' },
        service_zones: { type: 'text' },
        platform_type: { type: 'text' },
        avg_daily_hours: { type: 'text' },
        avg_weekly_earnings: { type: 'text' },
      },

      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null;

        const phone = normalizePhone(credentials.phone);
        const otp = credentials.otp;

        // Hard demo bypass: no OTP service dependency for this specific number.
        if (phone === DEMO_PHONE && otp === DEMO_OTP) {
          return {
            id: DEMO_WORKER_ID,
            backendToken: 'demo-local-token',
            worker: {
              id: DEMO_WORKER_ID,
              phone: DEMO_PHONE,
              name: 'Demo Worker',
              city: 'Mumbai',
              service_zones: ['Andheri'],
              platform_type: 'Zomato',
              trust_score: 100,
              trust_tier: 'standard',
            },
          };
        }

        try {
          const res = await fetch(`${INTERNAL_API}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              otp,
              name: credentials.name ?? 'New Worker',
              city: credentials.city ?? 'Mumbai',
              service_zones: JSON.parse(credentials.service_zones ?? '[]'),
              platform_type: credentials.platform_type ?? 'Zomato',
              avg_daily_hours: parseFloat(credentials.avg_daily_hours ?? '8'),
              avg_weekly_earnings: parseFloat(
                credentials.avg_weekly_earnings ?? '5000',
              ),
            }),
          });

          if (!res.ok) return null;

          const data = (await res.json()) as {
            data?: { token: string; worker: Record<string, unknown> };
          };

          if (data?.data?.token) {
            return {
              id: data.data.worker.id as string,
              backendToken: data.data.token,
              worker: data.data.worker,
            };
          }
        } catch {
          // network error → refuse login
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // user is only populated on first sign-in
      if (user) {
        const u = user as unknown as {
          backendToken: string;
          worker: Record<string, unknown>;
        };
        token.backendToken = u.backendToken;
        token.worker = u.worker;
      }
      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        backendToken: token.backendToken as string,
        worker: token.worker as Record<string, unknown>,
      };
    },
  },

  pages: {
    signIn: '/auth',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 h — matches backend JWT expiry
  },

  secret: process.env.NEXTAUTH_SECRET ?? 'dev-nextauth-secret',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
