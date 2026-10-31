import { fireEvent, render, screen } from '@testing-library/react-native';
import { VideoPlayer } from '../VideoPlayer';

const mockPlayer = {
  loop: false,
  muted: false,
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: (_source: unknown, setup: (player: typeof mockPlayer) => void) => {
      setup(mockPlayer);
      return mockPlayer;
    },
    VideoView: (props: object) => <View {...props} />,
  };
});
jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="youtube" /> };
});

it('reproduz MP4 mudo em loop e mantém capa até o primeiro quadro', async () => {
  await render(<VideoPlayer videoUrl="https://ik.imagekit.io/test/exercises/squat/v1.mp4" />);
  expect(mockPlayer.loop).toBe(true);
  expect(mockPlayer.muted).toBe(true);
  expect(mockPlayer.play).toHaveBeenCalled();
  expect(screen.getByLabelText('Capa da demonstração')).toBeTruthy();
  await fireEvent(screen.getByTestId('exercise-video'), 'firstFrameRender');
  expect(screen.queryByLabelText('Capa da demonstração')).toBeNull();
});

it('sem vídeo ou com endereço inválido não renderiza player', async () => {
  const { rerender } = await render(<VideoPlayer />);
  expect(screen.queryByTestId('exercise-video')).toBeNull();
  await rerender(<VideoPlayer videoUrl="javascript:alert(1)" />);
  expect(screen.queryByTestId('exercise-video')).toBeNull();
});

it('preserva o link de YouTube do especialista', async () => {
  await render(<VideoPlayer videoUrl="https://youtu.be/abcdefghijk" />);
  expect(screen.getByTestId('youtube')).toBeTruthy();
  expect(screen.queryByTestId('exercise-video')).toBeNull();
});
