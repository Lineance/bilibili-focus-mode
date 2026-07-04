import React, { useMemo } from 'react';
import { MS_PER_MINUTE } from '@core/constants';
import type { DebtAccount, ExtensionConfig } from '@core/types';
import { useNow } from '@hooks/useNow';

interface DebtStatusProps {
  account: DebtAccount;
  config: ExtensionConfig;
}

export function DebtStatus({ account, config }: DebtStatusProps): React.JSX.Element {
  const now = useNow(MS_PER_MINUTE);

  const { debt, effectiveBankrupt, entertainmentMinutes, learningMinutes, musicMinutes } = useMemo(() => {
    const entertainment = account.totalEntertainmentMinutes ?? 0;
    const learning = account.totalLearningMinutes ?? 0;
    const music = account.totalMusicMinutes ?? 0;
    const entertainmentDebt = entertainment * config.entertainmentRatio;
    const learningRepaid = learning * config.learningRepayRatio;
    const net = entertainmentDebt + learningRepaid;
    const isBankrupt = net >= config.maxDebtMinutes;
    const isLocked = account.bankruptcyEndTime ? now < account.bankruptcyEndTime : false;
    return {
      debt: net,
      effectiveBankrupt: isBankrupt || isLocked,
      entertainmentMinutes: entertainment,
      learningMinutes: learning,
      musicMinutes: music,
    };
  }, [account, config, now]);

  const openStats = () => {
    window.open(chrome.runtime.getURL('src/manager/index.html#stats'), '_blank');
  };

  return (
    <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={openStats}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span>
        <span>债务仪表盘</span>
      </h2>

      {/* 主债务显示 */}
      <div className={`p-4 rounded-lg mb-4 ${effectiveBankrupt ? 'bg-error/20 border border-error/50' : 'bg-tertiary'}`}>
        <div className="text-3xl font-bold mb-1">
          {debt < 0
            ? `信用额度: ${Math.abs(debt).toFixed(1)} 分钟`
            : `${debt.toFixed(1)} 分钟`}
        </div>
        <p className="text-sm text-secondary">
          {effectiveBankrupt
            ? '⚠️ 已破产，暂停新申请'
            : debt > config.maxDebtMinutes * 0.5
              ? '债务较高，建议观看学习类视频'
              : '债务状况良好'}
        </p>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-warning/10 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-warning">{entertainmentMinutes.toFixed(0)}</p>
          <p className="text-xs text-muted">🎮 娱乐</p>
        </div>
        <div className="bg-info/10 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-info">{musicMinutes.toFixed(0)}</p>
          <p className="text-xs text-muted">🎵 音乐</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-success">{learningMinutes.toFixed(0)}</p>
          <p className="text-xs text-muted">📚 学习</p>
        </div>
      </div>
    </div>
  );
}