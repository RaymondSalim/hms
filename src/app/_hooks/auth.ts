import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

export function useAuth() {
    const { data: session } = useSession();

    useEffect(() => {
        let isMounted = true;

        const refreshToken = async () => {
            if (session?.refreshToken) {
                try {
                    const res = await fetch("/api/auth/refresh", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ refreshToken: session.refreshToken }),
                    });

                    if (!res.ok) {
                        throw new Error("Failed to refresh token");
                    }

                    const data = await res.json();
                    // Update session with new tokens if using a state management solution
                    // NextAuth.js doesn't provide a built-in way to update the session,
                    // so you might need to implement custom logic or re-fetch the session
                } catch (error) {
                    console.error(error);
                    if (isMounted) signOut();
                }
            }
        };

        // Set an interval to refresh the token before it expires
        const interval = setInterval(() => {
            refreshToken();
        }, 1000 * 60 * 14); // Refresh every 14 minutes if access token expires in 15 minutes

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [session]);

    return { session };
}