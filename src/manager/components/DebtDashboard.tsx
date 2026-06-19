import { MS_PER_MINUTE } from '@core/constants';
import React, { useState, useEffect } from 'react';

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
}): React.JSX.Element {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, MS_PER_MINUTE);
    return () => clearInterval(timer);
  }, []);

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
  const isLocked = account?.bankruptcyEndTime && now < account.bankruptcyEndTime;
  const effectiveBankrupt = isBankrupt || isLocked;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">债务仪表盘</h2>

      {/* Main Debt Display */}
      <div className={`p-6 rounded-lg mb-4 ${effectiveBankrupt ? 'bg-red-900/70' : 'bg-tertiary'}`}>
        <div className="text-4xl font-bold mb-2 text-primary">
          {debt < 0 
            ? `信用额度: ${Math.abs(debt).toFixed(1)} 分钟`
            : `${debt.toFixed(1)} 分钟`
          }
        </div>
        <p className="text-primary">
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
        <div className="bg-warning/10 border border-warning p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h3 className="font-medium text-warning">娱乐时长</h3>
          </div>
          <div className="text-2xl font-bold text-warning">
            {entertainmentMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-warning/90 mt-1">
            产生债务：+{entertainmentDebt.toFixed(1)} 分钟
          </p>
        </div>

        {/* Music Stats */}
        <div className="bg-info/10 border border-info p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎵</span>
            <h3 className="font-medium text-info">音乐时长</h3>
          </div>
          <div className="text-2xl font-bold text-info">
            {musicMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-info/90 mt-1">
            不参与债务计算
          </p>
        </div>

        {/* Learning Stats */}
        <div className="bg-success/10 border border-success p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📚</span>
            <h3 className="font-medium text-success">学习时长</h3>
          </div>
          <div className="text-2xl font-bold text-success">
            {learningMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-success/90 mt-1">
            偿还债务：-{learningRepaidAbs.toFixed(1)} 分钟
          </p>
        </div>
      </div>

      {/* Net Debt Calculation */}
      <div className="mt-4 bg-tertiary p-4 rounded-lg">
        <h3 className="text-sm font-medium text-primary mb-2">债务计算</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-warning">娱乐债务:</span>
            <span className="text-warning">+{entertainmentDebt.toFixed(1)} 分钟</span>
          </div>
          <div className="flex justify-between">
            <span className="text-success">学习偿还:</span>
            <span className="text-success">-{learningRepaidAbs.toFixed(1)} 分钟</span>
          </div>
          <div className="border-t border-primary pt-1 mt-1 flex justify-between font-medium">
            <span className="text-primary">净债务:</span>
            <span className={debt > 0 ? 'text-error' : 'text-success'}>
              {debt.toFixed(1)} 分钟
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}