export function apiErrorMessage(error: unknown, fallback: string) {
    const response = (error as {
        response?: { status?: number; data?: { error?: string; retryAfter?: number }; headers?: Record<string, string> };
    })?.response;

    if (response?.status === 429) {
        const retryAfter = response.data?.retryAfter ?? Number(response.headers?.["retry-after"] ?? 0);
        if (retryAfter > 0) return `Too many requests. Try again in ${retryAfter} seconds.`;
        return "Too many requests. Please try again later.";
    }

    return response?.data?.error || fallback;
}
