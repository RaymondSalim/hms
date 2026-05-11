let _mockHeaders: Map<string, string> = new Map();

export function __setMockHeaders(headers: Map<string, string>) {
    _mockHeaders = headers;
}

export async function headers() {
    return _mockHeaders;
}
