// Mock client-side Supabase Browser client for offline/local sales demo.
// Bypasses network auth checks, allows passwordless login, and simulates presence.

export const supabaseBrowser = {
  auth: {
    getUser: async () => {
      // Always return a valid mock admin user
      return {
        data: {
          user: {
            id: "demo-admin-id",
            email: "demo@teamvisionllc.com",
            user_metadata: {
              full_name: "Demo Admin",
              avatar_url: undefined as string | undefined,
            },
          },
        },
        error: null as any,
      };
    },
    getSession: async () => {
      return {
        data: {
          session: {
            user: {
              id: "demo-admin-id",
              email: "demo@teamvisionllc.com",
            },
          },
        },
        error: null as any,
      };
    },
    signInWithOAuth: async (options: any) => {
      console.log("[Mock Auth] signInWithOAuth invoked, redirecting to /admin");
      // Instantly redirect to the admin dashboard
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      }
      return { data: { provider: "google", url: "/admin" }, error: null as any };
    },
    signOut: async () => {
      console.log("[Mock Auth] signOut invoked, redirecting to /admin/login");
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
      return { error: null as any };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Call immediately with initial session
      const mockSession = {
        user: {
          id: "demo-admin-id",
          email: "demo@teamvisionllc.com",
        },
      };
      // Fire inside a timeout to prevent React cycle issues during render
      if (typeof window !== "undefined") {
        setTimeout(() => callback("INITIAL_SESSION", mockSession), 50);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              // noop
            },
          },
        },
      };
    },
  },
  
  channel: (name: string, opts?: any) => {
    console.log(`[Mock Realtime] Subscribed to presence channel: ${name}`);
    return {
      on: function (event: string, filter: any, callback: () => void) {
        // Automatically trigger sync event to populate online users list
        if (event === "presence") {
          setTimeout(() => callback(), 100);
        }
        return this;
      },
      subscribe: function (statusCallback?: (status: string) => void) {
        if (statusCallback) {
          setTimeout(() => statusCallback("SUBSCRIBED"), 50);
        }
        return this;
      },
      track: async (presenceInfo: any) => {
        // noop
        return "ok";
      },
      presenceState: <T = any>() => {
        // Simulate other demo users active online
        const state = {
          "demo@teamvisionllc.com": [
            { name: "Demo Admin", email: "demo@teamvisionllc.com", avatar: undefined }
          ],
          "allen@teamvisionllc.com": [
            { name: "J. Alex Harrison", email: "allen@teamvisionllc.com", avatar: undefined }
          ],
          "leasing@teamvisionllc.com": [
            { name: "Leasing Agent", email: "leasing@teamvisionllc.com", avatar: undefined }
          ]
        };
        return state as unknown as Record<string, T[]>;
      },
    };
  },
  
  removeChannel: (channel: any) => {
    // noop
  },

  from: (table: string) => {
    return {
      select: function (columns?: string) {
        return this;
      },
      eq: function (column: string, value: any) {
        return this;
      },
      maybeSingle: async () => {
        if (table === "allowed_users") {
          return {
            data: {
              id: "demo-admin-user",
              email: "demo@teamvisionllc.com",
              name: "Demo Admin",
              role: "admin",
              active: true,
            },
            error: null as any,
          };
        }
        return { data: null, error: null as any };
      },
    };
  },
};
