// apiox/http.ts

export interface HttpOptions {
    headers?: Record<string, string>;
    timeout?: number;
}

async function request<T>(
    url: string,
    method: string,
    body?: any,
    options: HttpOptions = {}
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 根据返回类型自动解析 JSON，也可以提供 text/blob 等选项
        const data = await response.json();
        return data as T;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

export const apioxHttp = {
    get<T>(url: string, options?: HttpOptions): Promise<T> {
        return request<T>(url, 'GET', undefined, options);
    },
    post<T>(url: string, body: any, options?: HttpOptions): Promise<T> {
        return request<T>(url, 'POST', body, options);
    },
    put<T>(url: string, body: any, options?: HttpOptions): Promise<T> {
        return request<T>(url, 'PUT', body, options);
    },
    delete<T>(url: string, options?: HttpOptions): Promise<T> {
        return request<T>(url, 'DELETE', undefined, options);
    },
    // 如果需要直接拿到 Response 对象（作为逃生舱）
    raw(): typeof fetch {
        return fetch;
    }
};