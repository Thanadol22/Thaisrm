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
