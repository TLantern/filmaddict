import { saveTimeline, getTimeline } from "./api";

export interface EditingSessionState {
  pendingCuts: Array<{ start_time: number; end_time: number }>;
  markers: Array<{ id: string; time: number; label?: string }>;
  selections: string[]; // Selected clip/segment IDs
  sequences?: any[];
  zoom: number;
  currentTime: number;
  inPoint?: number;
  outPoint?: number;
  projectName?: string;
  viewPreferences: {
    snapEnabled: boolean;
    loopPlayback: boolean;
  };
}

const STORAGE_KEY = 'filmaddict_editing_session';

export async function saveEditingSession(videoId: string, state: Partial<EditingSessionState>, userId?: string | null): Promise<void> {
  try {
    // Save to backend
    await saveTimeline(videoId, {
      projectName: state.projectName,
      markers: state.markers,
      selections: state.selections,
      sequences: state.sequences,
      currentTime: state.currentTime,
      inPoint: state.inPoint,
      outPoint: state.outPoint,
      zoom: state.zoom,
      viewPreferences: state.viewPreferences,
    }, userId);
  } catch (error) {
    console.error('Failed to save editing session to backend:', error);
    // Fallback to localStorage
    try {
      const existing = await loadEditingSession(videoId);
      const merged: EditingSessionState = {
        ...existing,
        ...state,
        viewPreferences: {
          ...existing.viewPreferences,
          ...state.viewPreferences,
        },
      };
      
      const key = `${STORAGE_KEY}_${videoId}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify(merged));
      }
    } catch (fallbackError) {
      console.error('Failed to save to localStorage fallback:', fallbackError);
    }
  }
}

export async function loadEditingSession(videoId: string): Promise<EditingSessionState> {
  try {
    // Load from backend
    const timeline = await getTimeline(videoId);
    return {
      pendingCuts: [], // pendingCuts are stored separately in video.pending_cuts
      markers: timeline.markers || [],
      selections: timeline.selections || [],
      sequences: timeline.sequences || [],
      zoom: timeline.zoom || 1,
      currentTime: timeline.current_time || 0,
      inPoint: timeline.in_point ?? undefined,
      outPoint: timeline.out_point ?? undefined,
      projectName: timeline.project_name || undefined,
      viewPreferences: timeline.view_preferences || {
        snapEnabled: true,
        loopPlayback: false,
      },
    };
  } catch (error) {
    console.error('Failed to load editing session from backend:', error);
    // Fallback to localStorage
    try {
      if (typeof window !== 'undefined') {
        const key = `${STORAGE_KEY}_${videoId}`;
        const data = sessionStorage.getItem(key);
        if (data) {
          return JSON.parse(data);
        }
      }
    } catch (fallbackError) {
      console.error('Failed to load from localStorage fallback:', fallbackError);
    }
  }
  
  return {
    pendingCuts: [],
    markers: [],
    selections: [],
    zoom: 1,
    currentTime: 0,
    viewPreferences: {
      snapEnabled: true,
      loopPlayback: false,
    },
  };
}

export function clearEditingSession(videoId: string): void {
  try {
    if (typeof window !== 'undefined') {
      const key = `${STORAGE_KEY}_${videoId}`;
      sessionStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to clear editing session:', error);
  }
}

