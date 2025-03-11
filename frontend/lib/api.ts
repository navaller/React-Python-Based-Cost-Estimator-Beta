import axios from "axios";

// Set the backend base URL
const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // ✅ Replace with your backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

export async function fetchSettings(endpoint: string) {
  try {
    const response = await fetch(`http://127.0.0.1:8000/settings/${endpoint}`);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return response.json();
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
}

export async function updateSettings(endpoint: string, data: any) {
  try {
    const response = await fetch(`http://127.0.0.1:8000/settings/${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to update ${endpoint}`);
    return response.json();
  } catch (error) {
    console.error("Error updating settings:", error);
    return null;
  }
}
