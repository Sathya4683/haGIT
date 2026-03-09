const axios = require('axios');
const StateManager = require('./state');

class ApiClient {
  constructor() {
    this.baseURL = StateManager.getApiUrl();
  }

  getHeaders() {
    const token = StateManager.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async verifyToken(token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/auth/verify`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Token verification failed');
    }
  }

  async createHabit(name) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/habits`,
        { name },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create habit');
    }
  }

  async getHabits() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/habits`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch habits');
    }
  }

  async pushCommits(commits) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/commits/push`,
        { commits },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to push commits');
    }
  }

  async getCommits(habitName = null, limit = 50) {
    try {
      const params = new URLSearchParams();
      if (habitName) params.append('habitName', habitName);
      params.append('limit', limit.toString());

      const response = await axios.get(
        `${this.baseURL}/api/commits?${params.toString()}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch commits');
    }
  }
}

module.exports = new ApiClient();
