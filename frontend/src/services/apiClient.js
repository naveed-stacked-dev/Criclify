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
    const token = localStorage.getItem("user_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set Content-Type (with boundary) for FormData uploads
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
    const errorCode = data?.errorCode;

    // ── Handle 401: Clear session ──
    if (status === 401) {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
      if (window.location.pathname.startsWith("/profile")) {
        window.location.href = "/login";
      }
      // Don't toast session errors on silent background calls
      if (!error.config?.url?.includes("/auth/me")) {
        const msg =
          errorCode === "TOKEN_EXPIRED"
            ? "Your session has expired. Please sign in again."
            : "Please sign in to continue.";
        toast.error(msg);
      }
      return Promise.reject(error);
    }

    // Silently ignore /auth/me 404 (user simply not logged in)
    if (error.config?.url?.includes("/auth/me")) {
      return Promise.reject(error);
    }

    // ── Validation errors with an errors[] array ──
    if (data?.errors?.length > 0) {
      data.errors.forEach((err) => {
        const fieldLabel = err.field ? `${capitalizeField(err.field)}: ` : "";
        toast.error(`${fieldLabel}${err.message}`);
      });
      return Promise.reject(error);
    }

    // ── Single-field error ──
    if (data?.field && !data?.errors?.length) {
      toast.error(message, {
        description: `Field: ${data.field}`,
      });
      return Promise.reject(error);
    }

    // ── Map errorCode to friendly UI messages ──
    switch (errorCode) {
      case "DUPLICATE_EMAIL":
        toast.error("An account with this email already exists.", {
          description: "Try logging in or use a different email.",
        });
        break;
      case "DUPLICATE_SLUG":
        toast.error("This URL slug is already taken.", {
          description: "Try a different club slug.",
        });
        break;
      case "DUPLICATE_TEAM_NAME":
        toast.error("A team with this name already exists in this club.");
        break;
      case "INVALID_CREDENTIALS":
        toast.error("Incorrect email or password.", {
          description: "Please check your credentials and try again.",
        });
        break;
      case "TOKEN_EXPIRED":
        toast.error("Your session has expired.", {
          description: "Please sign in again to continue.",
        });
        break;
      case "TOKEN_INVALID":
        toast.error("Invalid session. Please sign in again.");
        break;
      case "INSUFFICIENT_ROLE":
        toast.error("Access denied.", {
          description: "You don't have permission to perform this action.",
        });
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
        toast.error("Fixtures already exist for this tournament.");
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
        toast.error("No scoring events to undo.");
        break;
      case "ROSTER_FULL":
      case "TEAMS_FULL":
        toast.error(message);
        break;
      case "RATE_LIMIT_EXCEEDED":
        toast.error("Too many requests.", {
          description: "Please wait a moment and try again.",
        });
        break;
      case "NOT_FOUND":
      case "CLUB_NOT_FOUND":
      case "TEAM_NOT_FOUND":
      case "PLAYER_NOT_FOUND":
      case "MATCH_NOT_FOUND":
      case "TOURNAMENT_NOT_FOUND":
      case "USER_NOT_FOUND":
      case "SUMMARY_NOT_FOUND":
        toast.error(message);
        break;
      case "INVALID_YOUTUBE_URL":
        toast.error("Please provide a valid YouTube URL.");
        break;
      case "INTERNAL_ERROR":
        toast.error("Something went wrong on our end.", {
          description: "Please try again. If this persists, contact support.",
        });
        break;
      default:
        toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Helper: capitalize field name for display
function capitalizeField(field) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default apiClient;
