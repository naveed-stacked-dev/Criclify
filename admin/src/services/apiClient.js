import axios from "axios";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor: Inject Auth Token ───
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set Content-Type automatically for FormData (includes boundary)
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle Errors Globally ───
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    const status = error.response?.status;
    const message = data?.message || error.message || "Something went wrong";

    // ── Handle 401: Clear session and redirect ──
    if (status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
        // Don't toast on 401 — the redirect handles it
        return Promise.reject(error);
      } else {
        // If they are already on the login page, show the error toast
        toast.error(message || "Invalid credentials. Please try again.");
        return Promise.reject(error);
      }
    }

    // ── Validation errors with an errors[] array ──
    if (data?.errors?.length > 0) {
      // Show each field-level error as its own toast
      data.errors.forEach((err) => {
        const fieldLabel = err.field ? `[${err.field}] ` : "";
        toast.error(`${fieldLabel}${err.message}`);
      });
      return Promise.reject(error);
    }

    // ── Single-field error (e.g. DUPLICATE_EMAIL) ──
    if (data?.field) {
      toast.error(message, {
        description: `Field: ${data.field}`,
      });
      return Promise.reject(error);
    }

    // ── Map errorCode to a richer toast for known codes ──
    const errorCode = data?.errorCode;

    switch (errorCode) {
      case "DUPLICATE_EMAIL":
        toast.error("This email is already registered. Try logging in instead.");
        break;
      case "DUPLICATE_SLUG":
        toast.error("This URL slug is already in use. Try a different one.");
        break;
      case "DUPLICATE_TEAM_NAME":
        toast.error("A team with this name already exists in this club.");
        break;
      case "INVALID_CREDENTIALS":
        toast.error("Incorrect email or password. Please try again.");
        break;
      case "TOKEN_EXPIRED":
        toast.error("Your session has expired. Please sign in again.");
        break;
      case "TOKEN_INVALID":
        toast.error("Invalid session token. Please sign in again.");
        break;
      case "INSUFFICIENT_ROLE":
        toast.error("You don't have permission to perform this action.");
        break;
      case "CLUB_ACCESS_DENIED":
        toast.error("You don't have access to this club.");
        break;
      case "MATCH_ACCESS_DENIED":
        toast.error("You don't have permission to score this match.");
        break;
      case "MATCH_ALREADY_LIVE":
        toast.error("This match is already in progress.");
        break;
      case "MATCH_ALREADY_COMPLETED":
        toast.error("This match has already been completed.");
        break;
      case "MATCH_NOT_LIVE":
        toast.error("This match is not currently live.");
        break;
      case "FIXTURES_ALREADY_GENERATED":
        toast.error("Fixtures have already been generated for this tournament.");
        break;
      case "PLAYER_ALREADY_IN_TEAM":
        toast.error("This player is already in the team.");
        break;
      case "ALREADY_SECOND_INNINGS":
        toast.error("The match is already in the second innings.");
        break;
      case "INSUFFICIENT_TEAMS":
        toast.error("At least 2 teams are required to generate fixtures.");
        break;
      case "NO_EVENTS_TO_UNDO":
        toast.error("There are no scoring events to undo.");
        break;
      case "ROSTER_FULL":
        toast.error(message);
        break;
      case "TEAMS_FULL":
        toast.error(message);
        break;
      case "RATE_LIMIT_EXCEEDED":
        toast.error("Too many requests. Please slow down and try again.");
        break;
      case "NOT_FOUND":
      case "CLUB_NOT_FOUND":
      case "TEAM_NOT_FOUND":
      case "PLAYER_NOT_FOUND":
      case "MATCH_NOT_FOUND":
      case "TOURNAMENT_NOT_FOUND":
      case "USER_NOT_FOUND":
        toast.error(message);
        break;
      case "INTERNAL_ERROR":
        toast.error("Server error. Please try again later.", {
          description: "If this persists, contact support.",
        });
        break;
      default:
        toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
