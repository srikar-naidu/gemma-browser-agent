import { NextResponse } from "next/server";

const FRIDAY_ULTRON_URL =
    process.env.FRIDAY_ULTRON_URL ?? "http://localhost:3000";

export async function POST() {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
            { error: "This test endpoint is available only in development." },
            { status: 404 }
        );
    }

    try {
        // 1. Ask Ultron for an attack
        const attackRes = await fetch(
            `${FRIDAY_ULTRON_URL}/api/ultron/attack`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!attackRes.ok) {
            throw new Error("Ultron request failed");
        }

        const attack = await attackRes.json();

        // 2. Send attack to Friday
        const fridayRes = await fetch(
            `${FRIDAY_ULTRON_URL}/api/friday/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "user",
                            content: attack.attackPrompt,
                        },
                    ],
                }),
            }
        );

        if (!fridayRes.ok) {
            throw new Error("Friday request failed");
        }

        const friday = await fridayRes.json();

        // 3. Judge Friday's response
        const judgeRes = await fetch(
            `${FRIDAY_ULTRON_URL}/api/judge/evaluate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    attackPrompt: attack.attackPrompt,
                    fridayResponse: friday.reply,
                    category: attack.category,
                }),
            }
        );

        if (!judgeRes.ok) {
            throw new Error("Judge request failed");
        }

        const judge = await judgeRes.json();

        return NextResponse.json({
            attack: attack.attackPrompt,
            category: attack.category,
            friday: friday.reply,
            judge,
        });
    } catch (error) {
        console.error("[Jarvis] Friday/Ultron connection error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Friday/Ultron connection failed",
            },
            { status: 500 }
        );
    }
}
