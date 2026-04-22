// store/slices/rivalAnalysis/rivalAnalysisSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchRivalAnalysesByTeam,
  fetchRivalAnalysisById,
  createRivalAnalysis,
  updateRivalAnalysis,
  deleteRivalAnalysis,
  fetchActiveTemplate,
  fetchUserTemplates,
  fetchRecommendedQuestions,
  createTemplate,
  createTemplateFromRecommended,
  updateTemplate,
  setTemplateAsDefault,
  deleteTemplate,
  addQuestionToTemplate,
  updateQuestionInTemplate,
  removeQuestionFromTemplate,
  reorderTemplateQuestions,
} from './rivalAnalysisThunks';

const initialState = {
  rivalAnalyses: [],
  currentRivalAnalysis: null,
  loading: false,
  error: null,
  activeTemplate: null,
  userTemplates: [],
  recommendedQuestions: [],
  templateLoading: false,
  templateError: null,
};

const updateTemplateInState = (state, payload) => {
  const idx = state.userTemplates.findIndex((t) => t._id === payload._id);
  if (idx !== -1) state.userTemplates[idx] = payload;
  if (state.activeTemplate?._id === payload._id) state.activeTemplate = payload;
};

const rivalAnalysisSlice = createSlice({
  name: 'rivalAnalysis',
  initialState,
  reducers: {
    clearCurrentRivalAnalysis: (state) => { state.currentRivalAnalysis = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRivalAnalysesByTeam.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchRivalAnalysesByTeam.fulfilled, (s, a) => { s.loading = false; s.rivalAnalyses = a.payload; })
      .addCase(fetchRivalAnalysesByTeam.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchRivalAnalysisById.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchRivalAnalysisById.fulfilled, (s, a) => { s.loading = false; s.currentRivalAnalysis = a.payload; })
      .addCase(fetchRivalAnalysisById.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(createRivalAnalysis.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(createRivalAnalysis.fulfilled, (s, a) => { s.loading = false; s.rivalAnalyses.push(a.payload); })
      .addCase(createRivalAnalysis.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(updateRivalAnalysis.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateRivalAnalysis.fulfilled, (s, a) => {
        s.loading = false;
        const idx = s.rivalAnalyses.findIndex((ra) => ra._id === a.payload._id);
        if (idx !== -1) s.rivalAnalyses[idx] = a.payload;
        if (s.currentRivalAnalysis?._id === a.payload._id) s.currentRivalAnalysis = a.payload;
      })
      .addCase(updateRivalAnalysis.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(deleteRivalAnalysis.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(deleteRivalAnalysis.fulfilled, (s, a) => {
        s.loading = false;
        s.rivalAnalyses = s.rivalAnalyses.filter((ra) => ra._id !== a.payload);
        if (s.currentRivalAnalysis?._id === a.payload) s.currentRivalAnalysis = null;
      })
      .addCase(deleteRivalAnalysis.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      // Templates
      .addCase(fetchActiveTemplate.pending, (s) => { s.templateLoading = true; s.templateError = null; })
      .addCase(fetchActiveTemplate.fulfilled, (s, a) => { s.templateLoading = false; s.activeTemplate = a.payload; })
      .addCase(fetchActiveTemplate.rejected, (s, a) => { s.templateLoading = false; s.templateError = a.payload; })

      .addCase(fetchUserTemplates.pending, (s) => { s.templateLoading = true; s.templateError = null; })
      .addCase(fetchUserTemplates.fulfilled, (s, a) => { s.templateLoading = false; s.userTemplates = a.payload; })
      .addCase(fetchUserTemplates.rejected, (s, a) => { s.templateLoading = false; s.templateError = a.payload; })

      .addCase(fetchRecommendedQuestions.pending, (s) => { s.templateLoading = true; })
      .addCase(fetchRecommendedQuestions.fulfilled, (s, a) => { s.templateLoading = false; s.recommendedQuestions = a.payload; })
      .addCase(fetchRecommendedQuestions.rejected, (s, a) => { s.templateLoading = false; s.templateError = a.payload; })

      .addCase(createTemplate.fulfilled, (s, a) => {
        s.userTemplates.push(a.payload);
        if (a.payload.isDefault) s.activeTemplate = a.payload;
      })
      .addCase(createTemplateFromRecommended.fulfilled, (s, a) => { s.userTemplates.push(a.payload); })
      .addCase(updateTemplate.fulfilled, (s, a) => updateTemplateInState(s, a.payload))
      .addCase(setTemplateAsDefault.fulfilled, (s, a) => {
        s.userTemplates = s.userTemplates.map((t) => ({
          ...t,
          isDefault: t._id === a.payload._id,
        }));
        s.activeTemplate = a.payload;
      })
      .addCase(deleteTemplate.fulfilled, (s, a) => {
        s.userTemplates = s.userTemplates.filter((t) => t._id !== a.payload);
      })
      .addCase(addQuestionToTemplate.fulfilled, (s, a) => updateTemplateInState(s, a.payload))
      .addCase(updateQuestionInTemplate.fulfilled, (s, a) => updateTemplateInState(s, a.payload))
      .addCase(removeQuestionFromTemplate.fulfilled, (s, a) => updateTemplateInState(s, a.payload))
      .addCase(reorderTemplateQuestions.fulfilled, (s, a) => updateTemplateInState(s, a.payload));
  },
});

export const { clearCurrentRivalAnalysis, clearError } = rivalAnalysisSlice.actions;
export default rivalAnalysisSlice.reducer;
