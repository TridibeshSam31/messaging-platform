export function log(
    level: string,
    event: string,
    data: Record<string, unknown> = {}
) {
    console.log(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            event,
            ...data,
        })
    );
}