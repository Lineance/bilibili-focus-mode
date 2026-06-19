import { MS_PER_DAY, MS_PER_SECOND } from '@core/constants';
import React, { useState, useEffect } from 'react';
import { logger } from '@core/utils/logger';
import { sendMessage } from 'webext-bridge/options';
import { BehaviorLoggingService } from '@core/services';
import type { ProtocolMap } from '@core/protocol';

interface FuseStats {
  week: number;
  month: number;
}

async function loadFuseStats(): Promise<FuseStats> {
  const loggingService = new BehaviorLoggingService();
  const now = Date.now();
  const weekAgo = now - 7 * MS_PER_DAY;
  const monthAgo = now - 30 * MS_PER_DAY;

  const weekLogs = await loggingService.getLogs({ startTime: weekAgo, actions: ['fuse_applied'] });
  const monthLogs = await loggingService.getLogs({ startTime: monthAgo, actions: ['fuse_applied'] });

  const weekCount = weekLogs.filter(l => l.details?.type === 'time_window').length;
  const monthCount = monthLogs.filter(l => l.details?.type === 'time_window').length;

  return { week: weekCount, month: monthCount };
}

interface FuseCodeDisplayProps {
  fuseCode: string;
  timeLeft: number;
}

function FuseCodeDisplay({ fuseCode, timeLeft }: FuseCodeDisplayProps): React.JSX.Element {
  return (
    <div className="bg-black/40 p-3 rounded-lg border border-orange-500/30">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-orange-500 font-semibold uppercase tracking-wider">临时熔断码</span>
        <span className="text-xs text-gray-500 font-mono">
          有效时间: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
      <div className="text-lg text-white font-mono bg-gray-900 p-3 rounded text-center break-all select-all border border-gray-700">
        {fuseCode}
      </div>
    </div>
  );
}

interface FuseVerificationInputProps {
  inputCode: string;
  onInputChange: (value: string) => void;
  onVerify: () => void;
  isLoading: boolean;
}

function FuseVerificationInput({ inputCode, onInputChange, onVerify, isLoading }: FuseVerificationInputProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400">请输入上方熔断码以确认操作：</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputCode}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="在此输入或粘贴熔断码"
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:border-orange-500 outline-none font-mono"
          autoFocus
        />
        <button
          onClick={onVerify}
          disabled={isLoading || !inputCode.trim()}
          className="px-6 py-2 bg-green-600 rounded font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? '验证中...' : '确认'}
        </button>
      </div>
    </div>
  );
}

export function TimeWindowFusePanel({ onFuseApplied }: { onFuseApplied: () => void }): React.JSX.Element {
  const [fuseCode, setFuseCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<FuseStats>({ week: 0, month: 0 });
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    loadFuseStats().then(setStats).catch((error) => {
      console.error('[TimeWindowFusePanel] Failed to fetch stats:', error);
    });
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNowTs(Date.now()), MS_PER_SECOND);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const handleApplyFuse = async () => {
    logger.debug('TimeWindowFusePanel', 'Applying fuse (v2-robust)');
    setIsLoading(true);
    try {
      const response = await sendMessage(
        'apply-time-window-fuse',
        {} as ProtocolMap['apply-time-window-fuse']['req'],
        'background'
      );

      logger.debug('TimeWindowFusePanel', 'Received response:', response);

      // Robust check for response existence and success property
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        const res = response as ProtocolMap['apply-time-window-fuse']['res'];
        setFuseCode(res.fuseCode ?? null);
        setExpiresAt(res.expiresAt ?? null);
        setMessage('熔断码已生成，请输入以确认。这是一项破坏规则的操作，请谨慎对待。');
        loadFuseStats().then(setStats).catch((error) => {
          console.error('[TimeWindowFusePanel] Failed to refresh stats:', error);
        });
      } else {
        const errorMsg = (response && typeof response === 'object' && 'message' in response)
          ? (response as ProtocolMap['apply-time-window-fuse']['res']).message
          : '生成失败';
        setMessage(errorMsg);
        console.error('[TimeWindowFusePanel] Apply failed:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setMessage(`生成熔断码时出错: ${errorMsg}`);
      console.error('[TimeWindowFusePanel] Apply error:', error);
    }
    setIsLoading(false);
  };

  const handleVerifyFuse = async () => {
    if (!inputCode.trim()) return;
    setIsLoading(true);
    try {
      const response = await sendMessage(
        'verify-time-window-fuse',
        {
          fuseCode: inputCode.trim().toUpperCase()
        } as ProtocolMap['verify-time-window-fuse']['req'],
        'background'
      );

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setMessage('验证成功！时间窗口已暂时开启');
        onFuseApplied();
        setFuseCode(null);
        setExpiresAt(null);
        setInputCode('');
      } else {
        const errorMsg = (response && typeof response === 'object' && 'message' in response)
          ? (response as ProtocolMap['verify-time-window-fuse']['res']).message
          : '验证失败';
        setMessage(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setMessage(`验证熔断码时出错: ${errorMsg}`);
      console.error('[TimeWindowFusePanel] Verify error:', error);
    }
    setIsLoading(false);
  };

  const timeLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - nowTs) / MS_PER_SECOND)) : 0;

  return (
    <div className="bg-gray-800 border border-orange-900/50 rounded-lg p-4 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-orange-500 font-bold flex items-center gap-2">
            <span>⚡</span> 时间窗口熔断申请
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            熔断机制允许你在非审批时间内强行开启窗口，但这会削弱你的自律意志。
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-gray-500 font-semibold">熔断统计</div>
          <div className="text-xs text-gray-300 mt-0.5">
            本周: <span className={stats.week > 3 ? 'text-red-400' : 'text-orange-400'}>{stats.week}</span> 次 | 
            本月: <span className={stats.month > 10 ? 'text-red-400' : 'text-orange-400'}>{stats.month}</span> 次
          </div>
        </div>
      </div>

      {!fuseCode ? (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-gray-300 bg-black/20 p-2 rounded border border-gray-700">
            注意：频繁申请熔断会导致熔断码长度呈指数级增长。
          </div>
          <button
            onClick={handleApplyFuse}
            disabled={isLoading}
            className="w-full py-2 bg-orange-600 rounded font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin text-lg">⏳</span>
                生成中...
              </>
            ) : (
              '确认申请熔断码'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <FuseCodeDisplay fuseCode={fuseCode} timeLeft={timeLeft} />
          <FuseVerificationInput
            inputCode={inputCode}
            onInputChange={setInputCode}
            onVerify={handleVerifyFuse}
            isLoading={isLoading}
          />
        </div>
      )}

      {message && (
        <div className={`mt-3 p-2 rounded text-xs ${
          message.includes('成功') ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
