import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Determine real base URL in production or current environment
      let effectiveBaseUrl = baseUrl;
      if (process.env.NODE_ENV === "production") {
        if (process.env.FRONTEND_URL) {
          effectiveBaseUrl = process.env.FRONTEND_URL;
        } else if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
          effectiveBaseUrl = process.env.NEXTAUTH_URL;
        } else if (process.env.VERCEL_URL) {
          effectiveBaseUrl = `https://${process.env.VERCEL_URL}`;
        }
      }

      // If relative URL (e.g. /agenda), prepend effective base URL
      if (url.startsWith("/")) {
        return `${effectiveBaseUrl}${url}`;
      }
      // If absolute URL, check if origin matches
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === effectiveBaseUrl || parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch (e) {}
      return effectiveBaseUrl;
    },
    async jwt({ token, user, profile }) {
      // On first sign-in or subsequent token refreshes, persist Google profile data
      if (user) {
        token.googleId = (user as any).id || (profile as any)?.sub || token.googleId;
        token.picture = user.image || (profile as any)?.picture || token.picture;
      }
      if (profile) {
        token.googleId = (profile as any).sub;
        token.picture = (profile as any).picture || token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose extra fields on the client-side session object
      if (session.user) {
        (session.user as any).googleId = token.googleId;
        const userPic = (token.picture as string) || session.user.image || undefined;
        (session.user as any).picture = userPic;
        session.user.image = userPic;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
