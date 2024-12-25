import type { NextApiRequest, NextApiResponse } from "next";
import { verifyRefreshToken, generateRefreshToken, blacklistRefreshToken } from "@/app/_lib/auth/auth";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_SECRET;
const JWT_EXPIRES_IN = "15m"; // Access token validity

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
    }

    try {
        // Verify the refresh token
        const dbToken = await verifyRefreshToken(refreshToken);

        // Blacklist the old refresh token
        await blacklistRefreshToken(refreshToken);

        // Generate a new refresh token
        const newRefreshToken = await generateRefreshToken(dbToken.userId);

        // Generate a new access token (JWT)
        const accessToken = sign(
            { userId: dbToken.userId },
            JWT_SECRET!,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(200).json({
            accessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(401).json({ message: "Invalid refresh token" });
    }
}