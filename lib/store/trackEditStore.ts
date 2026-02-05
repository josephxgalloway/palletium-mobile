import { create } from 'zustand';
import { tracksApi } from '../api/tracks';
import type { TrackMetadata, TrackMetadataUpdate, Contributor, MetadataHistoryEntry, VALIDATION } from '../types/tracks';

interface TrackEditState {
  // Track data
  track: TrackMetadata | null;
  originalTrack: TrackMetadata | null;

  // Edit state
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;

  // Validation
  errors: Record<string, string>;

  // Rate limiting
  remainingEdits: number;

  // History
  history: MetadataHistoryEntry[];
  isLoadingHistory: boolean;

  // Actions
  loadTrack: (id: number | string) => Promise<void>;
  updateField: <K extends keyof TrackMetadataUpdate>(field: K, value: TrackMetadataUpdate[K]) => void;

  // Contributor actions
  addContributor: () => void;
  updateContributor: (index: number, data: Partial<Contributor>) => void;
  removeContributor: (index: number) => void;

  // Tag actions
  addTag: (tag: string) => boolean;
  removeTag: (tag: string) => void;

  // Save and validation
  validate: () => boolean;
  save: () => Promise<boolean>;

  // History
  loadHistory: () => Promise<void>;

  // Reset
  reset: () => void;
  discardChanges: () => void;
}

const initialState = {
  track: null,
  originalTrack: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  errors: {},
  remainingEdits: -1,
  history: [],
  isLoadingHistory: false,
};

export const useTrackEditStore = create<TrackEditState>((set, get) => ({
  ...initialState,

  loadTrack: async (id: number | string) => {
    set({ isLoading: true, errors: {} });

    try {
      const [track, remainingEdits] = await Promise.all([
        tracksApi.getTrack(id),
        tracksApi.getRemainingEdits(id),
      ]);

      // Ensure contributors array exists
      const trackWithContributors = {
        ...track,
        contributors: track.contributors || [],
        tags: track.tags || [],
      };

      set({
        track: trackWithContributors,
        originalTrack: JSON.parse(JSON.stringify(trackWithContributors)),
        remainingEdits,
        isLoading: false,
        isDirty: false,
        errors: {},
      });
    } catch (error: any) {
      console.error('Failed to load track:', error);
      set({
        isLoading: false,
        errors: { load: error.response?.data?.error || error.message || 'Failed to load track' },
      });
      throw error;
    }
  },

  updateField: (field, value) => {
    const { track } = get();
    if (!track) return;

    set({
      track: { ...track, [field]: value },
      isDirty: true,
    });

    // Clear error for this field
    const { errors } = get();
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      set({ errors: newErrors });
    }
  },

  addContributor: () => {
    const { track } = get();
    if (!track) return;

    const newContributor: Contributor = {
      name: '',
      role: 'performer',
      split_percentage: 0,
    };

    set({
      track: {
        ...track,
        contributors: [...track.contributors, newContributor],
      },
      isDirty: true,
    });
  },

  updateContributor: (index, data) => {
    const { track } = get();
    if (!track) return;

    const contributors = [...track.contributors];
    contributors[index] = { ...contributors[index], ...data };

    set({
      track: { ...track, contributors },
      isDirty: true,
    });

    // Clear contributor error if exists
    const { errors } = get();
    if (errors.contributors) {
      const newErrors = { ...errors };
      delete newErrors.contributors;
      set({ errors: newErrors });
    }
  },

  removeContributor: (index) => {
    const { track } = get();
    if (!track) return;

    const contributors = track.contributors.filter((_, i) => i !== index);

    set({
      track: { ...track, contributors },
      isDirty: true,
    });
  },

  addTag: (tag: string) => {
    const { track, errors } = get();
    if (!track) return false;

    const trimmedTag = tag.trim().toLowerCase();

    // Validation
    if (!trimmedTag) return false;
    if (trimmedTag.length > 30) {
      set({ errors: { ...errors, tags: 'Tags must be 30 characters or less' } });
      return false;
    }
    if (track.tags.length >= 10) {
      set({ errors: { ...errors, tags: 'Maximum 10 tags allowed' } });
      return false;
    }
    if (track.tags.includes(trimmedTag)) {
      set({ errors: { ...errors, tags: 'Tag already exists' } });
      return false;
    }

    // Clear tag error
    const newErrors = { ...errors };
    delete newErrors.tags;

    set({
      track: { ...track, tags: [...track.tags, trimmedTag] },
      isDirty: true,
      errors: newErrors,
    });

    return true;
  },

  removeTag: (tag: string) => {
    const { track } = get();
    if (!track) return;

    set({
      track: { ...track, tags: track.tags.filter(t => t !== tag) },
      isDirty: true,
    });
  },

  validate: () => {
    const { track } = get();
    if (!track) return false;

    const errors: Record<string, string> = {};

    // Title validation
    if (!track.title?.trim()) {
      errors.title = 'Title is required';
    } else if (track.title.length > 100) {
      errors.title = 'Title must be 100 characters or less';
    }

    // Artist name validation
    if (!track.artist_name?.trim()) {
      errors.artist_name = 'Artist name is required';
    } else if (track.artist_name.length > 100) {
      errors.artist_name = 'Artist name must be 100 characters or less';
    }

    // Description validation
    if (track.description && track.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    // Contributor splits validation
    if (track.contributors.length > 0) {
      const totalSplit = track.contributors.reduce((sum, c) => sum + (c.split_percentage || 0), 0);
      if (Math.abs(totalSplit - 100) > 0.01) {
        errors.contributors = `Contributor splits must total 100% (currently ${totalSplit.toFixed(1)}%)`;
      }

      // Check for empty contributor names
      const hasEmptyNames = track.contributors.some(c => !c.name?.trim());
      if (hasEmptyNames) {
        errors.contributors = 'All contributors must have a name';
      }
    }

    set({ errors });
    return Object.keys(errors).length === 0;
  },

  save: async () => {
    const { track, validate, remainingEdits } = get();

    if (!track) return false;

    // Check rate limit
    if (remainingEdits === 0) {
      set({ errors: { save: 'Edit limit reached. Try again tomorrow.' } });
      return false;
    }

    // Validate before saving
    if (!validate()) {
      return false;
    }

    set({ isSaving: true, errors: {} });

    try {
      const updateData: TrackMetadataUpdate = {
        title: track.title,
        description: track.description,
        genre: track.genre,
        sub_genre: track.sub_genre,
        mood: track.mood,
        tags: track.tags,
        artist_name: track.artist_name,
        contributors: track.contributors,
      };

      const updatedTrack = await tracksApi.updateMetadata(track.id, updateData);

      // Refresh remaining edits
      const newRemainingEdits = await tracksApi.getRemainingEdits(track.id);

      const updatedWithDefaults = {
        ...updatedTrack,
        contributors: updatedTrack.contributors || [],
        tags: updatedTrack.tags || [],
      };

      set({
        track: updatedWithDefaults,
        originalTrack: JSON.parse(JSON.stringify(updatedWithDefaults)),
        isSaving: false,
        isDirty: false,
        remainingEdits: newRemainingEdits,
      });

      return true;
    } catch (error: any) {
      console.error('Failed to save track:', error);

      const status = error.response?.status;
      let errorMessage = error.response?.data?.error || error.message || 'Failed to save changes';

      if (status === 429) {
        errorMessage = 'Edit limit reached. Try again tomorrow.';
      } else if (status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid data. Please check your entries.';
      }

      set({
        isSaving: false,
        errors: { save: errorMessage },
      });

      return false;
    }
  },

  loadHistory: async () => {
    const { track } = get();
    if (!track) return;

    set({ isLoadingHistory: true });

    try {
      const history = await tracksApi.getMetadataHistory(track.id);
      set({ history, isLoadingHistory: false });
    } catch (error) {
      console.error('Failed to load history:', error);
      set({ history: [], isLoadingHistory: false });
    }
  },

  reset: () => {
    set(initialState);
  },

  discardChanges: () => {
    const { originalTrack } = get();
    if (!originalTrack) return;

    set({
      track: JSON.parse(JSON.stringify(originalTrack)),
      isDirty: false,
      errors: {},
    });
  },
}));
