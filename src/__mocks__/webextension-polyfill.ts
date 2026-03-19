// Mock webextension-polyfill for testing
export default {
  runtime: {
    id: 'test-extension-id',
  },
  storage: {
    local: {
      get: async () => ({}),
      set: async () => {},
    },
  },
};
