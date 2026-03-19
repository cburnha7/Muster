import { RecordMatchResultScreen } from '../../../src/screens/leagues/RecordMatchResultScreen';

// Mock services
jest.mock('../../../src/services/api/MatchService');
jest.mock('../../../src/services/api/LeagueService');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = {
  params: { matchId: 'match-1' },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => mockRoute,
}));

describe('RecordMatchResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(RecordMatchResultScreen).toBeDefined();
  });

  it('should be a React component', () => {
    expect(typeof RecordMatchResultScreen).toBe('function');
  });
});
