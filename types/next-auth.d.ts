import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      branch: string;
      branchName: string;
      permissions: string[];
      /** HR module: "admin" | "employee" — separate from CRM role. */
      hrRole?: "admin" | "employee";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    hrRole?: "admin" | "employee";
  }
}
