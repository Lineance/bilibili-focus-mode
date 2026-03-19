import type { ExtensionConfig } from '@core/types';

export function DebtDashboard({
  account,
  config,
}: {
  account?: {
    currentDebt: number;
    totalEntertainmentMinutes?: number;
    totalLearningMinutes?: number;
    totalMusicMinutes?: number;
    bankruptcyEndTime?: number | null;
    // Legacy field names
    totalAccrued?: number;
    totalRepaid?: number;
  };
  config: ExtensionConfig;
}) {
  // Support both new and legacy field names
  const entertainmentMinutes = account?.totalEntertainmentMinutes ?? account?.totalAccrued ?? 0;
  const learningMinutes = account?.totalLearningMinutes ?? account?.totalRepaid ?? 0;
  const musicMinutes = account?.totalMusicMinutes ?? 0;

  // Calculate net debt composition
  const entertainmentDebt = entertainmentMinutes * config.entertainmentRatio;
  const learningRepaid = learningMinutes * config.learningRepayRatio;
  const learningRepaidAbs = Math.abs(learningRepaid);

  // Calculate net debt from components (more accurate than stored currentDebt)
  const debt = entertainmentDebt + learningRepaid;
  
  // Real-time bankruptcy status from storage, but also from recalculated debt
  const isBankrupt = debt >= config.maxDebtMinutes;
  const isLocked = account?.bankruptcyEndTime && Date.now() < account.bankruptcyEndTime;
  const effectiveBankrupt = isBankrupt || isLocked;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">债务仪表盘</h2>

      {/* Main Debt Display */}
      <div className={`p-6 rounded-lg mb-4 ${effectiveBankrupt ? 'bg-red-900/50' : 'bg-gray-800'}`}>
        <div className="text-4xl font-bold mb-2">
          {debt.toFixed(1)} 分钟
        </div>
        <p className="text-gray-400">
          {effectiveBankrupt
            ? (isLocked && !isBankrupt 
                ? `⚠️ 破产锁定期（债务已偿还，请稍候或刷新管理页自动解锁）`
                : `⚠️ 已破产！${config.bankruptcyLockHours}小时内禁止新申请`)
            : debt > config.maxDebtMinutes * 0.5
              ? '债务较高，建议观看学习类视频偿还'
              : '债务状况良好'}
        </p>
      </div>

      {/* Watch Time Statistics */}
      <div className="grid grid-cols-3 gap-4">
        {/* Entertainment Stats */}
        <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h3 className="font-medium text-yellow-400">娱乐时长</h3>
          </div>
          <div className="text-2xl font-bold text-yellow-300">
            {entertainmentMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-yellow-500/70 mt-1">
            产生债务: +{entertainmentDebt.toFixed(1)} 分钟
          </p>
        </div>

        {/* Music Stats */}
        <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎵</span>
            <h3 className="font-medium text-blue-400">音乐时长</h3>
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {musicMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-blue-500/70 mt-1">
            不参与债务计算
          </p>
        </div>

        {/* Learning Stats */}
        <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📚</span>
            <h3 className="font-medium text-green-400">学习时长</h3>
          </div>
          <div className="text-2xl font-bold text-green-300">
            {learningMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-green-500/70 mt-1">
            偿还债务: -{learningRepaidAbs.toFixed(1)} 分钟
          </p>
        </div>
      </div>

      {/* Net Debt Calculation */}
      <div className="mt-4 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-400 mb-2">债务计算</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-yellow-500">娱乐债务:</span>
            <span className="text-yellow-400">+{entertainmentDebt.toFixed(1)} 分钟</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-500">学习偿还:</span>
            <span className="text-green-400">-{learningRepaidAbs.toFixed(1)} 分钟</span>
          </div>
          <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-medium">
            <span className="text-white">净债务:</span>
            <span className={debt > 0 ? 'text-red-400' : 'text-green-400'}>
              {debt.toFixed(1)} 分钟
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}