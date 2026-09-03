import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, profile }) {
      // On first sign-in, persist Google profile data into the JWT
      if (profile) {
        token.googleId = profile.sub;
        token.picture = profile.picture;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose extra fields on the client-side session object
      if (session.user) {
        (session.user as any).googleId = token.googleId;
        (session.user as any).picture = token.picture;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
