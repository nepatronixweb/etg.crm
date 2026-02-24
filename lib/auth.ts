import NextAuth, { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Branch"; // register Branch schema for populate

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          await connectDB();
          const user = await User.findOne({ email: credentials.email, isActive: true }).populate("branch");
          console.log("[AUTH] user found:", !!user, "email:", credentials.email);
          if (!user) return null;
          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          console.log("[AUTH] password valid:", isValid);
          if (!isValid) return null;
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            branch: user.branch?._id?.toString() || user.branch?.toString(),
            branchName: user.branch?.name || "",
          };
        } catch (err) {
          console.error("[AUTH] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.branch = (user as { branch?: string }).branch;
        token.branchName = (user as { branchName?: string }).branchName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.branch = token.branch as string;
        session.user.branchName = token.branchName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

// Named exports for the [...nextauth] route
export { handler as GET, handler as POST };

// Server-side session helper — use this in API routes
export async function auth() {
  return await getServerSession(authOptions);
}
