const axios = require('axios');
const StateManager = require('./state');
const pkg = require('../package.json');

// Anonymous usage telemetry: command name, duration, success and an error code/message.
// Never habit names, commit messages or tokens. Disable with `hagit telemetry off`,
// HAGIT_TELEMETRY=0 or DO_NOT_TRACK=1.

const SEND_TIMEOUT_MS = 800;
const SECRET_PATTERN = /(eyJ[\w-]+\.[\w-]+\.[\w-]+|Bearer\s+\S+)/g;

function enabled() {
    if (process.env.HAGIT_TELEMETRY === '0' || process.env.DO_NOT_TRACK === '1') return false;
    try {
        return StateManager.readConfig().telemetry !== false;
    } catch {
        return false;
    }
}

const scrub = (text) => String(text || '').replace(SECRET_PATTERN, '[redacted]').slice(0, 300);

async function record(event) {
    if (!enabled()) return;
    try {
        const token = StateManager.getAuthToken();
        await axios.post(
            `${StateManager.getApiUrl()}/api/telemetry`,
            { source: 'cli', version: pkg.version, events: [{ ...event, message: event.message && scrub(event.message) }] },
            {
                timeout: SEND_TIMEOUT_MS,
                headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
            }
        );
    } catch {
        // Telemetry is best-effort and must never affect the command.
    }
}

function setEnabled(value) {
    StateManager.updateConfig({ telemetry: value });
}

module.exports = { record, enabled, setEnabled };
