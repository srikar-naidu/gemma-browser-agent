import {
    chromium,
    type Browser,
    type Page,
} from "playwright";

let browser: Browser | null = null;
let page: Page | null = null;

async function getPage(): Promise<Page> {
    /*
     * Launch one persistent visible browser.
     */
    if (!browser) {
        console.log("[jarvis] Starting Playwright browser...");

        browser = await chromium.launch({
            headless: false,
            args: [
                "--autoplay-policy=no-user-gesture-required",
            ],
        });

        console.log("[jarvis] Playwright browser started.");
    }

    /*
     * Reuse existing page whenever possible.
     */
    if (!page || page.isClosed()) {
        page = await browser.newPage({
            viewport: {
                width: 1440,
                height: 900,
            },
        });

        page.setDefaultTimeout(20_000);
        page.setDefaultNavigationTimeout(30_000);
    }

    return page;
}

/*
 * ------------------------------------------------------------
 * OPEN WEBSITE
 * ------------------------------------------------------------
 */
export async function openWebsite(
    url: string
): Promise<string> {
    const target = String(url ?? "").trim();

    if (!target) {
        throw new Error("No website URL was provided.");
    }

    if (!/^https?:\/\/[^\s]+$/i.test(target)) {
        throw new Error("Invalid HTTP/HTTPS URL.");
    }

    const currentPage = await getPage();

    console.log(
        "[jarvis] Opening website:",
        target
    );

    await currentPage.goto(target, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
    });

    return `Opened ${target}`;
}

/*
 * ------------------------------------------------------------
 * YOUTUBE PLAY
 * ------------------------------------------------------------
 */
export async function youtubePlay(
    query: string
): Promise<string> {
    const search = String(query ?? "").trim();

    if (!search) {
        throw new Error(
            "No YouTube search query was provided."
        );
    }

    const currentPage = await getPage();

    console.log(
        "[jarvis] YouTube play requested:",
        search
    );

    /*
     * Open YouTube search results.
     */
    const searchUrl =
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
            search
        )}`;

    console.log(
        "[jarvis] YouTube search URL:",
        searchUrl
    );

    await currentPage.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
    });

    /*
     * Allow YouTube client-side rendering.
     */
    await currentPage.waitForTimeout(3_000);

    /*
     * Find first normal video result.
     */
    const firstVideo = currentPage
        .locator("ytd-video-renderer a#video-title")
        .first();

    await firstVideo.waitFor({
        state: "visible",
        timeout: 20_000,
    });

    const title =
        (
            await firstVideo.getAttribute("title")
        )?.trim() || search;

    console.log(
        "[jarvis] YouTube first result:",
        title
    );

    /*
     * Get href before clicking.
     *
     * Direct navigation is more reliable than clicking
     * a dynamically rendered YouTube result.
     */
    const href = await firstVideo.getAttribute(
        "href"
    );

    if (!href) {
        throw new Error(
            "YouTube video URL could not be determined."
        );
    }

    const videoUrl = href.startsWith("http")
        ? href
        : `https://www.youtube.com${href}`;

    console.log(
        "[jarvis] Opening YouTube video:",
        videoUrl
    );

    /*
     * Navigate directly to video.
     */
    await currentPage.goto(videoUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
    });

    /*
     * Wait for player.
     */
    await currentPage.waitForTimeout(4_000);

    const video = currentPage
        .locator("video")
        .first();

    try {
        await video.waitFor({
            state: "visible",
            timeout: 15_000,
        });
    } catch {
        console.warn(
            "[jarvis] YouTube video element was not found."
        );
    }

    /*
     * Try JavaScript playback.
     */
    try {
        const playbackResult =
            await video.evaluate((element) => {
                const player =
                    element as HTMLVideoElement;

                player.muted = false;

                const promise = player.play();

                return {
                    paused: player.paused,
                    currentTime: player.currentTime,
                    promiseCreated: !!promise,
                };
            });

        console.log(
            "[jarvis] YouTube playback state:",
            playbackResult
        );
    } catch (error) {
        console.warn(
            "[jarvis] Direct video.play() failed:",
            error
        );
    }

    /*
     * Give YouTube time to begin playback.
     */
    await currentPage.waitForTimeout(2_500);

    /*
     * Check actual playback state.
     */
    let isPlaying = false;

    try {
        isPlaying = await video.evaluate(
            (element) => {
                const player =
                    element as HTMLVideoElement;

                return (
                    !player.paused &&
                    !player.ended &&
                    player.currentTime > 0
                );
            }
        );
    } catch {
        // Ignore verification error.
    }

    /*
     * If direct play did not start, try YouTube's
     * visible play button.
     */
    if (!isPlaying) {
        console.log(
            "[jarvis] Direct playback did not start. Trying YouTube play button..."
        );

        const playButton = currentPage
            .locator(
                ".ytp-play-button"
            )
            .first();

        try {
            await playButton.waitFor({
                state: "visible",
                timeout: 5_000,
            });

            const ariaLabel =
                await playButton.getAttribute(
                    "aria-label"
                );

            console.log(
                "[jarvis] YouTube play button:",
                ariaLabel
            );

            if (
                ariaLabel &&
                /play/i.test(ariaLabel)
            ) {
                await playButton.click();
            }

            await currentPage.waitForTimeout(2_000);

            isPlaying = await video.evaluate(
                (element) => {
                    const player =
                        element as HTMLVideoElement;

                    return (
                        !player.paused &&
                        !player.ended &&
                        player.currentTime > 0
                    );
                }
            );
        } catch (error) {
            console.warn(
                "[jarvis] YouTube play button attempt failed:",
                error
            );
        }
    }

    /*
     * Final result.
     */
    if (isPlaying) {
        console.log(
            "[jarvis] YouTube playback confirmed:",
            title
        );

        return `Playing ${title} on YouTube.`;
    }

    /*
     * Video page is open even if autoplay was blocked.
     */
    console.warn(
        "[jarvis] YouTube video opened but playback could not be confirmed."
    );

    return `Opened ${title} on YouTube. Playback may require pressing Play.`;
}