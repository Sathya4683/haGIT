const axios = require('axios');
const StateManager = require('./state');
const pkg = require('../package.json');

const DEFAULT_TIMEOUT_MS = 15000;
const PUSH_BATCH_SIZE = 100; // server limit per request

// Turns axios failures into messages a user can act on.
function toError(error, fallback) {
    const status = error.response?.status;
    const body = error.response?.data;

    if (status === 401) {
        return new Error(
            'Your token is invalid or expired. Copy a new one from the dashboard (Settings → CLI token) and run: hagit login -t <token>'
        );
    }
    if (status === 429) {
        const retryAfter = body?.retryAfter ?? Number(error.response.headers?.['retry-after'] || 0);
        return new Error(retryAfter ? `Too many requests. Try again in ${retryAfter}s` : 'Too many requests. Try again later');
    }
    if (!error.response) {
        if (error.code === 'ECONNABORTED') return new Error('The haGIT server took too long to respond. Try again.');
        return new Error(`Could not reach ${StateManager.getApiUrl()}. Check your connection.`);
    }
    return new Error(body?.error || fallback);
}

class ApiClient {
    // Resolved per request so a broken config only affects commands that need the network.
    client() {
        const token = StateManager.getAuthToken();
        return axios.create({
            baseURL: StateManager.getApiUrl(),
            timeout: DEFAULT_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
                'X-Hagit-Client': `hagit-cli/${pkg.version}`,
                ...(token && { Authorization: `Bearer ${token}` })
            }
        });
    }

    async verifyToken(token) {
        try {
            const response = await this.client().post('/api/auth/verify', null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw toError(error, 'Token verification failed');
        }
    }

    async createHabit(name) {
        try {
            const response = await this.client().post('/api/habits', { name });
            return response.data;
        } catch (error) {
            throw toError(error, 'Failed to create habit');
        }
    }

    async deleteHabit(name) {
        try {
            const response = await this.client().delete('/api/habits', { data: { name } });
            return response.data;
        } catch (error) {
            throw toError(error, 'Failed to delete habit');
        }
    }

    async getHabits() {
        try {
            const response = await this.client().get('/api/habits');
            return response.data;
        } catch (error) {
            throw toError(error, 'Failed to fetch habits');
        }
    }

    /**
     * Pushes commits in server-sized batches. Each commit's local id is sent as its clientId,
     * so retrying after a network failure never stores a commit twice.
     * Calls onBatch with the local ids of each batch the server accepted.
     */
    async pushCommits(commits, onBatch = () => {}) {
        let pushed = 0;
        for (let i = 0; i < commits.length; i += PUSH_BATCH_SIZE) {
            const batch = commits.slice(i, i + PUSH_BATCH_SIZE);
            try {
                const response = await this.client().post('/api/commits/push', {
                    commits: batch.map(c => ({
                        habitName: c.habitName,
                        message: c.message,
                        timestamp: c.timestamp,
                        clientId: c.id
                    }))
                });
                pushed += response.data.count ?? batch.length;
                onBatch(batch.map(c => c.id));
            } catch (error) {
                const err = toError(error, 'Failed to push commits');
                err.pushed = pushed;
                throw err;
            }
        }
        return { count: pushed };
    }

    async getCommits(habitName = null, limit = 50) {
        try {
            const response = await this.client().get('/api/commits', {
                params: { ...(habitName && { habitName }), limit }
            });
            return response.data;
        } catch (error) {
            throw toError(error, 'Failed to fetch commits');
        }
    }

    async coach(body) {
        try {
            const response = await this.client().post('/api/coach', body, { timeout: 70000 });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) throw new Error('This haGIT server does not have the coach yet');
            throw toError(error, 'Coach request failed');
        }
    }
}

module.exports = new ApiClient();
