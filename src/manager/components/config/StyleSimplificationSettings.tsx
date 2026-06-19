import type { ExtensionConfig } from '@core/types';

import { VideoPlayerSection } from './style/VideoPlayerSection';
import { HomepageSection } from './style/HomepageSection';
import { DynamicSection } from './style/DynamicSection';
import { LiveSection } from './style/LiveSection';

interface StyleSimplificationSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function StyleSimplificationSettings({ config, updateConfig }: StyleSimplificationSettingsProps): React.JSX.Element {
  const updateVideoPlayerSimplification = (updates: Partial<ExtensionConfig['videoPlayerSimplification']>) => {
    updateConfig('videoPlayerSimplification', {
      ...config.videoPlayerSimplification,
      ...updates
    });
  };

  const updateHomepageSimplification = (updates: Partial<ExtensionConfig['homepageSimplification']>) => {
    updateConfig('homepageSimplification', {
      ...config.homepageSimplification,
      ...updates
    });
  };

  const updateDynamicSimplification = (updates: Partial<ExtensionConfig['dynamicSimplification']>) => {
    updateConfig('dynamicSimplification', {
      ...config.dynamicSimplification,
      ...updates
    });
  };

  const updateLiveSimplification = (updates: Partial<ExtensionConfig['liveSimplification']>) => {
    updateConfig('liveSimplification', {
      ...config.liveSimplification,
      ...updates
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🎨 样式简化</h3>
      <div className="space-y-3">
        <VideoPlayerSection
          config={config.videoPlayerSimplification}
          onUpdate={updateVideoPlayerSimplification}
        />
        <HomepageSection
          config={config.homepageSimplification}
          onUpdate={updateHomepageSimplification}
        />
        <DynamicSection
          config={config.dynamicSimplification}
          onUpdate={updateDynamicSimplification}
        />
        <LiveSection
          config={config.liveSimplification}
          onUpdate={updateLiveSimplification}
        />
      </div>
    </div>
  );
}
