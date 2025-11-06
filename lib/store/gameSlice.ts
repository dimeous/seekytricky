import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type GameState = {
  status?: string;
  currentStageId?: string;
  questId?: string;
};

const initialState: GameState = {
  status: undefined,
  currentStageId: undefined,
  questId: undefined,
};

type StartPayload = {
  status: string;
  currentStageId: string;
  questId: string;
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setStarted(state, action: PayloadAction<StartPayload>) {
      state.status = action.payload.status;
      state.currentStageId = action.payload.currentStageId;
      state.questId = action.payload.questId;
    },
    resetGame(state) {
      state.status = undefined;
      state.currentStageId = undefined;
      state.questId = undefined;
    },
  },
});

export const { setStarted, resetGame } = gameSlice.actions;
export default gameSlice.reducer;
