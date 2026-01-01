export interface ShortcutDefinition {
  id: string;
  key: string;
  description: string;
  category: 'global' | 'playback' | 'timeline' | 'clip' | 'audio' | 'markers' | 'view' | 'export' | 'advanced_editing';
  modifiers?: {
    meta?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
}

export const SHORTCUTS: Record<string, ShortcutDefinition> = {
  // Global
  save_project: { id: 'save_project', key: 's', description: 'Save Project', category: 'global', modifiers: { meta: true } },
  undo: { id: 'undo', key: 'z', description: 'Undo', category: 'global', modifiers: { meta: true } },
  redo: { id: 'redo', key: 'z', description: 'Redo', category: 'global', modifiers: { meta: true, shift: true } },
  revert_feedback: { id: 'revert_feedback', key: 'r', description: 'Revert Feedback', category: 'global', modifiers: { meta: true, shift: true } },
  copy: { id: 'copy', key: 'c', description: 'Copy', category: 'global', modifiers: { meta: true } },
  cut: { id: 'cut', key: 'x', description: 'Cut', category: 'global', modifiers: { meta: true } },
  paste: { id: 'paste', key: 'v', description: 'Paste', category: 'global', modifiers: { meta: true } },
  select_all: { id: 'select_all', key: 'a', description: 'Select All', category: 'global', modifiers: { meta: true } },
  deselect_all: { id: 'deselect_all', key: 'a', description: 'Deselect All', category: 'global', modifiers: { meta: true, shift: true } },
  preferences: { id: 'preferences', key: ',', description: 'Preferences', category: 'global', modifiers: { meta: true } },
  toggle_fullscreen: { id: 'toggle_fullscreen', key: 'f', description: 'Toggle Fullscreen', category: 'global', modifiers: { ctrl: true, meta: true } },

  // Playback
  play_pause: { id: 'play_pause', key: ' ', description: 'Play/Pause', category: 'playback' },
  stop: { id: 'stop', key: 'k', description: 'Stop', category: 'playback' },
  step_forward: { id: 'step_forward', key: 'ArrowRight', description: 'Step Forward', category: 'playback' },
  step_backward: { id: 'step_backward', key: 'ArrowLeft', description: 'Step Backward', category: 'playback' },
  next_frame: { id: 'next_frame', key: '.', description: 'Next Frame', category: 'playback' },
  prev_frame: { id: 'prev_frame', key: ',', description: 'Previous Frame', category: 'playback' },
  jog_backward: { id: 'jog_backward', key: 'j', description: 'Jog Backward', category: 'playback' },
  jog_stop: { id: 'jog_stop', key: 'k', description: 'Jog Stop', category: 'playback' },
  jog_forward: { id: 'jog_forward', key: 'l', description: 'Jog Forward', category: 'playback' },
  fast_forward: { id: 'fast_forward', key: 'l', description: 'Fast Forward', category: 'playback', modifiers: { shift: true } },
  rewind: { id: 'rewind', key: 'j', description: 'Rewind', category: 'playback', modifiers: { shift: true } },
  go_to_start: { id: 'go_to_start', key: 'Home', description: 'Go to Start', category: 'playback' },
  go_to_end: { id: 'go_to_end', key: 'End', description: 'Go to End', category: 'playback' },
  set_in: { id: 'set_in', key: 'i', description: 'Set In Point', category: 'playback' },
  set_out: { id: 'set_out', key: 'o', description: 'Set Out Point', category: 'playback' },
  clear_in_out: { id: 'clear_in_out', key: 'x', description: 'Clear In/Out Points', category: 'playback', modifiers: { alt: true } },
  loop_playback: { id: 'loop_playback', key: 'l', description: 'Loop Playback', category: 'playback', modifiers: { meta: true } },

  // Timeline
  blade_tool: { id: 'blade_tool', key: 'b', description: 'Blade Tool', category: 'timeline' },
  select_tool: { id: 'select_tool', key: 'a', description: 'Select Tool', category: 'timeline' },
  trim_tool: { id: 'trim_tool', key: 't', description: 'Trim Tool', category: 'timeline' },
  zoom_in: { id: 'zoom_in', key: '=', description: 'Zoom In', category: 'timeline', modifiers: { meta: true } },
  zoom_out: { id: 'zoom_out', key: '-', description: 'Zoom Out', category: 'timeline', modifiers: { meta: true } },
  zoom_to_fit: { id: 'zoom_to_fit', key: 'z', description: 'Zoom to Fit', category: 'timeline', modifiers: { shift: true } },
  snap_toggle: { id: 'snap_toggle', key: 'n', description: 'Toggle Snap', category: 'timeline' },
  ripple_delete: { id: 'ripple_delete', key: 'Delete', description: 'Ripple Delete', category: 'timeline', modifiers: { shift: true } },
  add_edit: { id: 'add_edit', key: 'b', description: 'Add Edit', category: 'timeline', modifiers: { meta: true } },
  lift_from_timeline: { id: 'lift_from_timeline', key: 'Delete', description: 'Lift from Timeline', category: 'timeline' },
  overwrite_edit: { id: 'overwrite_edit', key: 'd', description: 'Overwrite Edit', category: 'timeline' },
  insert_edit: { id: 'insert_edit', key: 'w', description: 'Insert Edit', category: 'timeline' },
  connect_clip: { id: 'connect_clip', key: 'q', description: 'Connect Clip', category: 'timeline' },
  detach_audio: { id: 'detach_audio', key: 's', description: 'Detach Audio', category: 'timeline', modifiers: { meta: true, shift: true } },
  expand_audio: { id: 'expand_audio', key: 's', description: 'Expand Audio', category: 'timeline', modifiers: { ctrl: true } },
  enable_disable_clip: { id: 'enable_disable_clip', key: 'v', description: 'Enable/Disable Clip', category: 'timeline' },
  show_hide_skimmer: { id: 'show_hide_skimmer', key: 's', description: 'Show/Hide Skimmer', category: 'timeline' },

  // Clip
  split_clip: { id: 'split_clip', key: 'b', description: 'Split Clip', category: 'clip', modifiers: { meta: true } },
  duplicate_clip: { id: 'duplicate_clip', key: 'd', description: 'Duplicate Clip', category: 'clip', modifiers: { meta: true } },
  delete_clip: { id: 'delete_clip', key: 'Delete', description: 'Delete Clip', category: 'clip' },
  enable_disable: { id: 'enable_disable', key: 'v', description: 'Enable/Disable', category: 'clip' },
  speed_up: { id: 'speed_up', key: ']', description: 'Speed Up', category: 'clip', modifiers: { meta: true } },
  slow_down: { id: 'slow_down', key: '[', description: 'Slow Down', category: 'clip', modifiers: { meta: true } },
  reverse_clip: { id: 'reverse_clip', key: 'r', description: 'Reverse Clip', category: 'clip', modifiers: { shift: true } },
  normalize_audio: { id: 'normalize_audio', key: 'n', description: 'Normalize Audio', category: 'clip', modifiers: { meta: true, shift: true } },
  show_inspector: { id: 'show_inspector', key: '4', description: 'Show Inspector', category: 'clip', modifiers: { meta: true } },

  // Audio
  toggle_waveforms: { id: 'toggle_waveforms', key: 'w', description: 'Toggle Waveforms', category: 'audio', modifiers: { meta: true, alt: true } },
  increase_volume: { id: 'increase_volume', key: '=', description: 'Increase Volume', category: 'audio', modifiers: { ctrl: true } },
  decrease_volume: { id: 'decrease_volume', key: '-', description: 'Decrease Volume', category: 'audio', modifiers: { ctrl: true } },
  mute_clip: { id: 'mute_clip', key: 'm', description: 'Mute Clip', category: 'audio', modifiers: { shift: true } },
  solo_clip: { id: 'solo_clip', key: 's', description: 'Solo Clip', category: 'audio', modifiers: { shift: true } },
  add_audio_fade_in: { id: 'add_audio_fade_in', key: 'i', description: 'Add Audio Fade In', category: 'audio', modifiers: { ctrl: true, shift: true } },
  add_audio_fade_out: { id: 'add_audio_fade_out', key: 'o', description: 'Add Audio Fade Out', category: 'audio', modifiers: { ctrl: true, shift: true } },
  duck_audio: { id: 'duck_audio', key: 'd', description: 'Duck Audio', category: 'audio', modifiers: { ctrl: true } },

  // Markers
  add_marker: { id: 'add_marker', key: 'm', description: 'Add Marker', category: 'markers' },
  edit_marker: { id: 'edit_marker', key: 'm', description: 'Edit Marker', category: 'markers', modifiers: { shift: true } },
  next_marker: { id: 'next_marker', key: ']', description: 'Next Marker', category: 'markers', modifiers: { meta: true, shift: true } },
  prev_marker: { id: 'prev_marker', key: '[', description: 'Previous Marker', category: 'markers', modifiers: { meta: true, shift: true } },
  delete_marker: { id: 'delete_marker', key: 'm', description: 'Delete Marker', category: 'markers', modifiers: { alt: true } },

  // View
  show_timeline: { id: 'show_timeline', key: '2', description: 'Show Timeline', category: 'view', modifiers: { meta: true } },
  show_browser: { id: 'show_browser', key: '1', description: 'Show Browser', category: 'view', modifiers: { meta: true } },
  show_inspector_view: { id: 'show_inspector_view', key: '4', description: 'Show Inspector', category: 'view', modifiers: { meta: true } },
  show_effects: { id: 'show_effects', key: '5', description: 'Show Effects', category: 'view', modifiers: { meta: true } },
  toggle_skimming: { id: 'toggle_skimming', key: 's', description: 'Toggle Skimming', category: 'view' },
  toggle_full_view: { id: 'toggle_full_view', key: 'f', description: 'Toggle Full View', category: 'view', modifiers: { meta: true, shift: true } },

  // Export
  export_master_file: { id: 'export_master_file', key: 'e', description: 'Export Master File', category: 'export', modifiers: { meta: true } },
  share: { id: 'share', key: 'e', description: 'Share', category: 'export', modifiers: { meta: true, shift: true } },
  quick_export: { id: 'quick_export', key: 'e', description: 'Quick Export', category: 'export', modifiers: { meta: true, ctrl: true } },

  // Advanced Editing
  slip_edit: { id: 'slip_edit', key: 'y', description: 'Slip Edit', category: 'advanced_editing' },
  slide_edit: { id: 'slide_edit', key: 'u', description: 'Slide Edit', category: 'advanced_editing' },
  roll_edit: { id: 'roll_edit', key: 'r', description: 'Roll Edit', category: 'advanced_editing' },
  ripple_trim_forward: { id: 'ripple_trim_forward', key: ']', description: 'Ripple Trim Forward', category: 'advanced_editing', modifiers: { shift: true } },
  ripple_trim_backward: { id: 'ripple_trim_backward', key: '[', description: 'Ripple Trim Backward', category: 'advanced_editing', modifiers: { shift: true } },
  nudge_clip_forward: { id: 'nudge_clip_forward', key: 'ArrowRight', description: 'Nudge Clip Forward', category: 'advanced_editing', modifiers: { alt: true } },
  nudge_clip_backward: { id: 'nudge_clip_backward', key: 'ArrowLeft', description: 'Nudge Clip Backward', category: 'advanced_editing', modifiers: { alt: true } },
};

export function getShortcutDisplay(shortcut: ShortcutDefinition, isMac: boolean): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers?.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers?.ctrl && !shortcut.modifiers?.meta) {
    parts.push('Ctrl');
  }
  if (shortcut.modifiers?.shift) {
    parts.push('⇧');
  }
  if (shortcut.modifiers?.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  // Format key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  if (key === 'Home') key = 'Home';
  if (key === 'End') key = 'End';
  if (key === 'Delete') key = 'Del';
  
  parts.push(key.toUpperCase());
  
  return parts.join('');
}

